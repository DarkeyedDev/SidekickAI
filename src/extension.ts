/**
 * Extension Entry Point
 * Handles activation, command registration, and service initialization
 */

import * as vscode from 'vscode';
import { AIService } from './ai/aiService';
import { FileWriter } from './utils/fileWriter';
import { OutputChannelManager } from './logging/outputChannel';
import { writeCodeCommand } from './commands/writeCode';
import { explainCodeCommand } from './commands/explainCode';
import { modifyFileCommand } from './commands/modifyFile';
import { generateFunctionCommand } from './commands/generateFunction';
import { AIProvider, AIServiceOptions, CommandType } from './types';

// Global state
let aiService: AIService;
let fileWriter: FileWriter;
let logger: OutputChannelManager;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize logger first for proper error tracking
    logger = new OutputChannelManager('Sidekick AI');
    logger.info('Activating Sidekick AI extension');

    // Initialize services
    initializeServices(context);

    // Register commands
    registerCommands(context);

    // Register providers
    registerProviders(context);

    // Register event handlers
    registerEventHandlers(context);

    logger.info('Sidekick AI extension activated successfully');
  } catch (error) {
    logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage('Failed to activate Sidekick AI extension');
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  logger.info('Deactivating Sidekick AI extension');
  
  // Clean up resources
  logger.dispose();
}

/**
 * Initialize core services
 */
