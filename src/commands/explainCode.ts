/**
 * Explain Code Command - Provide detailed explanations of code functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AIService } from '../ai/aiService';
import { FileWriter } from '../utils/fileWriter';
import { OutputChannelManager } from '../logging/outputChannel';
import { AIRequest, CommandType, ExplanationResult } from '../types';

export async function explainCodeCommand(
  aiService: AIService,
  fileWriter: FileWriter,
  logger: OutputChannelManager
): Promise<void> {
  try {
    // Get the active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('Please open a file with code to explain');
      return;
    }

    const document = activeEditor.document;
    const selection = activeEditor.selection;
    
    // Get code to explain
    let codeToExplain = '';
    let explanationScope = '';
    
    if (!selection.isEmpty) {
      codeToExplain = document.getText(selection);
      explanationScope = 'selected code';
    } else {
      // No selection - ask user what they want to explain
      const options = await vscode.window.showQuickPick([
        {
          label: 'Current Line',
          description: 'Explain the line where the cursor is positioned',
          value: 'line'
        },
        {
          label: 'Current Function',
          description: 'Explain the function containing the cursor',
          value: 'function'
        },
        {
          label: 'Entire File',
          description: 'Explain the overall structure and purpose of the file',
          value: 'file'
        },
        {
          label: 'Custom Selection',
          description: 'I\'ll select the code first',
          value: 'custom'
        }
      ], {
        placeHolder: 'What would you like me to explain?'
      });

      if (!options) {
        return;
      }

      switch (options.value) {
        case 'line':
          const currentLine = document.lineAt(activeEditor.selection.active.line);
          codeToExplain = currentLine.text;
          explanationScope = `line ${currentLine.lineNumber + 1}`;
          break;
          
        case 'function':
          const functionCode = await extractCurrentFunction(document, activeEditor.selection.active);
          if (!functionCode) {
            vscode.window.showErrorMessage('Could not identify a function at the cursor position');
            return;
          }
          codeToExplain = functionCode.code;
          explanationScope = `function ${functionCode.name || 'at cursor'}`;
          break;
          
        case 'file':
          codeToExplain = document.getText();
          explanationScope = 'entire file';
          break;
          
        case 'custom':
          vscode.window.showInformationMessage('Please select the code you want explained, then run this command again');
          return;
      }
    }

    if (!codeToExplain || codeToExplain.trim() === '') {
      vscode.window.showErrorMessage('No code found to explain');
      return;
    }

    // Get explanation level preference
    const explanationLevel = await vscode.window.showQuickPick([
      {
        label: 'Beginner',
        description: 'Simple explanations with basic concepts',
        detail: 'Good for learning or onboarding new developers'
      },
      {
        label: 'Intermediate',
        description: 'Balanced explanations with some technical detail',
        detail: 'Most common choice for code reviews'
      },
      {
        label: 'Expert',
        description: 'Technical deep-dive with advanced concepts',
        detail: 'For experienced developers and complex code'
      }
    ], {
      placeHolder: 'What level of explanation do you need?'
    });

    if (!explanationLevel) {
      return;
    }

    // Build context information
    const context = buildExplanationContext(document, explanationScope, codeToExplain);
    
    // Build AI request
    const aiRequest: AIRequest = {
      prompt: buildExplanationPrompt(codeToExplain, explanationLevel.label, explanationScope),
      context: context,
      filePath: document.fileName,
      selection: codeToExplain,
      commandType: CommandType.EXPLAIN_CODE,
      metadata: {
        language: document.languageId,
        explanationLevel: explanationLevel.label,
        explanationScope,
        codeLength: codeToExplain.length,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Explaining code', { 
      scope: explanationScope,
      level: explanationLevel.label,
      language: document.languageId,
      file: path.basename(document.fileName)
    });

    // Send request to AI service
    const aiResponse = await aiService.sendLegacyRequest(aiRequest);
    
    if (!aiResponse.content || aiResponse.content.trim() === '') {
      throw new Error('AI service returned empty response');
    }

    // Parse the explanation
    const explanationResult = parseExplanation(aiResponse.content, codeToExplain);
    
    // Show explanation options
    const result = await vscode.window.showInformationMessage(
      `Code explanation ready for ${explanationScope}. How would you like to view it?`,
      'Show in Panel', 'Open in New Tab', 'Save to File', 'Copy to Clipboard'
    );

    switch (result) {
      case 'Show in Panel':
        await showExplanationInPanel(explanationResult, explanationScope, document.languageId);
        break;
        
      case 'Open in New Tab':
        await showExplanationInNewTab(explanationResult, explanationScope, document.languageId);
        break;
        
      case 'Save to File':
        await saveExplanationToFile(explanationResult, explanationScope, document.fileName);
        break;
        
      case 'Copy to Clipboard':
        await vscode.env.clipboard.writeText(explanationResult.explanation);
        vscode.window.showInformationMessage('Explanation copied to clipboard');
        break;
        
      default:
        // Default to showing in panel
        await showExplanationInPanel(explanationResult, explanationScope, document.languageId);
        break;
    }

    // Show suggestions if available
    if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
      showSuggestedActions(aiResponse.suggestedActions);
    }

  } catch (error) {
    logger.error('Explain code command failed', error);
    throw error;
  }
}

/**
 * Extract the current function around the cursor
 */
