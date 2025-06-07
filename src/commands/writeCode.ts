/**
 * Write Code Command Implementation
 * Generates new code based on natural language input
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AIService, EnhancedAIRequest } from '../ai/aiService';
import { 
  logMessage, 
  logError, 
  logDebug, 
  logCommand, 
  withLogging 
} from '../logging/outputChannel';

/**
 * User input for code generation
 */
interface CodeGenerationInput {
  prompt: string;
  language?: string | undefined;
  context?: string | undefined;
  targetFile?: string | undefined;
}

/**
 * Context information gathered from the workspace
 */
interface WorkspaceContext {
  workspaceName?: string | undefined;
  projectType?: string | undefined;
  primaryLanguage?: string | undefined;
  dependencies?: string[] | undefined;
  currentFile?: string | undefined;
  selectedText?: string | undefined;
}

/**
 * Result of code generation
 */
interface CodeGenerationResult {
  code: string;
  language: string;
  explanation?: string | undefined;
  confidence?: number | undefined;
  suggestions?: string[] | undefined;
}

/**
 * Main write code command implementation
 */
export async function writeCodeCommand(
  aiService: AIService,
  options: {
    showProgress?: boolean | undefined;
    openInNewEditor?: boolean | undefined;
    includeExplanation?: boolean | undefined;
  } = {}
): Promise<void> {
  const startTime = Date.now();
  const {
    showProgress = true,
    openInNewEditor = true,
    includeExplanation = true
  } = options;

  try {
    logMessage('Starting write code command');

    // Gather workspace context
    const workspaceContext = await gatherWorkspaceContext();
    logDebug('Workspace context gathered', workspaceContext);

    // Get user input for code generation
    const input = await getUserInput(workspaceContext);
    if (!input) {
      logMessage('Write code command cancelled by user');
      return;
    }

    logDebug('User input received', { 
      promptLength: input.prompt.length,
      language: input.language,
      hasContext: !!input.context
    });

    // Generate code using AI service
    const result = await generateCodeWithProgress(
      aiService, 
      input, 
      workspaceContext,
      showProgress
    );

    logMessage(`Code generated successfully: ${result.code.length} characters, language: ${result.language}`);

    // Display the result
    if (openInNewEditor) {
      await displayCodeInNewEditor(result, input, includeExplanation);
    }

    // Log successful completion
    const duration = Date.now() - startTime;
    logCommand('writeCode', true, duration);

    // Show success message with options
    await showSuccessMessage(result, input);

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(error instanceof Error ? error : new Error(String(error)), 'Write code command');
    logCommand('writeCode', false, duration, errorMessage);

    // Show user-friendly error message
    await vscode.window.showErrorMessage(
      `Failed to generate code: ${errorMessage}`,
      'Retry', 'Show Logs'
    ).then(selection => {
      if (selection === 'Retry') {
        // Retry the command
        vscode.commands.executeCommand('sidekickAI.writeCode');
      } else if (selection === 'Show Logs') {
        // Show output channel
        vscode.commands.executeCommand('sidekickAI.showOutput');
      }
    });

    throw error;
  }
}

/**
 * Get user input for code generation with validation
 */
async function getUserInput(context: WorkspaceContext): Promise<CodeGenerationInput | undefined> {
  try {
    // Get the main prompt from user
    const prompt = await vscode.window.showInputBox({
      prompt: 'What would you like me to write?',
      placeHolder: 'e.g., "Create a React component for user authentication" or "Write a function to validate email addresses"',
      value: '',
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length < 3) {
          return 'Please provide a more detailed description (at least 3 characters)';
        }
        if (value.length > 1000) {
          return 'Description is too long (maximum 1000 characters)';
        }
        return undefined;
      }
    });

    if (!prompt) {
      return undefined;
    }

    // Detect or ask for language if not clear from context
    const language = await detectOrSelectLanguage(prompt, context);
    if (!language) {
      return undefined;
    }

    // Build additional context
    const additionalContext = buildAdditionalContext(context, language);

    return {
      prompt: prompt.trim(),
      language,
      context: additionalContext,
      targetFile: context.currentFile
    };

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'Getting user input');
    throw error;
  }
}

/**
 * Detect or let user select the programming language
 */
