/**
 * Unit tests for AIService
 * Tests provider routing, mocked backend calls, and error handling
 */

import axios, { AxiosError } from 'axios';
import { AIService, EnhancedAIRequest } from '../ai/aiService';
import { OutputChannelManager } from '../logging/outputChannel';
import { AIProvider, AIServiceOptions, CommandType } from '../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock OutputChannelManager
jest.mock('../logging/outputChannel');

describe('AIService', () => {
  let aiService: AIService;
  let mockLogger: jest.Mocked<OutputChannelManager>;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logAIActivity: jest.fn(),
      logMessage: jest.fn(),
      logError: jest.fn(),
      show: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn()
    } as any;

    // Mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: { headers: {} }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with OpenAI provider', () => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key',
        maxTokens: 2048,
        temperature: 0.1
      };

      aiService = new AIService(mockLogger, options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0',
          'Authorization': 'Bearer sk-test-key'
        }
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AI Service initialized',
        { provider: AIProvider.OPENAI, model: 'gpt-3.5-turbo' }
      );
    });

    it('should initialize with Claude provider', () => {
      const options: AIServiceOptions = {
        provider: AIProvider.CLAUDE,
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-test-key',
        maxTokens: 1000,
        temperature: 0.2
      };

      aiService = new AIService(mockLogger, options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0',
          'x-api-key': 'sk-ant-test-key',
          'anthropic-version': '2023-06-01'
        }
      });
    });

    it('should initialize with Ollama provider without auth headers', () => {
      const options: AIServiceOptions = {
        provider: AIProvider.OLLAMA,
        model: 'codellama:7b',
        baseUrl: 'http://localhost:11434'
      };

      aiService = new AIService(mockLogger, options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0'
        }
      });
    });

    it('should initialize with LM Studio provider', () => {
      const options: AIServiceOptions = {
        provider: AIProvider.LMSTUDIO,
        model: 'local-model',
        baseUrl: 'http://localhost:1234'
      };

      aiService = new AIService(mockLogger, options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0'
        }
      });
    });

    it('should initialize with vLLM provider', () => {
      const options: AIServiceOptions = {
        provider: AIProvider.VLLM,
        model: 'codellama/CodeLlama-7b-hf',
        baseUrl: 'http://localhost:8000'
      };

      aiService = new AIService(mockLogger, options);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0'
        }
      });
    });
  });

  describe('Provider Routing Logic', () => {
    beforeEach(() => {
      const defaultOptions: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, defaultOptions);
    });

    it('should route to OpenAI handler', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Generated code' },
            finish_reason: 'stop'
          }],
          usage: { total_tokens: 100 },
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      );

      expect(result.code).toBe('Generated code');
    });

    it('should route to Claude handler', async () => {
      // Update service to use Claude
      aiService.updateOptions({
        provider: AIProvider.CLAUDE,
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-test-key'
      });

      const mockResponse = {
        data: {
          content: [{ text: 'Claude response' }],
          usage: { input_tokens: 50, output_tokens: 100 },
          model: 'claude-3-sonnet',
          stop_reason: 'end_turn'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'explain'
      };

      const result = await aiService.sendRequest(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          model: 'claude-3-sonnet',
          system: expect.stringContaining('Sidekick AI'),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' })
          ])
        })
      );

      expect(result.code).toBe('Claude response');
    });

    it('should route to Ollama handler', async () => {
      aiService.updateOptions({
        provider: AIProvider.OLLAMA,
        model: 'codellama:7b',
        baseUrl: 'http://localhost:11434'
      });

      const mockResponse = {
        data: {
          response: 'Ollama response',
          model: 'codellama:7b',
          eval_count: 50
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'generate'
      };

      const result = await aiService.sendRequest(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          model: 'codellama:7b',
          stream: false
        })
      );

      expect(result.code).toBe('Ollama response');
    });

    it('should route to LM Studio handler', async () => {
      aiService.updateOptions({
        provider: AIProvider.LMSTUDIO,
        model: 'local-model',
        baseUrl: 'http://localhost:1234'
      });

      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'LM Studio response' }
          }],
          model: 'local-model',
          usage: { total_tokens: 150 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'modify'
      };

      const result = await aiService.sendRequest(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          model: 'local-model',
          messages: expect.any(Array),
          stream: false
        })
      );

      expect(result.code).toBe('LM Studio response');
    });

    it('should route to vLLM handler', async () => {
      aiService.updateOptions({
        provider: AIProvider.VLLM,
        model: 'codellama/CodeLlama-7b-hf',
        baseUrl: 'http://localhost:8000'
      });

      const mockResponse = {
        data: {
          choices: [{
            text: 'vLLM response'
          }],
          model: 'codellama/CodeLlama-7b-hf',
          usage: { total_tokens: 75 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/completions',
        expect.objectContaining({
          model: 'codellama/CodeLlama-7b-hf',
          stream: false
        })
      );

      expect(result.code).toBe('vLLM response');
    });

    it('should throw error for unsupported provider', async () => {
      // Force invalid provider
      (aiService as any).currentProvider = 'invalid-provider';

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Unsupported AI provider: invalid-provider'
      );
    });
  });

  describe('OpenAI Provider Tests', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'sk-test-key',
        maxTokens: 1500,
        temperature: 0.2
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should handle successful OpenAI response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'function test() {\n  return "Hello World";\n}' },
            finish_reason: 'stop'
          }],
          usage: { 
            prompt_tokens: 50, 
            completion_tokens: 30, 
            total_tokens: 80 
          },
          model: 'gpt-4'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Create a simple test function',
        type: 'write',
        language: 'javascript'
      };

      const result = await aiService.sendRequest(request);

      expect(result).toEqual({
        code: 'function test() {\n  return "Hello World";\n}',
        explanation: undefined,
        confidence: 0.9,
        metadata: {
          usage: mockResponse.data.usage,
          model: 'gpt-4',
          finishReason: 'stop'
        }
      });

      expect(mockLogger.logAIActivity).toHaveBeenCalledWith(
        AIProvider.OPENAI,
        'write',
        true,
        expect.any(Number),
        expect.objectContaining({
          responseLength: expect.any(Number)
        })
      );
    });

    it('should handle OpenAI response with code blocks', async () => {
      const codeWithBlocks = '```javascript\nfunction hello() {\n  console.log("Hello");\n}\n```\n\nThis function prints hello.';
      
      const mockResponse = {
        data: {
          choices: [{
            message: { content: codeWithBlocks },
            finish_reason: 'stop'
          }],
          usage: { total_tokens: 100 },
          model: 'gpt-4'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Create a hello function',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      expect(result.code).toBe('function hello() {\n  console.log("Hello");\n}');
      expect(result.explanation).toContain('This function prints hello');
    });

    it('should handle OpenAI 401 authentication error', async () => {
      const error = new AxiosError('Unauthorized');
      error.response = { status: 401, data: {}, statusText: 'Unauthorized', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: OpenAI API key is invalid or expired'
      );

      expect(mockLogger.logAIActivity).toHaveBeenCalledWith(
        AIProvider.OPENAI,
        'write',
        false,
        expect.any(Number),
        expect.objectContaining({
          error: 'OpenAI API key is invalid or expired'
        })
      );
    });

    it('should handle OpenAI 429 rate limit error', async () => {
      const error = new AxiosError('Rate limit exceeded');
      error.response = { status: 429, data: {}, statusText: 'Too Many Requests', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: OpenAI API rate limit exceeded'
      );
    });

    it('should handle OpenAI 402 quota exceeded error', async () => {
      const error = new AxiosError('Quota exceeded');
      error.response = { status: 402, data: {}, statusText: 'Payment Required', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: OpenAI API quota exceeded'
      );
    });

    it('should build correct prompt with context and selection', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'response' },
            finish_reason: 'stop'
          }],
          usage: {},
          model: 'gpt-4'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Fix this function',
        type: 'modify',
        context: 'This is a React component',
        selection: 'function broken() { /* buggy code */ }',
        filePath: '/src/component.tsx',
        language: 'typescript'
      };

      await aiService.sendRequest(request);

      const callArgs = mockAxiosInstance.post.mock.calls[0]![1];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('Fix this function');
      expect(userMessage).toContain('Context:\nThis is a React component');
      expect(userMessage).toContain('Selected code:\n```typescript\nfunction broken() { /* buggy code */ }\n```');
      expect(userMessage).toContain('File: /src/component.tsx');
    });
  });

  describe('Claude Provider Tests', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.CLAUDE,
        model: 'claude-3-opus',
        apiKey: 'sk-ant-test-key',
        maxTokens: 2000,
        temperature: 0.15
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should handle successful Claude response', async () => {
      const mockResponse = {
        data: {
          content: [{ 
            text: '```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```\n\nThis is a recursive Fibonacci function.' 
          }],
          usage: { 
            input_tokens: 25, 
            output_tokens: 75 
          },
          model: 'claude-3-opus',
          stop_reason: 'end_turn'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Write a Fibonacci function in Python',
        type: 'write',
        language: 'python'
      };

      const result = await aiService.sendRequest(request);

      expect(result.code).toContain('def fibonacci(n):');
      expect(result.explanation).toContain('recursive Fibonacci function');
      expect(result.confidence).toBe(0.9);
      expect(result.metadata).toEqual({
        usage: mockResponse.data.usage,
        model: 'claude-3-opus',
        stopReason: 'end_turn'
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          model: 'claude-3-opus',
          max_tokens: 2000,
          temperature: 0.15,
          system: expect.stringContaining('Sidekick AI'),
          messages: [{
            role: 'user',
            content: expect.stringContaining('Write a Fibonacci function in Python')
          }]
        })
      );
    });

    it('should handle Claude explanation request', async () => {
      const mockResponse = {
        data: {
          content: [{ 
            text: 'This code implements a binary search algorithm. It works by repeatedly dividing the search interval in half...' 
          }],
          usage: { input_tokens: 100, output_tokens: 200 },
          model: 'claude-3-opus',
          stop_reason: 'end_turn'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Explain this binary search implementation',
        type: 'explain',
        selection: 'def binary_search(arr, target): ...'
      };

      const result = await aiService.sendRequest(request);

      // For explain requests, content goes to explanation, code is empty
      expect(result.code).toBe('');
      expect(result.explanation).toContain('binary search algorithm');
    });

    it('should handle Claude 401 authentication error', async () => {
      const error = new AxiosError('Invalid API key');
      error.response = { status: 401, data: {}, statusText: 'Unauthorized', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Claude API key is invalid or expired'
      );
    });

    it('should handle Claude 429 rate limit error', async () => {
      const error = new AxiosError('Rate limit exceeded');
      error.response = { status: 429, data: {}, statusText: 'Too Many Requests', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Claude API rate limit exceeded'
      );
    });

    it('should handle empty Claude response', async () => {
      const mockResponse = {
        data: {
          content: [],
          usage: { input_tokens: 10, output_tokens: 0 },
          model: 'claude-3-opus',
          stop_reason: 'end_turn'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      expect(result.code).toBe('');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should handle network timeout errors', async () => {
      const error = new AxiosError('timeout of 30000ms exceeded');
      error.code = 'ECONNABORTED';
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: timeout of 30000ms exceeded'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OpenAI request failed',
        error
      );
    });

    it('should handle network connection errors', async () => {
      const error = new AxiosError('Network Error');
      error.code = 'ENOTFOUND';
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Network Error'
      );
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        data: {
          // Missing choices array
          usage: { total_tokens: 100 },
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      // Should handle gracefully with empty content
      expect(result.code).toBe('');
    });

    it('should handle Ollama server not running', async () => {
      aiService.updateOptions({
        provider: AIProvider.OLLAMA,
        model: 'codellama:7b',
        baseUrl: 'http://localhost:11434'
      });

      const error = new AxiosError('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Ollama server is not running. Please start Ollama and try again.'
      );
    });

    it('should handle Ollama model not found', async () => {
      aiService.updateOptions({
        provider: AIProvider.OLLAMA,
        model: 'nonexistent-model',
        baseUrl: 'http://localhost:11434'
      });

      const error = new AxiosError('Model not found');
      error.response = { status: 404, data: {}, statusText: 'Not Found', headers: {}, config: {} as any };
      
      mockAxiosInstance.post.mockRejectedValue(error);

      const request: EnhancedAIRequest = {
        prompt: 'Test prompt',
        type: 'write'
      };

      await expect(aiService.sendRequest(request)).rejects.toThrow(
        'AI request failed: Ollama model \'nonexistent-model\' not found. Please pull the model first.'
      );
    });
  });

  describe('Provider Capabilities', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should return OpenAI capabilities', () => {
      const capabilities = aiService.getProviderCapabilities();

      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 16000,
        requiresApiKey: true
      });
    });

    it('should return Claude capabilities', () => {
      aiService.updateOptions({
        provider: AIProvider.CLAUDE,
        model: 'claude-3-sonnet',
        apiKey: 'sk-ant-test-key'
      });

      const capabilities = aiService.getProviderCapabilities();

      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 100000,
        requiresApiKey: true
      });
    });

    it('should return Ollama capabilities', () => {
      aiService.updateOptions({
        provider: AIProvider.OLLAMA,
        model: 'codellama:7b',
        baseUrl: 'http://localhost:11434'
      });

      const capabilities = aiService.getProviderCapabilities();

      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 4000,
        requiresApiKey: false
      });
    });

    it('should return LM Studio capabilities', () => {
      aiService.updateOptions({
        provider: AIProvider.LMSTUDIO,
        model: 'local-model',
        baseUrl: 'http://localhost:1234'
      });

      const capabilities = aiService.getProviderCapabilities();

      expect(capabilities.requiresApiKey).toBe(false);
      expect(capabilities.supportsCodeGeneration).toBe(true);
    });

    it('should return vLLM capabilities', () => {
      aiService.updateOptions({
        provider: AIProvider.VLLM,
        model: 'codellama/CodeLlama-7b-hf',
        baseUrl: 'http://localhost:8000'
      });

      const capabilities = aiService.getProviderCapabilities();

      expect(capabilities.requiresApiKey).toBe(false);
      expect(capabilities.supportsCodeGeneration).toBe(true);
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should return true for successful connection test', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'OK' },
            finish_reason: 'stop'
          }],
          usage: {},
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for connection test with non-OK response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Something else entirely' },
            finish_reason: 'stop'
          }],
          usage: {},
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for failed connection test', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection failed'));

      const result = await aiService.testConnection();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Connection test failed',
        expect.objectContaining({
          provider: AIProvider.OPENAI,
          error: 'Connection failed'
        })
      );
    });
  });

  describe('updateOptions', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should update options and recreate HTTP client', () => {
      const newOptions: AIServiceOptions = {
        provider: AIProvider.CLAUDE,
        model: 'claude-3-opus',
        apiKey: 'sk-ant-new-key',
        maxTokens: 4000,
        temperature: 0.3
      };

      aiService.updateOptions(newOptions);

      // Should have been called twice: once in constructor, once in update
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
      
      // Second call should have Claude headers
      expect(mockedAxios.create).toHaveBeenLastCalledWith({
        timeout: undefined,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidekick-AI-VSCode/1.0.0',
          'x-api-key': 'sk-ant-new-key',
          'anthropic-version': '2023-06-01'
        }
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'AI service configuration updated',
        { provider: AIProvider.CLAUDE, model: 'claude-3-opus' }
      );
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should parse code blocks correctly', async () => {
      const responseWithCodeBlock = '```typescript\ninterface User {\n  name: string;\n  age: number;\n}\n```\n\nThis defines a User interface.';
      
      const mockResponse = {
        data: {
          choices: [{
            message: { content: responseWithCodeBlock },
            finish_reason: 'stop'
          }],
          usage: {},
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Create a User interface',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      expect(result.code).toBe('interface User {\n  name: string;\n  age: number;\n}');
      expect(result.explanation).toContain('This defines a User interface');
    });

    it('should handle multiple code blocks and choose the largest', async () => {
      const responseWithMultipleBlocks = '```typescript\ntype A = string;\n```\n\nAnd here\'s a bigger one:\n\n```typescript\ninterface ComplexUser {\n  id: number;\n  name: string;\n  email: string;\n  roles: string[];\n}\n```\n\nThe second one is more complete.';
      
      const mockResponse = {
        data: {
          choices: [{
            message: { content: responseWithMultipleBlocks },
            finish_reason: 'stop'
          }],
          usage: {},
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request: EnhancedAIRequest = {
        prompt: 'Create user types',
        type: 'write'
      };

      const result = await aiService.sendRequest(request);

      // Should choose the larger code block
      expect(result.code).toContain('ComplexUser');
      expect(result.code).toContain('roles: string[]');
    });

    it('should calculate confidence based on finish reason', async () => {
      const testCases = [
        { finishReason: 'stop', expectedConfidence: 0.9 },
        { finishReason: 'length', expectedConfidence: 0.6 },
        { finishReason: 'content_filter', expectedConfidence: 0.5 },
        { finishReason: null, expectedConfidence: 0.7 }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          data: {
            choices: [{
              message: { content: 'test response' },
              finish_reason: testCase.finishReason
            }],
            usage: {},
            model: 'gpt-3.5-turbo'
          }
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const request: EnhancedAIRequest = {
          prompt: 'test',
          type: 'write'
        };

        const result = await aiService.sendRequest(request);

        expect(result.confidence).toBe(testCase.expectedConfidence);
      }
    });
  });

  describe('System Prompt Generation', () => {
    beforeEach(() => {
      const options: AIServiceOptions = {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-test-key'
      };
      aiService = new AIService(mockLogger, options);
    });

    it('should generate appropriate system prompts for different request types', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'response' }, finish_reason: 'stop' }],
          usage: {},
          model: 'gpt-3.5-turbo'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const requestTypes = ['write', 'modify', 'generate', 'explain'] as const;

      for (const type of requestTypes) {
        const request: EnhancedAIRequest = {
          prompt: 'test prompt',
          type
        };

        await aiService.sendRequest(request);

        const callArgs = mockAxiosInstance.post.mock.calls.slice(-1)[0]![1];
        const systemPrompt = callArgs.messages[0].content;

        expect(systemPrompt).toContain('Sidekick AI');
        
        switch (type) {
          case 'write':
            expect(systemPrompt).toContain('code writing tasks');
            break;
          case 'modify':
            expect(systemPrompt).toContain('file modification tasks');
            break;
          case 'generate':
            expect(systemPrompt).toContain('function generation tasks');
            break;
          case 'explain':
            expect(systemPrompt).toContain('code explanation tasks');
            break;
        }
      }
    });
  });
});