async function extractCurrentFunction(
  document: vscode.TextDocument, 
  position: vscode.Position
): Promise<{ code: string; name?: string | undefined } | undefined> {
  const text = document.getText();
  const offset = document.offsetAt(position);
  
  // Simple heuristic to find function boundaries
  // This could be enhanced with proper AST parsing for better accuracy
  
  const lines = text.split('\n');
  const currentLineIndex = position.line;
  
  // Look backwards for function start
  let functionStart = currentLineIndex;
  for (let i = currentLineIndex; i >= 0; i--) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for function declarations
    if (trimmedLine.match(/^(function\s+\w+|const\s+\w+\s*=.*=>|class\s+\w+|async\s+function)/)) {
      functionStart = i;
      break;
    }
    
    // Stop if we hit another function or top level construct
    if (i < currentLineIndex && (
      trimmedLine.match(/^(function|class|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=)/) ||
      trimmedLine === '}' && line.indexOf('}') === 0
    )) {
      break;
    }
  }
  
  // Look forwards for function end
  let functionEnd = currentLineIndex;
  let braceCount = 0;
  let foundStart = false;
  
  for (let i = functionStart; i < lines.length; i++) {
    const line = lines[i];
    
    // Count braces
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          functionEnd = i;
          break;
        }
      }
    }
    
    if (foundStart && braceCount === 0) {
      break;
    }
  }
  
  if (functionStart === currentLineIndex && functionEnd === currentLineIndex) {
    return undefined; // Could not identify function boundaries
  }
  
  const functionLines = lines.slice(functionStart, functionEnd + 1);
  const code = functionLines.join('\n');
  
  // Try to extract function name
  const firstLine = lines[functionStart];
  const nameMatch = firstLine.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|class\s+(\w+))/);
  const name = nameMatch?.[1] || nameMatch?.[2] || nameMatch?.[3];
  
  return { code, name };
}

/**
 * Build context for code explanation
 */
function buildExplanationContext(
  document: vscode.TextDocument,
  scope: string,
  codeToExplain: string
): string {
  const context: string[] = [];
  
  context.push(`File: ${path.basename(document.fileName)}`);
  context.push(`Language: ${document.languageId}`);
  context.push(`Explanation scope: ${scope}`);
  context.push(`Code length: ${codeToExplain.length} characters`);
  
  // Add file structure context for better explanations
  if (scope !== 'entire file') {
    const fileStructure = analyzeFileStructure(document.getText(), document.languageId);
    if (fileStructure) {
      context.push(`File structure: ${fileStructure}`);
    }
  }
  
  return context.join('\n');
}

/**
 * Build explanation prompt
 */
