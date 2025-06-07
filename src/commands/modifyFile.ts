/**
 * Modify File Command - Modify existing files based on natural language instructions
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AIService } from '../ai/aiService';
import { FileWriter } from '../utils/fileWriter';
import { OutputChannelManager } from '../logging/outputChannel';
import { AIRequest, CommandType } from '../types';

export async function modifyFileCommand(
  aiService: AIService,
  fileWriter: FileWriter,
  logger: OutputChannelManager
): Promise<void> {
  try {
    // Get the target file
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('Please open a file to modify');
      return;
    }

    const document = activeEditor.document;
    const filePath = document.fileName;
    const currentContent = document.getText();
    
    if (currentContent.trim() === '') {
      vscode.window.showErrorMessage('Cannot modify an empty file');
      return;
    }

    // Get user selection or use entire file
    const selection = activeEditor.selection;
    let selectedText = '';
    let modificationScope = 'entire file';
    
    if (!selection.isEmpty) {
      selectedText = document.getText(selection);
      modificationScope = 'selected text';
    }

    // Get modification instructions from user
    const userPrompt = await vscode.window.showInputBox({
      prompt: `What changes would you like to make to the ${modificationScope}?`,
      placeHolder: 'e.g., "Add error handling and validation" or "Refactor to use async/await"',
      value: '',
      ignoreFocusOut: true
    });

    if (!userPrompt || userPrompt.trim() === '') {
      return;
    }

    // Ask for modification approach
    const modificationStyle = await vscode.window.showQuickPick([
      {
        label: 'Conservative',
        description: 'Make minimal changes, preserve existing structure',
        detail: 'Recommended for production code'
      },
      {
        label: 'Moderate',
        description: 'Balance between changes and preservation',
        detail: 'Good for most refactoring tasks'
      },
      {
        label: 'Aggressive',
        description: 'Make significant improvements and restructuring',
        detail: 'Use when major refactoring is needed'
      }
    ], {
      placeHolder: 'How extensive should the modifications be?'
    });

    if (!modificationStyle) {
      return;
    }

    // Build context for the AI
    const context = buildModificationContext(document, selectedText, modificationStyle.label);
    
    // Build AI request
    const aiRequest: AIRequest = {
      prompt: buildModificationPrompt(userPrompt, modificationStyle.label, modificationScope),
      context: context,
      filePath: filePath,
      selection: selectedText || undefined,
      commandType: CommandType.MODIFY_FILE,
      metadata: {
        language: document.languageId,
        modificationScope,
        modificationStyle: modificationStyle.label,
        originalLength: currentContent.length,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Modifying file', { 
      file: path.basename(filePath),
      scope: modificationScope,
      style: modificationStyle.label,
      promptLength: userPrompt.length
    });

    // Send request to AI service
    const aiResponse = await aiService.sendLegacyRequest(aiRequest);
    
    if (!aiResponse.content || aiResponse.content.trim() === '') {
      throw new Error('AI service returned empty response');
    }

    // Parse the response to extract the modified code
    const modifiedContent = parseModificationResponse(aiResponse.content, currentContent, selectedText);
    
    // Create file change
    const change = await fileWriter.modifyFile(
      filePath,
      modifiedContent,
      `Modified file: ${userPrompt}`,
      CommandType.MODIFY_FILE,
      aiResponse.reasoning
    );

    // Calculate change statistics
    const stats = calculateChangeStats(currentContent, modifiedContent);
    
    // Show preview and confirmation
    const preview = fileWriter.getChangePreview(change.id);
    if (preview) {
      const result = await vscode.window.showInformationMessage(
        `Modified ${stats.description}. Apply changes?`,
        { modal: preview.isDestructive },
        'Apply', 'Preview', 'Diff', 'Cancel'
      );

      switch (result) {
        case 'Apply':
          const success = await fileWriter.applyChange(change.id);
          if (success) {
            vscode.window.showInformationMessage(`File modified successfully! ${stats.summary}`);
            
            // Show suggestions if available
            if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
              showSuggestedActions(aiResponse.suggestedActions);
            }
          } else {
            vscode.window.showErrorMessage('Failed to apply modifications');
          }
          break;
          
        case 'Preview':
          await showModificationPreview(modifiedContent, document.languageId, userPrompt);
          break;
          
        case 'Diff':
          await showDiffView(currentContent, modifiedContent, filePath);
          break;
          
        case 'Cancel':
        default:
          fileWriter.cancelChange(change.id);
          vscode.window.showInformationMessage('File modification cancelled');
          break;
      }
    }

  } catch (error) {
    logger.error('Modify file command failed', error);
    throw error;
  }
}

/**
 * Build context information for file modification
 */
function buildModificationContext(
  document: vscode.TextDocument, 
  selectedText: string, 
  modificationStyle: string
): string {
  const context: string[] = [];
  
  // File information
  context.push(`File: ${path.basename(document.fileName)}`);
  context.push(`Language: ${document.languageId}`);
  context.push(`File size: ${document.getText().length} characters`);
  
  // Selection information
  if (selectedText) {
    context.push(`Selected text: ${selectedText.length} characters`);
    context.push(`Selection context: Lines ${document.positionAt(0).line + 1} to ${document.lineCount}`);
  } else {
    context.push('Scope: Entire file');
  }
  
  // Style guidance
  context.push(`Modification style: ${modificationStyle}`);
  
  // Code structure analysis
  const structureInfo = analyzeCodeStructure(document.getText(), document.languageId);
  if (structureInfo) {
    context.push(`Code structure: ${structureInfo}`);
  }
  
  return context.join('\n');
}

