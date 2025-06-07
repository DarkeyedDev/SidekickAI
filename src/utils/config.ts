/**
 * Configuration management for Sidekick AI
 * Handles loading, validation, and secure storage of user settings
 */

import * as vscode from 'vscode';

// Assuming these types are available in ../types, otherwise we'll define them inline
export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',
  VLLM = 'vllm'
}

/**
 * Strongly typed configuration interface
 */
export interface SidekickAIConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  dryRun: boolean;
  autoConfirm: boolean;
  telemetryEnabled: boolean;
  
  // Provider-specific endpoints
  endpoints: {
    ollama: string;
    lmstudio: string;
    vllm: string;
  };
  
  // API credentials (handled securely via VS Code secrets)
  credentials: {
    openaiApiKey: string;
    claudeApiKey: string;
  };
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  openai: {
    apiKey: string;
  };
  claude: {
    apiKey: string;
  };
  ollama: {
    baseUrl: string;
  };
  lmstudio: {
    baseUrl: string;
  };
  vllm: {
    baseUrl: string;
  };
}

/**
 * AI configuration interface for compatibility
 */
export interface AIConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  dryRun: boolean;
  autoConfirm: boolean;
  telemetryEnabled: boolean;
}

const CONFIG_SECTION = 'sidekickAI';
const SECRET_KEYS = {
  OPENAI_API_KEY: 'sidekickAI.openai.apiKey',
  CLAUDE_API_KEY: 'sidekickAI.claude.apiKey'
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: SidekickAIConfig = {
  provider: AIProvider.OPENAI,
  model: 'gpt-3.5-turbo',
  maxTokens: 2048,
  temperature: 0.1,
  dryRun: false,
  autoConfirm: false,
  telemetryEnabled: false,
  
  endpoints: {
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234', 
    vllm: 'http://localhost:8000'
  },
  
  credentials: {
    openaiApiKey: '',
    claudeApiKey: ''
  }
};

/**
 * Default models for each provider
 */
const PROVIDER_DEFAULT_MODELS: Record<AIProvider, string> = {
  [AIProvider.OPENAI]: 'gpt-3.5-turbo',
  [AIProvider.CLAUDE]: 'claude-3-sonnet-20240229',
  [AIProvider.OLLAMA]: 'codellama:7b',
  [AIProvider.LMSTUDIO]: 'default',
  [AIProvider.VLLM]: 'codellama/CodeLlama-7b-hf'
};

/**
 * Main configuration manager class with secure credential storage
 */
export class ConfigManager {
  private context: vscode.ExtensionContext;
  private configuration: vscode.WorkspaceConfiguration;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  /**
   * Get the current AI configuration
   */
  public async getAIConfig(): Promise<AIConfig> {
    await this.refreshConfiguration();
    
    const provider = this.getValidatedProvider();
    const model = this.getValidatedModel();
    const maxTokens = this.getValidatedMaxTokens();
    const temperature = this.getValidatedTemperature();
    const dryRun = this.configuration.get<boolean>('dryRun', DEFAULT_CONFIG.dryRun);
    const autoConfirm = this.configuration.get<boolean>('autoConfirm', DEFAULT_CONFIG.autoConfirm);
    const telemetryEnabled = this.configuration.get<boolean>('telemetry.enabled', DEFAULT_CONFIG.telemetryEnabled);

    return {
      provider,
      model,
      maxTokens,
      temperature,
      dryRun,
      autoConfirm,
      telemetryEnabled
    };
  }

  /**
   * Get the full configuration including credentials and endpoints
   */
  public async getFullConfig(): Promise<SidekickAIConfig> {
    await this.refreshConfiguration();
    
    const aiConfig = await this.getAIConfig();
    const openaiApiKey = await this.getSecureValue(SECRET_KEYS.OPENAI_API_KEY) || 
                        this.configuration.get<string>('openai.apiKey', DEFAULT_CONFIG.credentials.openaiApiKey);
    const claudeApiKey = await this.getSecureValue(SECRET_KEYS.CLAUDE_API_KEY) || 
                        this.configuration.get<string>('claude.apiKey', DEFAULT_CONFIG.credentials.claudeApiKey);

    return {
      ...aiConfig,
      endpoints: {
        ollama: this.getValidatedEndpoint('ollama.baseUrl', DEFAULT_CONFIG.endpoints.ollama),
        lmstudio: this.getValidatedEndpoint('lmstudio.baseUrl', DEFAULT_CONFIG.endpoints.lmstudio),
        vllm: this.getValidatedEndpoint('vllm.baseUrl', DEFAULT_CONFIG.endpoints.vllm)
      },
      credentials: {
        openaiApiKey,
        claudeApiKey
      }
    };
  }

  /**
   * Get provider-specific configuration
   */
  public async getProviderConfig(): Promise<ProviderConfig> {
    await this.refreshConfiguration();

    const openaiApiKey = await this.getSecureValue(SECRET_KEYS.OPENAI_API_KEY) || 
                        this.configuration.get<string>('openai.apiKey', '');
    const claudeApiKey = await this.getSecureValue(SECRET_KEYS.CLAUDE_API_KEY) || 
                        this.configuration.get<string>('claude.apiKey', '');

    return {
      openai: {
        apiKey: openaiApiKey
      },
      claude: {
        apiKey: claudeApiKey
      },
      ollama: {
        baseUrl: this.configuration.get<string>('ollama.baseUrl', DEFAULT_CONFIG.endpoints.ollama)
      },
      lmstudio: {
        baseUrl: this.configuration.get<string>('lmstudio.baseUrl', DEFAULT_CONFIG.endpoints.lmstudio)
      },
      vllm: {
        baseUrl: this.configuration.get<string>('vllm.baseUrl', DEFAULT_CONFIG.endpoints.vllm)
      }
    };
  }

  /**
   * Get configuration for the current provider only
   */
  public async getActiveProviderConfig(): Promise<{
    provider: AIProvider;
    model: string;
    endpoint?: string;
    apiKey?: string;
    maxTokens: number;
    temperature: number;
  }> {
    const config = await this.getFullConfig();
    
    const baseConfig = {
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    };
    
    switch (config.provider) {
      case AIProvider.OPENAI:
        return {
          ...baseConfig,
          apiKey: config.credentials.openaiApiKey
        };
        
      case AIProvider.CLAUDE:
        return {
          ...baseConfig,
          apiKey: config.credentials.claudeApiKey
        };
        
      case AIProvider.OLLAMA:
        return {
          ...baseConfig,
          endpoint: config.endpoints.ollama
        };
        
      case AIProvider.LMSTUDIO:
        return {
          ...baseConfig,
          endpoint: config.endpoints.lmstudio
        };
        
      case AIProvider.VLLM:
        return {
          ...baseConfig,
          endpoint: config.endpoints.vllm
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Store API key securely using VS Code secrets API
   */
  public async storeApiKey(provider: AIProvider, apiKey: string): Promise<void> {
    const secretKey = provider === AIProvider.OPENAI ? 
      SECRET_KEYS.OPENAI_API_KEY : SECRET_KEYS.CLAUDE_API_KEY;
    
    if (apiKey && apiKey.trim()) {
      await this.context.secrets.store(secretKey, apiKey.trim());
      // Clear the plaintext setting for security
      await this.configuration.update(
        `${provider}.apiKey`, 
        undefined, 
        vscode.ConfigurationTarget.Global
      );
    } else {
      await this.context.secrets.delete(secretKey);
    }
  }

  /**
   * Validate current configuration
   */
  public async validateConfiguration(): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = await this.getFullConfig();
      const providerConfig = await this.getProviderConfig();

      // Validate provider
      if (!Object.values(AIProvider).includes(config.provider)) {
        errors.push(`Invalid AI provider: ${config.provider}`);
      }

      // Validate model name
      if (!config.model || config.model.trim() === '') {
        errors.push('Model name cannot be empty');
      }

      // Validate token limits
      if (config.maxTokens <= 0 || config.maxTokens > 100000) {
        warnings.push('Max tokens should be between 1 and 100000');
      }

      // Validate temperature
      if (config.temperature < 0 || config.temperature > 2) {
        warnings.push('Temperature should be between 0 and 2');
      }

      // Validate provider-specific settings
      await this.validateProviderConfig(config.provider, providerConfig, errors, warnings);

    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if the current configuration is ready for use
   */
  public async isConfigurationReady(): Promise<boolean> {
    const validation = await this.validateConfiguration();
    return validation.isValid;
  }

  /**
   * Get default model for a provider
   */
  public getDefaultModel(provider: AIProvider): string {
    return PROVIDER_DEFAULT_MODELS[provider];
  }

  /**
   * Update a specific configuration value
   */
  public async updateConfigValue(
    key: string,
    value: unknown,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    try {
      await this.configuration.update(key, value, target);
      await this.refreshConfiguration();
    } catch (error) {
      throw new Error(`Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    
    const updates = [
      config.update('provider', DEFAULT_CONFIG.provider, vscode.ConfigurationTarget.Global),
      config.update('model', DEFAULT_CONFIG.model, vscode.ConfigurationTarget.Global),
      config.update('maxTokens', DEFAULT_CONFIG.maxTokens, vscode.ConfigurationTarget.Global),
      config.update('temperature', DEFAULT_CONFIG.temperature, vscode.ConfigurationTarget.Global),
      config.update('dryRun', DEFAULT_CONFIG.dryRun, vscode.ConfigurationTarget.Global),
      config.update('autoConfirm', DEFAULT_CONFIG.autoConfirm, vscode.ConfigurationTarget.Global),
      config.update('telemetry.enabled', DEFAULT_CONFIG.telemetryEnabled, vscode.ConfigurationTarget.Global)
    ];
    
    await Promise.all(updates);
    
    // Clear stored secrets
    await this.context.secrets.delete(SECRET_KEYS.OPENAI_API_KEY);
    await this.context.secrets.delete(SECRET_KEYS.CLAUDE_API_KEY);
    
    await this.refreshConfiguration();
  }

  /**
   * Listen for configuration changes
   */
  public onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        this.refreshConfiguration();
        callback();
      }
    });
  }

  /**
   * Export configuration for debugging or backup (excludes sensitive data)
   */
  public async exportConfiguration(): Promise<Record<string, unknown>> {
    const config = await this.getFullConfig();
    
    // Remove sensitive data
    return {
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      dryRun: config.dryRun,
      autoConfirm: config.autoConfirm,
      telemetryEnabled: config.telemetryEnabled,
      endpoints: config.endpoints,
      // Mask API keys for security
      credentials: {
        openaiApiKey: config.credentials.openaiApiKey ? 'sk-***' : '',
        claudeApiKey: config.credentials.claudeApiKey ? 'sk-ant-***' : ''
      }
    };
  }

  // Private helper methods

  private async refreshConfiguration(): Promise<void> {
    this.configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  private async getSecureValue(key: string): Promise<string | undefined> {
    try {
      return await this.context.secrets.get(key);
    } catch (error) {
      console.error(`Failed to retrieve secure value for ${key}:`, error);
      return undefined;
    }
  }

  private getValidatedProvider(): AIProvider {
    const provider = this.configuration.get<string>('provider', DEFAULT_CONFIG.provider);
    
    if (this.isValidProvider(provider)) {
      return provider as AIProvider;
    }
    
    console.warn(`Invalid provider "${provider}", using default: ${DEFAULT_CONFIG.provider}`);
    return DEFAULT_CONFIG.provider;
  }

  private getValidatedModel(): string {
    const model = this.configuration.get<string>('model', '');
    
    if (model && model.trim() !== '') {
      return model.trim();
    }
    
    // If no model specified, use default for the current provider
    const provider = this.getValidatedProvider();
    const defaultModel = this.getDefaultModel(provider);
    
    console.warn(`No model specified, using default for ${provider}: ${defaultModel}`);
    return defaultModel;
  }

  private getValidatedMaxTokens(): number {
    const maxTokens = this.configuration.get<number>('maxTokens', DEFAULT_CONFIG.maxTokens);
    
    if (maxTokens > 0 && maxTokens <= 100000) {
      return maxTokens;
    }
    
    console.warn(`Invalid maxTokens "${maxTokens}", using default: ${DEFAULT_CONFIG.maxTokens}`);
    return DEFAULT_CONFIG.maxTokens;
  }

  private getValidatedTemperature(): number {
    const temperature = this.configuration.get<number>('temperature', DEFAULT_CONFIG.temperature);
    
    if (temperature >= 0 && temperature <= 2) {
      return temperature;
    }
    
    console.warn(`Invalid temperature "${temperature}", using default: ${DEFAULT_CONFIG.temperature}`);
    return DEFAULT_CONFIG.temperature;
  }

  private getValidatedEndpoint(key: string, defaultValue: string): string {
    const endpoint = this.configuration.get<string>(key, defaultValue);
    
    if (this.isValidUrl(endpoint)) {
      return endpoint;
    }
    
    console.warn(`Invalid endpoint URL "${endpoint}" for ${key}, using default: ${defaultValue}`);
    return defaultValue;
  }

  private async validateProviderConfig(
    provider: AIProvider, 
    config: ProviderConfig, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    switch (provider) {
      case AIProvider.OPENAI:
        if (!config.openai.apiKey) {
          errors.push('OpenAI API key is required');
        } else if (!this.isValidApiKey(config.openai.apiKey, 'sk-')) {
          warnings.push('OpenAI API key format appears invalid (should start with "sk-")');
        }
        break;

      case AIProvider.CLAUDE:
        if (!config.claude.apiKey) {
          errors.push('Claude API key is required');
        } else if (!this.isValidApiKey(config.claude.apiKey, 'sk-ant-')) {
          warnings.push('Claude API key format appears invalid (should start with "sk-ant-")');
        }
        break;

      case AIProvider.OLLAMA:
        if (!this.isValidUrl(config.ollama.baseUrl)) {
          errors.push('Invalid Ollama base URL');
        }
        break;

      case AIProvider.LMSTUDIO:
        if (!this.isValidUrl(config.lmstudio.baseUrl)) {
          errors.push('Invalid LM Studio base URL');
        }
        break;

      case AIProvider.VLLM:
        if (!this.isValidUrl(config.vllm.baseUrl)) {
          errors.push('Invalid vLLM base URL');
        }
        break;
    }
  }

  private isValidProvider(provider: string): provider is AIProvider {
    return Object.values(AIProvider).includes(provider as AIProvider);
  }

  private isValidApiKey(key: string, expectedPrefix: string): boolean {
    return key.startsWith(expectedPrefix) && key.length > expectedPrefix.length + 10;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Functional API for backward compatibility and convenience

let globalConfigManager: ConfigManager | null = null;

/**
 * Initialize the configuration manager (call this in extension activation)
 */
export function initializeConfigManager(context: vscode.ExtensionContext): ConfigManager {
  globalConfigManager = new ConfigManager(context);
  return globalConfigManager;
}

/**
 * Get the global configuration manager instance
 */
export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    throw new Error('ConfigManager not initialized. Call initializeConfigManager() first.');
  }
  return globalConfigManager;
}

/**
 * Load and validate Sidekick AI configuration from VS Code settings
 */
export async function getConfig(): Promise<SidekickAIConfig> {
  return getConfigManager().getFullConfig();
}

/**
 * Validate the configuration and return detailed results
 */
export async function validateConfig(config?: SidekickAIConfig): Promise<ConfigValidationResult> {
  if (config) {
    // If config is provided, validate it directly without using the manager
    return validateProvidedConfig(config);
  }
  return getConfigManager().validateConfiguration();
}

/**
 * Get configuration for the current provider only
 */
export async function getProviderConfig(): Promise<{
  provider: AIProvider;
  model: string;
  endpoint?: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
}> {
  return getConfigManager().getActiveProviderConfig();
}

/**
 * Check if configuration is ready for use
 */
export async function isConfigurationReady(): Promise<boolean> {
  return getConfigManager().isConfigurationReady();
}

/**
 * Get default model for a specific provider
 */
export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_DEFAULT_MODELS[provider];
}

/**
 * Update a specific configuration value
 */
export async function updateConfigValue(
  key: string,
  value: unknown,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<void> {
  return getConfigManager().updateConfigValue(key, value, target);
}

/**
 * Reset configuration to defaults
 */
export async function resetConfiguration(): Promise<void> {
  return getConfigManager().resetToDefaults();
}

/**
 * Get configuration change listener
 */
export function onConfigurationChanged(callback: () => void): vscode.Disposable {
  return getConfigManager().onConfigurationChanged(callback);
}

/**
 * Export configuration for debugging or backup
 */
export async function exportConfiguration(): Promise<Record<string, unknown>> {
  return getConfigManager().exportConfiguration();
}

// Private helper for validating provided config objects
function validateProvidedConfig(config: SidekickAIConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate provider
  if (!Object.values(AIProvider).includes(config.provider)) {
    errors.push(`Invalid provider: ${config.provider}. Must be one of: ${Object.values(AIProvider).join(', ')}`);
  }
  
  // Validate model
  if (!config.model || config.model.trim() === '') {
    errors.push('Model name cannot be empty');
  }
  
  // Validate maxTokens
  if (config.maxTokens <= 0 || config.maxTokens > 100000) {
    warnings.push('maxTokens should be between 1 and 100000');
  }
  
  // Validate temperature
  if (config.temperature < 0 || config.temperature > 2) {
    warnings.push('temperature should be between 0 and 2');
  }
  
  // Validate provider-specific requirements
  switch (config.provider) {
    case AIProvider.OPENAI:
      if (!config.credentials.openaiApiKey) {
        errors.push('OpenAI API key is required');
      } else if (!config.credentials.openaiApiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key format appears invalid (should start with "sk-")');
      }
      break;
      
    case AIProvider.CLAUDE:
      if (!config.credentials.claudeApiKey) {
        errors.push('Claude API key is required');
      } else if (!config.credentials.claudeApiKey.startsWith('sk-ant-')) {
        warnings.push('Claude API key format appears invalid (should start with "sk-ant-")');
      }
      break;
      
    case AIProvider.OLLAMA:
      if (!isValidUrl(config.endpoints.ollama)) {
        errors.push('Invalid Ollama endpoint URL');
      }
      break;
      
    case AIProvider.LMSTUDIO:
      if (!isValidUrl(config.endpoints.lmstudio)) {
        errors.push('Invalid LM Studio endpoint URL');
      }
      break;
      
    case AIProvider.VLLM:
      if (!isValidUrl(config.endpoints.vllm)) {
        errors.push('Invalid vLLM endpoint URL');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}