async function detectOrSelectLanguage(
  prompt: string, 
  context: WorkspaceContext
): Promise<string | undefined> {
  // Try to detect language from prompt
  const detectedLanguage = detectLanguageFromPrompt(prompt);
  if (detectedLanguage) {
    logDebug(`Language detected from prompt: ${detectedLanguage}`);
    return detectedLanguage;
  }

  // Use context language if available
  if (context.primaryLanguage) {
    const useContextLanguage = await vscode.window.showQuickPick(
      [
        { 
          label: `Use ${context.primaryLanguage}`, 
          description: 'Detected from current workspace',
          value: context.primaryLanguage 
        },
        { 
          label: 'Choose different language', 
          description: 'Select from list',
          value: 'select' 
        }
      ],
      {
        placeHolder: 'Which programming language should I use?'
      }
    );

    if (!useContextLanguage) {
      return undefined;
    }

    if (useContextLanguage.value !== 'select') {
      return useContextLanguage.value;
    }
  }

  // Let user select from common languages
  const languageOptions = [
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'C#', value: 'csharp' },
    { label: 'C++', value: 'cpp' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'PHP', value: 'php' },
    { label: 'Ruby', value: 'ruby' },
    { label: 'Swift', value: 'swift' },
    { label: 'Kotlin', value: 'kotlin' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'SQL', value: 'sql' },
    { label: 'Shell/Bash', value: 'bash' },
    { label: 'Other', value: 'other' }
  ];

  const selectedLanguage = await vscode.window.showQuickPick(languageOptions, {
    placeHolder: 'Select the programming language for code generation'
  });

  if (!selectedLanguage) {
    return undefined;
  }

  if (selectedLanguage.value === 'other') {
    const customLanguage = await vscode.window.showInputBox({
      prompt: 'Enter the programming language',
      placeHolder: 'e.g., dart, scala, haskell',
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Language name cannot be empty';
        }
        return undefined;
      }
    });
    return customLanguage?.trim();
  }

  return selectedLanguage.value;
}

/**
 * Generate code with progress indication
 */
async function generateCodeWithProgress(
  aiService: AIService,
  input: CodeGenerationInput,
  context: WorkspaceContext,
  showProgress: boolean
): Promise<CodeGenerationResult> {
  const generateCode = async (
    progress?: vscode.Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<CodeGenerationResult> => {
    
    progress?.report({ message: 'Preparing request...', increment: 10 });

    // Build the AI request
    const aiRequest: EnhancedAIRequest = {
      prompt: input.prompt,
      context: input.context,
      type: 'write',
      language: input.language,
      metadata: {
        workspaceContext: context,
        timestamp: new Date().toISOString(),
        targetFile: input.targetFile
      }
    };

    progress?.report({ message: 'Sending request to AI...', increment: 20 });

    // Call AI service
    const response = await withLogging(
      'AI Code Generation',
      () => aiService.sendRequest(aiRequest),
      `Language: ${input.language}`
    );

    progress?.report({ message: 'Processing response...', increment: 60 });

    // Parse and validate the response
    const result = parseCodeGenerationResponse(response, input.language || 'text');

    progress?.report({ message: 'Finalizing...', increment: 10 });

    logDebug('Code generation completed', {
      codeLength: result.code.length,
      hasExplanation: !!result.explanation,
      confidence: result.confidence
    });

    return result;
  };

  if (showProgress) {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Code',
        cancellable: false
      },
      generateCode
    );
  } else {
    return await generateCode();
  }
}

/**
 * Display generated code in a new untitled editor
 */
async function displayCodeInNewEditor(
  result: CodeGenerationResult,
  input: CodeGenerationInput,
  includeExplanation: boolean
): Promise<void> {
  try {
    let content = result.code;
    
    // Add explanation as comments if requested
    if (includeExplanation && result.explanation) {
      const commentedExplanation = formatExplanationAsComments(
        result.explanation, 
        result.language
      );
      content = `${commentedExplanation}\n\n${result.code}`;
    }

    // Create new untitled document
    const document = await vscode.workspace.openTextDocument({
      content,
      language: getVSCodeLanguageId(result.language)
    });

    // Show the document in editor
    const editor = await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false
    });

    // Move cursor to the beginning of the actual code (after comments)
    if (includeExplanation && result.explanation) {
      const lines = content.split('\n');
      const codeStartLine = lines.findIndex(line => 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('/*') && 
        !line.trim().startsWith('*') && 
        !line.trim().startsWith('#') &&
        line.trim().length > 0
      );
      
      if (codeStartLine > 0) {
        const position = new vscode.Position(codeStartLine, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      }
    }

    logMessage(`Code displayed in new editor: ${document.languageId}`);

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'Displaying code in editor');
    throw error;
  }
}

/**
 * Show success message with additional options
 */
async function showSuccessMessage(
  result: CodeGenerationResult,
  input: CodeGenerationInput
): Promise<void> {
  const message = `Code generated successfully! (${result.code.length} characters)`;
  const actions = ['Save As...', 'Copy to Clipboard'];
  
  if (result.suggestions && result.suggestions.length > 0) {
    actions.push('Show Suggestions');
  }

  const selection = await vscode.window.showInformationMessage(message, ...actions);

  switch (selection) {
    case 'Save As...':
      await saveGeneratedCode(result, input);
      break;
      
    case 'Copy to Clipboard':
      await vscode.env.clipboard.writeText(result.code);
      vscode.window.showInformationMessage('Code copied to clipboard');
      break;
      
    case 'Show Suggestions':
      if (result.suggestions) {
        await showSuggestions(result.suggestions);
      }
      break;
  }
}