function buildExplanationPrompt(
  code: string,
  level: string,
  scope: string
): string {
  const levelInstructions: Record<string, string> = {
    'Beginner': 'Use simple language and explain basic programming concepts. Avoid jargon and provide step-by-step breakdowns.',
    'Intermediate': 'Provide balanced explanations with some technical detail. Assume familiarity with basic programming concepts.',
    'Expert': 'Include advanced technical details, design patterns, performance considerations, and architectural insights.'
  };

  const instruction = levelInstructions[level] || levelInstructions['Intermediate'];

  return `Please explain this ${scope} in detail:

\`\`\`
${code}
\`\`\`

Explanation level: ${level}
${instruction}

Please provide:
1. What this code does (purpose and functionality)
2. How it works (step-by-step breakdown)
3. Key concepts and patterns used
4. Any potential issues or improvements
5. Complexity assessment (low/medium/high)

Structure your explanation clearly with headings and be thorough but concise.`;
}

/**
 * Analyze file structure for context
 */
function analyzeFileStructure(content: string, languageId: string): string | undefined {
  try {
    const lines = content.split('\n');
    const structure: string[] = [];
    
    // Count imports
    const imports = lines.filter(line => 
      line.trim().startsWith('import') || 
      line.trim().startsWith('from') ||
      line.trim().startsWith('#include') ||
      line.trim().startsWith('using')
    ).length;
    
    if (imports > 0) {
      structure.push(`${imports} imports`);
    }
    
    // Count functions/methods
    const functions = content.match(/(?:function\s+\w+|const\s+\w+\s*=.*=>|def\s+\w+|class\s+\w+)/g) || [];
    if (functions.length > 0) {
      structure.push(`${functions.length} functions/classes`);
    }
    
    // Estimate complexity
    const cyclomaticKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    const complexityCount = cyclomaticKeywords.reduce((count, keyword) => {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g')) || [];
      return count + matches.length;
    }, 0);
    
    if (complexityCount > 20) {
      structure.push('high complexity');
    } else if (complexityCount > 10) {
      structure.push('medium complexity');
    } else {
      structure.push('low complexity');
    }
    
    return structure.length > 0 ? structure.join(', ') : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse AI explanation response
 */
function parseExplanation(aiContent: string, codeSnippet: string): ExplanationResult {
  // Extract complexity assessment if mentioned
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  const complexityMatch = aiContent.match(/complexity[:\s]*(low|medium|high)/i);
  if (complexityMatch) {
    complexity = complexityMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
  }
  
  // Try to extract suggestions
  const suggestions: string[] = [];
  const suggestionPatterns = [
    /(?:suggestions?|improvements?|recommendations?)[\s\S]*?(?:\n\n|\n(?=[A-Z])|$)/gi,
    /(?:could be improved|consider|might want to|recommendation)[\s\S]*?(?:\.|;|\n)/gi
  ];
  
  for (const pattern of suggestionPatterns) {
    const matches = aiContent.match(pattern);
    if (matches) {
      suggestions.push(...matches.slice(0, 3)); // Limit to 3 suggestions
    }
  }
  
  return {
    explanation: aiContent.trim(),
    codeSnippet,
    complexity,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Show explanation in a side panel
 */
async function showExplanationInPanel(
  explanation: ExplanationResult,
  scope: string,
  languageId: string
): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'sidekickAiExplanation',
    `Code Explanation: ${scope}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  const html = generateExplanationHTML(explanation, scope, languageId);
  panel.webview.html = html;
}

/**
 * Show explanation in a new tab
 */
async function showExplanationInNewTab(
  explanation: ExplanationResult,
  scope: string,
  languageId: string
): Promise<void> {
  const content = formatExplanationAsMarkdown(explanation, scope, languageId);
  
  const document = await vscode.workspace.openTextDocument({
    content,
    language: 'markdown'
  });

  await vscode.window.showTextDocument(document);
}

/**
 * Save explanation to a file
 */
async function saveExplanationToFile(
  explanation: ExplanationResult,
  scope: string,
  originalFileName: string
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = path.basename(originalFileName, path.extname(originalFileName));
  const fileName = `explanation-${baseName}-${timestamp}.md`;
  
  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, fileName)),
    filters: {
      'Markdown': ['md'],
      'Text': ['txt']
    }
  });

  if (saveUri) {
    const content = formatExplanationAsMarkdown(explanation, scope, originalFileName);
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(saveUri, encoder.encode(content));
    vscode.window.showInformationMessage(`Explanation saved to ${path.basename(saveUri.fsPath)}`);
  }
}

/**
 * Format explanation as markdown
 */
function formatExplanationAsMarkdown(
  explanation: ExplanationResult,
  scope: string,
  context: string
): string {
  const sections = [];
  
  sections.push(`# Code Explanation: ${scope}`);
  sections.push(`**Context:** ${context}`);
  sections.push(`**Complexity:** ${explanation.complexity}`);
  sections.push(`**Generated:** ${new Date().toLocaleString()}`);
  sections.push('');
  
  sections.push('## Code');
  sections.push('```' + (context.toLowerCase().includes('.') ? context.split('.').pop() : ''));
  sections.push(explanation.codeSnippet);
  sections.push('```');
  sections.push('');
  
  sections.push('## Explanation');
  sections.push(explanation.explanation);
  
  if (explanation.suggestions && explanation.suggestions.length > 0) {
    sections.push('');
    sections.push('## Suggestions');
    explanation.suggestions.forEach((suggestion, index) => {
      sections.push(`${index + 1}. ${suggestion.trim()}`);
    });
  }
  
  return sections.join('\n');
}

/**
 * Generate HTML for webview panel
 */
function generateExplanationHTML(
  explanation: ExplanationResult,
  scope: string,
  languageId: string
): string {
  // Escape HTML special characters
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Format code with syntax highlighting
  const formatCode = (code: string, language: string): string => {
    return `<pre class="code-block"><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
  };

  // Format explanation with markdown-like styling
  const formatExplanation = (text: string): string => {
    return text
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>');
  };

  // Generate suggestions list
  const generateSuggestionsList = (suggestions: string[] | undefined): string => {
    if (!suggestions || suggestions.length === 0) {
      return '';
    }
    
    const items = suggestions.map(suggestion => 
      `<li>${formatExplanation(suggestion.trim())}</li>`
    ).join('');
    
    return `
      <h2>Suggestions</h2>
      <ul class="suggestions-list">
        ${items}
      </ul>
    `;
  };

  // Main HTML template
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code Explanation: ${escapeHtml(scope)}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: var(--vscode-editor-foreground);
          padding: 0 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: var(--vscode-editor-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        h2 {
          color: var(--vscode-editor-foreground);
          margin-top: 25px;
        }
        .code-block {
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 3px;
          padding: 10px;
          overflow: auto;
          font-family: 'Courier New', Courier, monospace;
        }
        .meta-info {
          background-color: var(--vscode-panel-background);
          border-radius: 3px;
          padding: 10px;
          margin-bottom: 20px;
          font-size: 0.9em;
        }
        .meta-info span {
          margin-right: 15px;
        }
        .complexity {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 3px;
          font-weight: bold;
        }
        .complexity.low {
          background-color: #4caf50;
          color: white;
        }
        .complexity.medium {
          background-color: #ff9800;
          color: white;
        }
        .complexity.high {
          background-color: #f44336;
          color: white;
        }
        .suggestions-list li {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <h1>Code Explanation: ${escapeHtml(scope)}</h1>
      
      <div class="meta-info">
        <span><strong>Language:</strong> ${escapeHtml(languageId)}</span>
        <span><strong>Complexity:</strong> <span class="complexity ${explanation.complexity}">${explanation.complexity}</span></span>
        <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
      </div>
      
      <h2>Code</h2>
      ${formatCode(explanation.codeSnippet, languageId)}
      
      <h2>Explanation</h2>
      <p>${formatExplanation(explanation.explanation)}</p>
      
      ${generateSuggestionsList(explanation.suggestions)}
    </body>
    </html>
  `;
}

/**
 * Show suggested actions to the user
 */
function showSuggestedActions(suggestions: string[]): void {
  if (suggestions.length === 0) {
    return;
  }
  
  // Show the first suggestion as a notification
  vscode.window.showInformationMessage(
    `Suggestion: ${suggestions[0]}`,
    'Show All Suggestions'
  ).then(selection => {
    if (selection === 'Show All Suggestions') {
      // Show all suggestions in a quick pick
      const items = suggestions.map((suggestion, index) => ({
        label: `Suggestion ${index + 1}`,
        detail: suggestion
      }));
      
      vscode.window.showQuickPick(items, {
        placeHolder: 'Code improvement suggestions'
      });
    }
  });
}