/**
 * Build the modification prompt with clear instructions
 */
function buildModificationPrompt(
  userPrompt: string, 
  modificationStyle: string, 
  scope: string
): string {
  const styleInstructions: Record<string, string> = {
    'Conservative': 'Make minimal changes while achieving the goal. Preserve existing code style, comments, and structure. Only modify what is absolutely necessary.',
    'Moderate': 'Make reasonable improvements while achieving the goal. You can refactor code structure and improve readability, but maintain the overall approach.',
    'Aggressive': 'Make comprehensive improvements to achieve the goal. You can significantly restructure code, add modern patterns, and improve architecture.'
  };

  const instruction = styleInstructions[modificationStyle] || styleInstructions['Moderate'];

  return `${userPrompt}

Modification scope: ${scope}
Style: ${modificationStyle}

Instructions: ${instruction}

Please provide the complete modified code. Make sure to:
1. Preserve all existing functionality unless explicitly asked to change it
2. Maintain consistent code style and formatting
3. Add comments explaining any significant changes
4. Ensure the code is syntactically correct and follows best practices`;
}

/**
 * Analyze code structure to provide context
 */
function analyzeCodeStructure(content: string, languageId: string): string | undefined {
  try {
    const lines = content.split('\n');
    const analysis: string[] = [];
    
    // Count different code elements
    const functionPattern = /function\s+\w+|const\s+\w+\s*=.*=>|class\s+\w+/gi;
    const functions = content.match(functionPattern) || [];
    
    if (functions.length > 0) {
      analysis.push(`${functions.length} functions/classes`);
    }
    
    // Analyze imports/dependencies
    if (languageId === 'typescript' || languageId === 'javascript') {
      const imports = lines.filter(line => line.trim().startsWith('import')).length;
      if (imports > 0) {
        analysis.push(`${imports} imports`);
      }
    }
    
    // File size context
    if (lines.length > 100) {
      analysis.push('large file');
    } else if (lines.length > 50) {
      analysis.push('medium file');
    } else {
      analysis.push('small file');
    }
    
    return analysis.length > 0 ? analysis.join(', ') : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse the AI response to extract modified code
 */
function parseModificationResponse(
  aiResponse: string, 
  originalContent: string, 
  selectedText: string
): string {
  // Try to extract code blocks from the response
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/;
  const match = aiResponse.match(codeBlockRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  // If no code block, check if the response looks like code
  const lines = aiResponse.split('\n');
  const codeIndicators = ['{', '}', ';', 'function', 'const', 'let', 'var', 'class', 'import', 'export'];
  const codeLineCount = lines.filter(line => 
    codeIndicators.some(indicator => line.includes(indicator))
  ).length;
  
  // If more than 50% of lines look like code, treat the whole response as code
  if (codeLineCount > lines.length * 0.5) {
    return aiResponse.trim();
  }
  
  // If we can't determine, return original content with a warning
  console.warn('Could not parse AI modification response, returning original content');
  return originalContent;
}

/**
 * Calculate statistics about the changes
 */
function calculateChangeStats(original: string, modified: string): {
  description: string;
  summary: string;
  isSignificant: boolean;
} {
  const originalLines = original.split('\n').length;
  const modifiedLines = modified.split('\n').length;
  const lineDiff = modifiedLines - originalLines;
  
  const originalChars = original.length;
  const modifiedChars = modified.length;
  const charDiff = modifiedChars - originalChars;
  
  const percentChange = Math.abs(charDiff) / originalChars * 100;
  
  let description = '';
  if (lineDiff > 0) {
    description = `added ${lineDiff} lines`;
  } else if (lineDiff < 0) {
    description = `removed ${Math.abs(lineDiff)} lines`;
  } else {
    description = `modified content`;
  }
  
  if (Math.abs(charDiff) > 0) {
    description += ` (${charDiff > 0 ? '+' : ''}${charDiff} characters)`;
  }
  
  const summary = `${percentChange.toFixed(1)}% change`;
  const isSignificant = percentChange > 20;
  
  return { description, summary, isSignificant };
}

/**
 * Show a preview of the modified content
 */
async function showModificationPreview(
  modifiedContent: string,
  languageId: string,
  originalPrompt: string
): Promise<void> {
  const previewContent = `/*
File Modification Preview
Original Request: ${originalPrompt}
Generated by Sidekick AI
*/

${modifiedContent}`;

  const document = await vscode.workspace.openTextDocument({
    content: previewContent,
    language: languageId
  });

  await vscode.window.showTextDocument(document);
}

/**
 * Show a diff view comparing original and modified content
 */
async function showDiffView(
  originalContent: string,
  modifiedContent: string,
  filePath: string
): Promise<void> {
  // Create temporary files for diff view
  const originalUri = vscode.Uri.parse(`untitled:Original - ${path.basename(filePath)}`);
  const modifiedUri = vscode.Uri.parse(`untitled:Modified - ${path.basename(filePath)}`);
  
  // Open diff editor
  await vscode.commands.executeCommand(
    'vscode.diff',
    originalUri.with({ scheme: 'sidekickai', query: originalContent }),
    modifiedUri.with({ scheme: 'sidekickai', query: modifiedContent }),
    `Sidekick AI: ${path.basename(filePath)} Changes`
  );
}

/**
 * Show suggested follow-up actions
 */
function showSuggestedActions(suggestions: string[]): void {
  if (suggestions.length > 0) {
    const message = `Modification complete! Consider: ${suggestions[0]}`;
    vscode.window.showInformationMessage(message);
  }
}

