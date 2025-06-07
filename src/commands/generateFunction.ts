/**
 * Generate Function Command - Generate new functions based on specifications
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AIService } from '../ai/aiService';
import { FileWriter } from '../utils/fileWriter';
import { OutputChannelManager } from '../logging/outputChannel';
import { AIRequest, CommandType, CodeGeneration } from '../types';

// Type definitions
interface FunctionSpec {
  name?: string | undefined;
  description: string;
  parameters?: string | undefined;
  returnType?: string | undefined;
  type: string;
}

interface ContextInfo {
  line: number;
  character: number;
  beforeCursor: string;
  afterCursor: string;
  surroundingCode: string;
  inClass: boolean;
  inInterface: boolean;
  inNamespace: boolean;
  inModule: boolean;
  indentLevel: number;
  isEmpty: boolean;
}

export async function generateFunctionCommand(
  aiService: AIService,
  fileWriter: FileWriter,
  logger: OutputChannelManager
): Promise<void> {
  try {
    // Get the current editor and cursor position
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('Please open a file to generate a function');
      return;
    }

    const document = activeEditor.document;
    const position = activeEditor.selection.active;
    
    // Get function specification from user
    const functionSpec = await getFunctionSpecification();
    if (!functionSpec) {
      return;
    }

    // Analyze context around cursor position
    const contextInfo = analyzeContextAroundCursor(document, position);
    
    // Build AI request
    const aiRequest: AIRequest = {
      prompt: buildFunctionPrompt(functionSpec, contextInfo),
      context: buildFunctionContext(document, contextInfo),
      filePath: document.fileName,
      commandType: CommandType.GENERATE_FUNCTION,
      metadata: {
        language: document.languageId,
        insertionLine: position.line,
        contextInfo,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Generating function', { 
      spec: functionSpec.name || 'anonymous',
      language: document.languageId,
      file: path.basename(document.fileName)
    });

    // Send request to AI service
    const aiResponse = await aiService.sendLegacyRequest(aiRequest);
    
    if (!aiResponse.content || aiResponse.content.trim() === '') {
      throw new Error('AI service returned empty response');
    }

    // Parse the generated function
    const functionGeneration = parseFunctionGeneration(aiResponse.content, document.languageId);
    
    // Determine insertion point
    const insertionPoint = determineInsertionPoint(document, position, contextInfo);
    
    // Get current file content and insert the function
    const currentContent = document.getText();
    const modifiedContent = insertFunctionIntoContent(
      currentContent,
      functionGeneration.code,
      insertionPoint
    );

    // Create file change
    const change = await fileWriter.modifyFile(
      document.fileName,
      modifiedContent,
      `Generated function: ${functionSpec.name || 'anonymous function'}`,
      CommandType.GENERATE_FUNCTION,
      aiResponse.reasoning
    );

    // Show preview and confirmation
    const result = await vscode.window.showInformationMessage(
      `Generated ${functionGeneration.description}. Insert at line ${insertionPoint.line + 1}?`,
      { modal: false },
      'Insert', 'Preview', 'Different Location', 'Cancel'
    );

    switch (result) {
      case 'Insert':
        const success = await fileWriter.applyChange(change.id);
        if (success) {
          // Move cursor to the inserted function
          const newPosition = new vscode.Position(insertionPoint.line + 1, 0);
          activeEditor.selection = new vscode.Selection(newPosition, newPosition);
          vscode.window.showInformationMessage('Function generated and inserted successfully!');
        } else {
          vscode.window.showErrorMessage('Failed to insert function');
        }
        break;
        
      case 'Preview':
        await showFunctionPreview(functionGeneration, functionSpec);
        fileWriter.cancelChange(change.id);
        break;
        
      case 'Different Location':
        fileWriter.cancelChange(change.id);
        await insertFunctionAtCustomLocation(
          aiService, 
          fileWriter, 
          logger, 
          functionGeneration, 
          functionSpec,
          document
        );
        break;
        
      case 'Cancel':
      default:
        fileWriter.cancelChange(change.id);
        vscode.window.showInformationMessage('Function generation cancelled');
        break;
    }

  } catch (error) {
    logger.error('Generate function command failed', error);
    throw error;
  }
}

/**
 * Get function specification from user
 */