function initializeServices(context: vscode.ExtensionContext): void {
  // Get configuration
  const config = vscode.workspace.getConfiguration('sidekickAI');
  
  // Initialize AI service
  const aiServiceOptions: AIServiceOptions = {
    provider: getAIProvider(config),
    model: config.get('model') || 'gpt-4',
    apiKey: config.get('apiKey') || '',
    baseUrl: config.get('baseUrl') || undefined,
    maxTokens: config.get('maxTokens') || 2048,
    temperature: config.get('temperature') || 0.1,
    timeout: config.get('timeout') || 30000
  };
  
  aiService = new AIService(logger, aiServiceOptions);
  
  // Initialize file writer
  fileWriter = new FileWriter(logger);
  
  // Store in context for access by other extension parts
  context.subscriptions.push(
    { dispose: () => logger.dispose() }
  );
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Register core commands
  context.subscriptions.push(
    vscode.commands.registerCommand('sidekickAI.writeCode', async () => {
      try {
        await writeCodeCommand(aiService);
      } catch (error) {
        logger.error('Write code command failed', error);
        vscode.window.showErrorMessage(`Write code failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
    
    vscode.commands.registerCommand('sidekickAI.explainCode', async () => {
      try {
        await explainCodeCommand(aiService, fileWriter, logger);
      } catch (error) {
        logger.error('Explain code command failed', error);
        vscode.window.showErrorMessage(`Explain code failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
    
    vscode.commands.registerCommand('sidekickAI.modifyFile', async () => {
      try {
        await modifyFileCommand(aiService, fileWriter, logger);
      } catch (error) {
        logger.error('Modify file command failed', error);
        vscode.window.showErrorMessage(`Modify file failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
    
    vscode.commands.registerCommand('sidekickAI.generateFunction', async () => {
      try {
        await generateFunctionCommand(aiService, fileWriter, logger);
      } catch (error) {
        logger.error('Generate function command failed', error);
        vscode.window.showErrorMessage(`Generate function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
    
    vscode.commands.registerCommand('sidekickAI.showOutput', () => {
      logger.show();
    }),
    
    vscode.commands.registerCommand('sidekickAI.configureAI', async () => {
      await configureAIService();
    }),
    
    vscode.commands.registerCommand('sidekickAI.testConnection', async () => {
      await testAIConnection();
    })
  );
}

/**
 * Register providers (e.g., completion, hover)
 */
function registerProviders(context: vscode.ExtensionContext): void {
  // This will be implemented in future versions
}

/**
 * Register event handlers
 */
function registerEventHandlers(context: vscode.ExtensionContext): void {
  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('sidekickAI')) {
        updateConfiguration();
      }
    })
  );
}

/**
 * Update configuration when settings change
 */
function updateConfiguration(): void {
  try {
    const config = vscode.workspace.getConfiguration('sidekickAI');
    
    // Update AI service configuration
    aiService.updateOptions({
      provider: getAIProvider(config),
      model: config.get('model') || 'gpt-4',
      apiKey: config.get('apiKey') || '',
      baseUrl: config.get('baseUrl') || undefined,
      maxTokens: config.get('maxTokens') || 2048,
      temperature: config.get('temperature') || 0.1,
      timeout: config.get('timeout') || 30000
    });
    
    logger.info('Configuration updated');
  } catch (error) {
    logger.error('Failed to update configuration', error);
  }
}

/**
 * Get AI provider from configuration
 */
function getAIProvider(config: vscode.WorkspaceConfiguration): AIProvider {
  const providerString = config.get('provider') || 'openai';
  
  switch (providerString.toLowerCase()) {
    case 'openai':
      return AIProvider.OPENAI;
    case 'claude':
      return AIProvider.CLAUDE;
    case 'ollama':
      return AIProvider.OLLAMA;
    case 'lmstudio':
      return AIProvider.LMSTUDIO;
    case 'vllm':
      return AIProvider.VLLM;
    default:
      return AIProvider.OPENAI;
  }
}

/**
 * Configure AI service interactively
 */
async function configureAIService(): Promise<void> {
  try {
    // Select provider
    const providerOptions = [
      { label: 'OpenAI', description: 'GPT-3.5/GPT-4 (API key required)', value: AIProvider.OPENAI },
      { label: 'Claude', description: 'Anthropic Claude (API key required)', value: AIProvider.CLAUDE },
      { label: 'Ollama', description: 'Local models via Ollama', value: AIProvider.OLLAMA },
      { label: 'LM Studio', description: 'Local models via LM Studio', value: AIProvider.LMSTUDIO },
      { label: 'vLLM', description: 'Self-hosted models via vLLM', value: AIProvider.VLLM }
    ];
    
    const selectedProvider = await vscode.window.showQuickPick(providerOptions, {
      placeHolder: 'Select AI provider',
      ignoreFocusOut: true
    });
    
    if (!selectedProvider) {
      return;
    }
    
    // Get provider-specific configuration
    const config = vscode.workspace.getConfiguration('sidekickAI');
    const options: AIServiceOptions = {
      provider: selectedProvider.value,
      model: config.get('model') || 'gpt-4',
      apiKey: config.get('apiKey') || '',
      baseUrl: config.get('baseUrl') || undefined,
      maxTokens: config.get('maxTokens') || 2048,
      temperature: config.get('temperature') || 0.1,
      timeout: config.get('timeout') || 30000
    };
    
    // Configure based on provider
    switch (selectedProvider.value) {
      case AIProvider.OPENAI:
        await configureOpenAI(options);
        break;
      case AIProvider.CLAUDE:
        await configureClaude(options);
        break;
      case AIProvider.OLLAMA:
        await configureOllama(options);
        break;
      case AIProvider.LMSTUDIO:
        await configureLMStudio(options);
        break;
      case AIProvider.VLLM:
        await configureVLLM(options);
        break;
    }
    
    // Update service with new configuration
    aiService.updateOptions(options);
    
    // Save configuration
    await saveConfiguration(options);
    
    // Test connection
    const testResult = await aiService.testConnection();
    if (testResult) {
      vscode.window.showInformationMessage(`Successfully connected to ${selectedProvider.label}!`);
    } else {
      vscode.window.showWarningMessage(`Configuration saved but connection test failed. Please check your settings.`);
    }
    
  } catch (error) {
    logger.error('Configuration failed', error);
    vscode.window.showErrorMessage(`Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Configure OpenAI provider
 */
async function configureOpenAI(options: AIServiceOptions): Promise<void> {
  // Get API key
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI API key',
    password: true,
    ignoreFocusOut: true,
    value: options.apiKey || ''
  });
  
  if (apiKey === undefined) {
    throw new Error('API key is required for OpenAI');
  }
  
  options.apiKey = apiKey;
  
  // Select model
  const modelOptions = [
    { label: 'GPT-4', description: 'Most capable model, but slower and more expensive' },
    { label: 'GPT-4-turbo', description: 'Faster version of GPT-4' },
    { label: 'GPT-3.5-turbo', description: 'Fast and cost-effective' }
  ];
  
  const selectedModel = await vscode.window.showQuickPick(modelOptions, {
    placeHolder: 'Select OpenAI model',
    ignoreFocusOut: true
  });
  
  if (selectedModel) {
    options.model = selectedModel.label.toLowerCase();
  }
  
  // Optional: Custom base URL
  const useCustomEndpoint = await vscode.window.showQuickPick(
    [
      { label: 'No', description: 'Use default OpenAI API endpoint' },
      { label: 'Yes', description: 'Specify custom API endpoint' }
    ],
    { placeHolder: 'Use custom API endpoint?' }
  );
  
  if (useCustomEndpoint?.label === 'Yes') {
    const baseUrl = await vscode.window.showInputBox({
      prompt: 'Enter custom API endpoint URL',
      value: options.baseUrl || 'https://api.openai.com',
      ignoreFocusOut: true
    });
    
    if (baseUrl) {
      options.baseUrl = baseUrl;
    }
  } else {
    options.baseUrl = undefined; // Use default
  }
}

/**
 * Configure Claude provider
 */
async function configureClaude(options: AIServiceOptions): Promise<void> {
  // Get API key
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your Anthropic API key',
    password: true,
    ignoreFocusOut: true,
    value: options.apiKey || ''
  });
  
  if (apiKey === undefined) {
    throw new Error('API key is required for Claude');
  }
  
  options.apiKey = apiKey;
  
  // Select model
  const modelOptions = [
    { label: 'claude-3-opus', description: 'Most capable Claude model' },
    { label: 'claude-3-sonnet', description: 'Balanced performance and cost' },
    { label: 'claude-3-haiku', description: 'Fastest and most cost-effective' }
  ];
  
  const selectedModel = await vscode.window.showQuickPick(modelOptions, {
    placeHolder: 'Select Claude model',
    ignoreFocusOut: true
  });
  
  if (selectedModel) {
    options.model = selectedModel.label;
  }
}

/**
 * Configure Ollama provider
 */
async function configureOllama(options: AIServiceOptions): Promise<void> {
  // Get base URL
  const baseUrl = await vscode.window.showInputBox({
    prompt: 'Enter Ollama API URL',
    value: options.baseUrl || 'http://localhost:11434',
    ignoreFocusOut: true
  });
  
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }
  
  // Get model name
  const model = await vscode.window.showInputBox({
    prompt: 'Enter Ollama model name',
    value: options.model || 'codellama',
    ignoreFocusOut: true,
    placeHolder: 'e.g., codellama, llama2, mistral'
  });
  
  if (model) {
    options.model = model;
  }
}

/**
 * Configure LM Studio provider
 */
async function configureLMStudio(options: AIServiceOptions): Promise<void> {
  // Get base URL
  const baseUrl = await vscode.window.showInputBox({
    prompt: 'Enter LM Studio API URL',
    value: options.baseUrl || 'http://localhost:1234',
    ignoreFocusOut: true
  });
  
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }
  
  // Get model name
  const model = await vscode.window.showInputBox({
    prompt: 'Enter model name (as shown in LM Studio)',
    value: options.model || 'local-model',
    ignoreFocusOut: true
  });
  
  if (model) {
    options.model = model;
  }
}

/**
 * Configure vLLM provider
 */
async function configureVLLM(options: AIServiceOptions): Promise<void> {
  // Get base URL
  const baseUrl = await vscode.window.showInputBox({
    prompt: 'Enter vLLM API URL',
    value: options.baseUrl || 'http://localhost:8000',
    ignoreFocusOut: true
  });
  
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }
  
  // Get model name
  const model = await vscode.window.showInputBox({
    prompt: 'Enter model name',
    value: options.model || 'codellama/CodeLlama-7b-Instruct-hf',
    ignoreFocusOut: true
  });
  
  if (model) {
    options.model = model;
  }
}

/**
 * Save configuration to VS Code settings
 */
async function saveConfiguration(options: AIServiceOptions): Promise<void> {
  const config = vscode.workspace.getConfiguration('sidekickAI');
  
  // Map provider enum to string
  let providerString: string;
  switch (options.provider) {
    case AIProvider.OPENAI:
      providerString = 'openai';
      break;
    case AIProvider.CLAUDE:
      providerString = 'claude';
      break;
    case AIProvider.OLLAMA:
      providerString = 'ollama';
      break;
    case AIProvider.LMSTUDIO:
      providerString = 'lmstudio';
      break;
    case AIProvider.VLLM:
      providerString = 'vllm';
      break;
    default:
      providerString = 'openai';
  }
  
  // Update settings
  await config.update('provider', providerString, vscode.ConfigurationTarget.Global);
  await config.update('model', options.model, vscode.ConfigurationTarget.Global);
  
  if (options.apiKey) {
    await config.update('apiKey', options.apiKey, vscode.ConfigurationTarget.Global);
  }
  
  if (options.baseUrl) {
    await config.update('baseUrl', options.baseUrl, vscode.ConfigurationTarget.Global);
  } else {
    await config.update('baseUrl', undefined, vscode.ConfigurationTarget.Global);
  }
  
  if (options.maxTokens) {
    await config.update('maxTokens', options.maxTokens, vscode.ConfigurationTarget.Global);
  }
  
  if (options.temperature !== undefined) {
    await config.update('temperature', options.temperature, vscode.ConfigurationTarget.Global);
  }
  
  if (options.timeout) {
    await config.update('timeout', options.timeout, vscode.ConfigurationTarget.Global);
  }
}

/**
 * Test connection to AI provider
 */
async function testAIConnection(): Promise<void> {
  try {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing AI connection',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Connecting...' });
        
        const result = await aiService.testConnection();
        
        if (result) {
          const capabilities = aiService.getProviderCapabilities();
          vscode.window.showInformationMessage(
            `Connection successful! Provider: ${AIProvider[aiService.updateOptions['provider']]}`,
            { modal: false }
          );
          
          logger.info('Connection test successful', { capabilities });
        } else {
          vscode.window.showErrorMessage(
            'Connection failed. Please check your configuration.',
            'Configure AI', 'Show Logs'
          ).then(selection => {
            if (selection === 'Configure AI') {
              vscode.commands.executeCommand('sidekickAI.configureAI');
            } else if (selection === 'Show Logs') {
              logger.show();
            }
          });
          
          logger.warn('Connection test failed');
        }
      }
    );
  } catch (error) {
    logger.error('Connection test error', error);
    vscode.window.showErrorMessage(`Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