/**
 * Save generated code to a file
 */
async function saveGeneratedCode(
  result: CodeGenerationResult,
  input: CodeGenerationInput
): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const fileExtension = getFileExtension(result.language);
    const defaultName = `generated-code${fileExtension}`;
    
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: workspaceFolder 
        ? vscode.Uri.joinPath(workspaceFolder.uri, defaultName)
        : vscode.Uri.file(defaultName),
      filters: getFileFilters(result.language)
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(result.code, 'utf8'));
      
      const openFile = await vscode.window.showInformationMessage(
        `Code saved to ${path.basename(saveUri.fsPath)}`,
        'Open File'
      );
      
      if (openFile === 'Open File') {
        const document = await vscode.workspace.openTextDocument(saveUri);
        await vscode.window.showTextDocument(document);
      }
      
      logMessage(`Generated code saved to: ${saveUri.fsPath}`);
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'Saving generated code');
    vscode.window.showErrorMessage('Failed to save file');
  }
}

/**
 * Show AI suggestions in a quick pick
 */
async function showSuggestions(suggestions: string[]): Promise<void> {
  const items = suggestions.map((suggestion, index) => ({
    label: `💡 Suggestion ${index + 1}`,
    detail: suggestion
  }));

  await vscode.window.showQuickPick(items, {
    placeHolder: 'AI Suggestions for improvement',
    canPickMany: false
  });
}

// Helper functions

/**
 * Gather context information from the current workspace
 */
async function gatherWorkspaceContext(): Promise<WorkspaceContext> {
  const context: WorkspaceContext = {};

  try {
    // Get workspace information
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      context.workspaceName = path.basename(workspaceFolder.uri.fsPath);
    }

    // Get current file information
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      context.currentFile = path.basename(activeEditor.document.fileName);
      context.primaryLanguage = activeEditor.document.languageId;
      
      // Get selected text if any
      const selection = activeEditor.selection;
      if (!selection.isEmpty) {
        context.selectedText = activeEditor.document.getText(selection);
      }
    }

    // Detect project type from package.json, requirements.txt, etc.
    if (workspaceFolder) {
      context.projectType = await detectProjectType(workspaceFolder.uri);
      context.dependencies = await getDependencies(workspaceFolder.uri);
    }

  } catch (error) {
    logDebug('Failed to gather some workspace context', error);
  }

  return context;
}

/**
 * Build additional context string for the AI
 */
function buildAdditionalContext(context: WorkspaceContext, language: string): string {
  const contextParts: string[] = [];

  if (context.workspaceName) {
    contextParts.push(`Project: ${context.workspaceName}`);
  }

  if (context.projectType) {
    contextParts.push(`Project type: ${context.projectType}`);
  }

  contextParts.push(`Target language: ${language}`);

  if (context.dependencies && context.dependencies.length > 0) {
    contextParts.push(`Dependencies: ${context.dependencies.slice(0, 5).join(', ')}`);
  }

  if (context.currentFile) {
    contextParts.push(`Current file: ${context.currentFile}`);
  }

  if (context.selectedText) {
    contextParts.push(`Selected text context: ${context.selectedText.substring(0, 200)}...`);
  }

  return contextParts.join('\n');
}

/**
 * Detect programming language from user prompt
 */
function detectLanguageFromPrompt(prompt: string): string | undefined {
  const languageKeywords: Record<string, string[]> = {
    'typescript': ['typescript', 'ts', 'react', 'angular', 'vue', 'tsx'],
    'javascript': ['javascript', 'js', 'node', 'express', 'jquery'],
    'python': ['python', 'py', 'django', 'flask', 'pandas', 'numpy'],
    'java': ['java', 'spring', 'maven', 'gradle'],
    'csharp': ['c#', 'csharp', '.net', 'asp.net'],
    'cpp': ['c++', 'cpp'],
    'go': ['go', 'golang'],
    'rust': ['rust', 'cargo'],
    'php': ['php', 'laravel', 'symfony'],
    'ruby': ['ruby', 'rails'],
    'swift': ['swift', 'ios'],
    'kotlin': ['kotlin', 'android'],
    'html': ['html', 'webpage', 'website'],
    'css': ['css', 'style', 'styling'],
    'sql': ['sql', 'database', 'query'],
    'bash': ['bash', 'shell', 'script']
  };

  const promptLower = prompt.toLowerCase();
  
  for (const [language, keywords] of Object.entries(languageKeywords)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        return language;
      }
    }
  }

  return undefined;
}

/**
 * Detect project type from workspace files
 */
