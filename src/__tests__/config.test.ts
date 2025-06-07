/**
 * Unit tests for ConfigManager
 */

import { ConfigManager } from '../utils/config';
import { AIProvider } from '../types';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn()
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  }
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockContext: any;
  let mockConfiguration: any;
  let mockSecrets: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock extension context
    mockSecrets = {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn()
    };

    mockContext = {
      secrets: mockSecrets
    };

    // Mock workspace configuration
    mockConfiguration = {
      get: jest.fn(),
      update: jest.fn()
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfiguration);

    configManager = new ConfigManager(mockContext);
  });

  describe('getAIConfig', () => {
    it('should return default configuration', async () => {
      mockConfiguration.get
        .mockReturnValueOnce('openai') // provider
        .mockReturnValueOnce('gpt-3.5-turbo') // model
        .mockReturnValueOnce(2048) // maxTokens
        .mockReturnValueOnce(0.1) // temperature
        .mockReturnValueOnce(false) // dryRun
        .mockReturnValueOnce(false) // autoConfirm
        .mockReturnValueOnce(false); // telemetryEnabled

      const config = await configManager.getAIConfig();

      expect(config).toEqual({
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        maxTokens: 2048,
        temperature: 0.1,
        dryRun: false,
        autoConfirm: false,
        telemetryEnabled: false
      });
    });

    it('should use fallback values for missing configuration', async () => {
      mockConfiguration.get
        .mockReturnValueOnce(undefined) // provider
        .mockReturnValueOnce(undefined) // model
        .mockReturnValueOnce(undefined) // maxTokens
        .mockReturnValueOnce(undefined) // temperature
        .mockReturnValueOnce(undefined) // dryRun
        .mockReturnValueOnce(undefined) // autoConfirm
        .mockReturnValueOnce(undefined); // telemetryEnabled

      const config = await configManager.getAIConfig();

      expect(config.provider).toBe(AIProvider.OPENAI);
      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.maxTokens).toBe(2048);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configurations with secure keys', async () => {
      mockSecrets.get
        .mockResolvedValueOnce('sk-test-openai-key')
        .mockResolvedValueOnce('sk-ant-test-claude-key');

      mockConfiguration.get
        .mockReturnValueOnce('') // openai.apiKey (fallback)
        .mockReturnValueOnce('') // claude.apiKey (fallback)
        .mockReturnValueOnce('http://localhost:11434') // ollama.baseUrl
        .mockReturnValueOnce('http://localhost:1234') // lmstudio.baseUrl
        .mockReturnValueOnce('http://localhost:8000'); // vllm.baseUrl

      const config = await configManager.getProviderConfig();

      expect(config).toEqual({
        openai: {
          apiKey: 'sk-test-openai-key'
        },
        claude: {
          apiKey: 'sk-ant-test-claude-key'
        },
        ollama: {
          baseUrl: 'http://localhost:11434'
        },
        lmstudio: {
          baseUrl: 'http://localhost:1234'
        },
        vllm: {
          baseUrl: 'http://localhost:8000'
        }
      });
    });

    it('should fallback to configuration values when secrets are not available', async () => {
      mockSecrets.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockConfiguration.get
        .mockReturnValueOnce('fallback-openai-key')
        .mockReturnValueOnce('fallback-claude-key')
        .mockReturnValueOnce('http://localhost:11434')
        .mockReturnValueOnce('http://localhost:1234')
        .mockReturnValueOnce('http://localhost:8000');

      const config = await configManager.getProviderConfig();

      expect(config.openai.apiKey).toBe('fallback-openai-key');
      expect(config.claude.apiKey).toBe('fallback-claude-key');
    });
  });

  describe('storeApiKey', () => {
    it('should store OpenAI API key securely', async () => {
      await configManager.storeApiKey(AIProvider.OPENAI, 'sk-new-openai-key');

      expect(mockSecrets.store).toHaveBeenCalledWith(
        'sidekickAI.openai.apiKey',
        'sk-new-openai-key'
      );
      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'openai.apiKey',
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should store Claude API key securely', async () => {
      await configManager.storeApiKey(AIProvider.CLAUDE, 'sk-ant-new-claude-key');

      expect(mockSecrets.store).toHaveBeenCalledWith(
        'sidekickAI.claude.apiKey',
        'sk-ant-new-claude-key'
      );
    });

    it('should delete key when empty value is provided', async () => {
      await configManager.storeApiKey(AIProvider.OPENAI, '');

      expect(mockSecrets.delete).toHaveBeenCalledWith('sidekickAI.openai.apiKey');
    });
  });

  describe('validateConfiguration', () => {
    beforeEach(() => {
      // Set up valid configuration by default
      mockConfiguration.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('gpt-3.5-turbo')
        .mockReturnValueOnce(2048)
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);

      mockSecrets.get
        .mockResolvedValueOnce('sk-valid-openai-key')
        .mockResolvedValueOnce(undefined);

      mockConfiguration.get
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('http://localhost:11434')
        .mockReturnValueOnce('http://localhost:1234')
        .mockReturnValueOnce('http://localhost:8000');
    });

    it('should validate valid configuration', async () => {
      const result = await configManager.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid provider', async () => {
      mockConfiguration.get.mockReturnValueOnce('invalid-provider');

      const result = await configManager.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid AI provider: invalid-provider');
    });

    it('should detect empty model name', async () => {
      mockConfiguration.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce(''); // empty model

      const result = await configManager.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Model name cannot be empty');
    });

    it('should warn about invalid token limits', async () => {
      mockConfiguration.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('gpt-3.5-turbo')
        .mockReturnValueOnce(-100); // invalid maxTokens

      const result = await configManager.validateConfiguration();

      expect(result.warnings).toContain('Max tokens should be between 1 and 100000');
    });

    it('should warn about invalid temperature', async () => {
      mockConfiguration.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('gpt-3.5-turbo')
        .mockReturnValueOnce(2048)
        .mockReturnValueOnce(5.0); // invalid temperature

      const result = await configManager.validateConfiguration();

      expect(result.warnings).toContain('Temperature should be between 0 and 2');
    });

    it('should detect missing OpenAI API key', async () => {
      mockSecrets.get.mockResolvedValueOnce(undefined); // no OpenAI key
      mockConfiguration.get.mockReturnValueOnce(''); // no fallback

      const result = await configManager.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required');
    });

    it('should warn about invalid API key format', async () => {
      mockSecrets.get.mockResolvedValueOnce('invalid-key-format');

      const result = await configManager.validateConfiguration();

      expect(result.warnings).toContain('OpenAI API key format appears invalid');
    });
  });

  describe('getDefaultModel', () => {
    it('should return correct default models for each provider', () => {
      expect(configManager.getDefaultModel(AIProvider.OPENAI)).toBe('gpt-3.5-turbo');
      expect(configManager.getDefaultModel(AIProvider.CLAUDE)).toBe('claude-3-sonnet-20240229');
      expect(configManager.getDefaultModel(AIProvider.OLLAMA)).toBe('codellama:7b');
      expect(configManager.getDefaultModel(AIProvider.LMSTUDIO)).toBe('default');
      expect(configManager.getDefaultModel(AIProvider.VLLM)).toBe('codellama/CodeLlama-7b-hf');
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all configuration to defaults', async () => {
      await configManager.resetToDefaults();

      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'provider',
        AIProvider.OPENAI,
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfiguration.update).toHaveBeenCalledWith(
        'model',
        'gpt-3.5-turbo',
        vscode.ConfigurationTarget.Global
      );
      expect(mockSecrets.delete).toHaveBeenCalledWith('sidekickAI.openai.apiKey');
      expect(mockSecrets.delete).toHaveBeenCalledWith('sidekickAI.claude.apiKey');
    });
  });

  describe('isConfigurationReady', () => {
    it('should return true for valid configuration', async () => {
      // Mock validation to return valid
      mockConfiguration.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('gpt-3.5-turbo')
        .mockReturnValueOnce(2048)
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);

      mockSecrets.get
        .mockResolvedValueOnce('sk-valid-key')
        .mockResolvedValueOnce(undefined);

      mockConfiguration.get
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('http://localhost:11434')
        .mockReturnValueOnce('http://localhost:1234')
        .mockReturnValueOnce('http://localhost:8000');

      const isReady = await configManager.isConfigurationReady();
      expect(isReady).toBe(true);
    });

    it('should return false for invalid configuration', async () => {
      // Mock validation to return invalid
      mockConfiguration.get
        .mockReturnValueOnce('invalid-provider');

      const isReady = await configManager.isConfigurationReady();
      expect(isReady).toBe(false);
    });
  });

  describe('onConfigurationChanged', () => {
    it('should register configuration change listener', () => {
      const callback = jest.fn();
      const mockDisposable = { dispose: jest.fn() };
      
      (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue(mockDisposable);

      const disposable = configManager.onConfigurationChanged(callback);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
      expect(disposable).toBe(mockDisposable);
    });
  });
});