async function getFunctionSpecification(): Promise<FunctionSpec | undefined> {
  const functionName = await vscode.window.showInputBox({
    prompt: 'Function name (optional)',
    placeHolder: 'e.g., calculateTotalPrice',
    value: '',
    ignoreFocusOut: true
  });

  const functionDescription = await vscode.window.showInputBox({
    prompt: 'What should this function do?',
    placeHolder: 'e.g., "Calculate total price with tax and discount"',
    value: '',
    ignoreFocusOut: true
  });

  if (!functionDescription || functionDescription.trim() === '') {
    return undefined;
  }

  const parameters = await vscode.window.showInputBox({
    prompt: 'Function parameters (optional)',
    placeHolder: 'e.g., "price: number, taxRate: number, discount?: number"',
    value: '',
    ignoreFocusOut: true
  });

  const returnType = await vscode.window.showInputBox({
    prompt: 'Return type (optional)',
    placeHolder: 'e.g., "number" or "Promise<User[]>"',
    value: '',
    ignoreFocusOut: true
  });

  const functionType = await vscode.window.showQuickPick([
    { label: 'Regular Function', value: 'function' },
    { label: 'Arrow Function', value: 'arrow' },
    { label: 'Async Function', value: 'async' },
    { label: 'Method', value: 'method' },
    { label: 'Auto-detect', value: 'auto' }
  ], {
    placeHolder: 'What type of function?'
  });

  if (!functionType) {
    return undefined;
  }

  return {
    name: functionName?.trim() || undefined,
    description: functionDescription.trim(),
    parameters: parameters?.trim() || undefined,
    returnType: returnType?.trim() || undefined,
    type: functionType.value
  };
}

/**
 * Analyze context around the cursor position
 */
function analyzeContextAroundCursor(document: vscode.TextDocument, position: vscode.Position): ContextInfo {
  const lineText = document.lineAt(position.line).text;
  const beforeCursor = lineText.substring(0, position.character);
  const afterCursor = lineText.substring(position.character);
  
  // Look at surrounding lines for context
  const contextLines = 5;
  const startLine = Math.max(0, position.line - contextLines);
  const endLine = Math.min(document.lineCount - 1, position.line + contextLines);
  
  const surroundingCode = [];
  for (let i = startLine; i <= endLine; i++) {
    surroundingCode.push(document.lineAt(i).text);
  }
  
  // Determine what kind of context we're in
  const inClass = surroundingCode.some(line => line.match(/^\s*class\s+\w+/));
  const inInterface = surroundingCode.some(line => line.match(/^\s*interface\s+\w+/));
  const inNamespace = surroundingCode.some(line => line.match(/^\s*namespace\s+\w+/));
  const inModule = surroundingCode.some(line => line.match(/^\s*module\s+\w+/));
  
  const indentLevel = beforeCursor.match(/^\s*/)?.[0].length ?? 0;
  
  return {
    line: position.line,
    character: position.character,
    beforeCursor,
    afterCursor,
    surroundingCode: surroundingCode.join('\n'),
    inClass,
    inInterface,
    inNamespace,
    inModule,
    indentLevel,
    isEmpty: lineText.trim() === ''
  };
}

/**
 * Build function generation prompt
 */
function buildFunctionPrompt(spec: FunctionSpec, context: ContextInfo): string {
  const parts = [];
  
  parts.push(`Generate a ${spec.type === 'auto' ? 'function' : spec.type} that ${spec.description}`);
  
  if (spec.name) {
    parts.push(`Function name: ${spec.name}`);
  }
  
  if (spec.parameters) {
    parts.push(`Parameters: ${spec.parameters}`);
  }
  
  if (spec.returnType) {
    parts.push(`Return type: ${spec.returnType}`);
  }
  
  // Add context-specific instructions
  if (context.inClass) {
    parts.push('This function should be a class method');
  } else if (context.inInterface) {
    parts.push('This should be a method signature for an interface');
  }
  
  parts.push(`
Requirements:
1. Include proper JSDoc comments
2. Add parameter validation where appropriate
3. Include error handling for potential issues
4. Follow modern best practices
5. Make the code readable and maintainable
6. Use appropriate typing (if TypeScript)
7. Return only the function code, no explanation text`);
  
  return parts.join('\n');
}

/**
 * Build context for function generation
 */
function buildFunctionContext(document: vscode.TextDocument, context: ContextInfo): string {
  const contextParts = [];
  
  contextParts.push(`File: ${path.basename(document.fileName)}`);
  contextParts.push(`Language: ${document.languageId}`);
  contextParts.push(`Insertion context: ${context.inClass ? 'inside class' : context.inInterface ? 'inside interface' : 'top level'}`);
  contextParts.push(`Indentation level: ${context.indentLevel} spaces`);
  
  // Add surrounding code for better context
  if (context.surroundingCode) {
    contextParts.push(`\nSurrounding code:\n${context.surroundingCode}`);
  }
  
  return contextParts.join('\n');
}

/**
 * Parse AI response into function generation
 */