async function detectProjectType(workspaceUri: vscode.Uri): Promise<string | undefined> {
  try {
    const files = await vscode.workspace.fs.readDirectory(workspaceUri);
    const fileNames = files.map(([name]) => name.toLowerCase());
    
    if (fileNames.includes('package.json')) {
      try {
        const packageJsonUri = vscode.Uri.joinPath(workspaceUri, 'package.json');
        const content = await vscode.workspace.fs.readFile(packageJsonUri);
        const packageJson = JSON.parse(content.toString());
        
        if (packageJson.dependencies?.react) return 'React';
        if (packageJson.dependencies?.['@angular/core']) return 'Angular';
        if (packageJson.dependencies?.vue) return 'Vue';
        if (packageJson.dependencies?.express) return 'Express';
        if (packageJson.dependencies?.next) return 'Next.js';
        
        return 'Node.js';
      } catch {
        return 'JavaScript';
      }
    }
    
    if (fileNames.includes('requirements.txt') || fileNames.includes('setup.py')) {
      return 'Python';
    }
    
    if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) {
      return 'Java';
    }
    
    if (fileNames.includes('cargo.toml')) {
      return 'Rust';
    }
    
    if (fileNames.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
      return '.NET';
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get project dependencies
 */
async function getDependencies(workspaceUri: vscode.Uri): Promise<string[] | undefined> {
  try {
    const packageJsonUri = vscode.Uri.joinPath(workspaceUri, 'package.json');
    const content = await vscode.workspace.fs.readFile(packageJsonUri);
    const packageJson = JSON.parse(content.toString());
    
    const dependencies = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {})
    ];
    
    return dependencies;
  } catch {
    return undefined;
  }
}

/**
 * Parse AI response into code generation result
 */
function parseCodeGenerationResponse(
  response: { code: string; explanation?: string | undefined; confidence?: number | undefined; suggestions?: string[] | undefined },
  language: string
): CodeGenerationResult {
  return {
    code: response.code || '',
    language: language,
    explanation: response.explanation,
    confidence: response.confidence,
    suggestions: response.suggestions
  };
}

/**
 * Format explanation as comments based on language
 */
function formatExplanationAsComments(explanation: string, language: string): string {
  const commentStyle = getCommentStyle(language);
  const lines = explanation.split('\n');
  
  switch (commentStyle) {
    case 'block':
      return `/*\n * ${lines.join('\n * ')}\n */`;
      
    case 'hash':
      return lines.map(line => `# ${line}`).join('\n');
      
    case 'html':
      return `<!--\n${lines.join('\n')}\n-->`;
      
    case 'double-slash':
    default:
      return lines.map(line => `// ${line}`).join('\n');
  }
}

/**
 * Get comment style for a language
 */
function getCommentStyle(language: string): 'double-slash' | 'block' | 'hash' | 'html' {
  const doubleSlashLanguages = ['typescript', 'javascript', 'java', 'csharp', 'cpp', 'go', 'rust', 'swift', 'kotlin'];
  const hashLanguages = ['python', 'ruby', 'bash', 'shell'];
  const htmlLanguages = ['html', 'xml', 'svg'];
  
  if (doubleSlashLanguages.includes(language.toLowerCase())) {
    return 'double-slash';
  } else if (hashLanguages.includes(language.toLowerCase())) {
    return 'hash';
  } else if (htmlLanguages.includes(language.toLowerCase())) {
    return 'html';
  } else {
    return 'double-slash'; // Default
  }
}

/**
 * Get file extension for a language
 */
function getFileExtension(language: string): string {
  const extensionMap: Record<string, string> = {
    'typescript': '.ts',
    'javascript': '.js',
    'python': '.py',
    'java': '.java',
    'csharp': '.cs',
    'cpp': '.cpp',
    'go': '.go',
    'rust': '.rs',
    'php': '.php',
    'ruby': '.rb',
    'swift': '.swift',
    'kotlin': '.kt',
    'html': '.html',
    'css': '.css',
    'sql': '.sql',
    'bash': '.sh'
  };
  
  return extensionMap[language.toLowerCase()] || '.txt';
}

/**
 * Get VS Code language ID
 */
function getVSCodeLanguageId(language: string): string {
  const idMap: Record<string, string> = {
    'typescript': 'typescript',
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'cpp': 'cpp',
    'go': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
    'bash': 'shellscript'
  };
  
  return idMap[language.toLowerCase()] || 'plaintext';
}

/**
 * Get file filters for save dialog
 */
function getFileFilters(language: string): { [name: string]: string[] } {
  const extension = getFileExtension(language).substring(1); // Remove the dot
  
  const filters: { [name: string]: string[] } = {
    [language.charAt(0).toUpperCase() + language.slice(1)]: [extension]
  };
  
  filters['All Files'] = ['*'];
  
  return filters;
}