function parseFunctionGeneration(aiContent: string, languageId: string): CodeGeneration {
  // Try to extract code blocks
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/;
  const match = aiContent.match(codeBlockRegex);
  
  let code = match ? match[1].trim() : aiContent.trim();
  
  // Clean up any explanation text that might be included
  const lines = code.split('\n');
  const codeStartIndex = lines.findIndex(line => 
    line.trim().startsWith('function') ||
    line.trim().startsWith('const') ||
    line.trim().startsWith('async') ||
    line.trim().startsWith('export') ||
    line.includes('=>') ||
    line.includes('{')
  );
  
  if (codeStartIndex > 0) {
    code = lines.slice(codeStartIndex).join('\n');
  }
  
  // Extract function name for description
  const functionNameMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\()/);
  const functionName = functionNameMatch?.[1] || functionNameMatch?.[2] || functionNameMatch?.[3] || 'anonymous function';
  
  return {
    code,
    language: languageId,
    description: `${functionName} function`,
    isCompleteFile: false
  };
}

/**
 * Determine the best insertion point for the function
 */
function determineInsertionPoint(
  document: vscode.TextDocument, 
  position: vscode.Position, 
  context: ContextInfo
): vscode.Position {
  // If we're in an empty line, use current position
  if (context.isEmpty) {
    return position;
  }
  
  // If we're in a class or interface, find a good spot within it
  if (context.inClass || context.inInterface) {
    // Look for the end of the current method or the closing brace
    for (let i = position.line; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      if (line.trim() === '}' && line.indexOf('}') <= context.indentLevel) {
        return new vscode.Position(i, 0);
      }
    }
  }
  
  // Find the next empty line or end of file
  for (let i = position.line + 1; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.trim() === '') {
      return new vscode.Position(i, 0);
    }
  }
  
  // If no empty line found, use end of file
  return new vscode.Position(document.lineCount, 0);
}

/**
 * Insert function code into content at specified position
 */
function insertFunctionIntoContent(
  content: string,
  functionCode: string,
  insertionPoint: vscode.Position
): string {
  const lines = content.split('\n');
  
  // Add proper spacing and indentation
  const indentedFunction = functionCode
    .split('\n')
    .map(line => line ? ' '.repeat(insertionPoint.character) + line : line)
    .join('\n');
  
  // Insert with proper spacing
  const beforeInsertion = lines.slice(0, insertionPoint.line);
  const afterInsertion = lines.slice(insertionPoint.line);
  
  const result = [
    ...beforeInsertion,
    '',  // Empty line before function
    indentedFunction,
    '',  // Empty line after function
    ...afterInsertion
  ].join('\n');
  
  return result;
}

/**
 * Show function preview
 */
async function showFunctionPreview(generation: CodeGeneration, spec: FunctionSpec): Promise<void> {
  const previewContent = `/*
Function Generation Preview
Specification: ${spec.description}
${spec.name ? `Name: ${spec.name}` : ''}
${spec.parameters ? `Parameters: ${spec.parameters}` : ''}
${spec.returnType ? `Return Type: ${spec.returnType}` : ''}
Generated by Sidekick AI
*/

${generation.code}`;

  const document = await vscode.workspace.openTextDocument({
    content: previewContent,
    language: generation.language
  });

  await vscode.window.showTextDocument(document);
}

/**
 * Insert function at a custom location
 */
async function insertFunctionAtCustomLocation(
  aiService: AIService,
  fileWriter: FileWriter,
  logger: OutputChannelManager,
  generation: CodeGeneration,
  spec: FunctionSpec,
  document: vscode.TextDocument
): Promise<void> {
  const line = await vscode.window.showInputBox({
    prompt: 'Enter line number for insertion (1-based)',
    placeHolder: `1-${document.lineCount}`,
    validateInput: (value: string) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > document.lineCount) {
        return `Please enter a number between 1 and ${document.lineCount}`;
      }
      return undefined;
    }
  });

  if (!line) {
    return;
  }

  const insertionLine = parseInt(line) - 1; // Convert to 0-based
  const insertionPoint = new vscode.Position(insertionLine, 0);
  
  const currentContent = document.getText();
  const modifiedContent = insertFunctionIntoContent(
    currentContent,
    generation.code,
    insertionPoint
  );

  const change = await fileWriter.modifyFile(
    document.fileName,
    modifiedContent,
    `Generated function: ${spec.name || 'anonymous function'} at line ${line}`,
    CommandType.GENERATE_FUNCTION
  );

  const success = await fileWriter.applyChange(change.id);
  if (success) {
    vscode.window.showInformationMessage(`Function inserted at line ${line}!`);
  } else {
    vscode.window.showErrorMessage('Failed to insert function');
  }
}

