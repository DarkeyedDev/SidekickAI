/**
 * AI Service - Routes requests to appropriate AI providers
 * Supports OpenAI, Claude, Ollama, LM Studio, and vLLM
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  AIProvider, 
  AIRequest, 
  AIResponse, 
  AIServiceOptions, 
  ProviderCapabilities,
  CommandType 
} from '../types';
import { OutputChannelManager } from '../logging/outputChannel';

/**
 * Request types for different AI operations
 */
export type AIRequestType = 'write' | 'modify' | 'explain' | 'generate';

/**
 * Enhanced AI request interface
 */
export interface EnhancedAIRequest {
  prompt: string;
  context?: string | undefined;
  type: AIRequestType;
  filePath?: string | undefined;
  selection?: string | undefined;
  language?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * AI response with code and explanation
 */
export interface AICodeResponse {
  code: string;
  explanation?: string | undefined;
  confidence?: number | undefined;
  reasoning?: string | undefined;
  suggestions?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Provider-specific configuration
 */
interface ProviderConfig {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

/**
 * Main AI Service class for routing requests to different providers
 */
export class AIService {
  private logger: OutputChannelManager;
  private httpClient: AxiosInstance;
  private currentProvider: AIProvider;
  private config: ProviderConfig;

  constructor(logger: OutputChannelManager, options: AIServiceOptions) {
    this.logger = logger;
    this.currentProvider = options.provider;
    this.config = {
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      maxTokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.1,
      timeout: options.timeout ?? 30000
    };
    
    this.httpClient = this.createHttpClient();
    
    this.logger.debug('AI Service initialized', {
      provider: this.currentProvider,
      model: this.config.model
    });
  }

  /**
   * Update AI service configuration
   */
  public updateOptions(options: AIServiceOptions): void {
    this.currentProvider = options.provider;
    this.config = {
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      model: options.model,
      maxTokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.1,
      timeout: options.timeout ?? 30000
    };
    
    this.httpClient = this.createHttpClient();
    
    this.logger.debug('AI service configuration updated', {
      provider: this.currentProvider,
      model: this.config.model
    });
  }

  /**
   * Send a request to the configured AI provider (Enhanced interface)
   */
  public async sendRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Sending AI request', {
        provider: this.currentProvider,
        type: request.type,
        promptLength: request.prompt.length,
        hasContext: !!request.context
      });

      let response: AICodeResponse;

      switch (this.currentProvider) {
        case AIProvider.OPENAI:
          response = await this.handleOpenAIRequest(request);
          break;
        case AIProvider.CLAUDE:
          response = await this.handleClaudeRequest(request);
          break;
        case AIProvider.OLLAMA:
          response = await this.handleOllamaRequest(request);
          break;
        case AIProvider.LMSTUDIO:
          response = await this.handleLMStudioRequest(request);
          break;
        case AIProvider.VLLM:
          response = await this.handleVLLMRequest(request);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.currentProvider}`);
      }

      const duration = Date.now() - startTime;
      this.logger.logAIActivity(
        this.currentProvider, 
        request.type, 
        true, 
        duration,
        { 
          responseLength: response.code.length,
          hasExplanation: !!response.explanation,
          confidence: response.confidence
        }
      );

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.logAIActivity(
        this.currentProvider, 
        request.type, 
        false, 
        duration,
        { error: errorMessage }
      );

      this.logger.error('AI request failed', error, 'AIService');
      throw new Error(`AI request failed: ${errorMessage}`);
    }
  }

  /**
   * Send a request using legacy interface (for backward compatibility)
   */
  public async sendLegacyRequest(request: AIRequest): Promise<AIResponse> {
    const enhancedRequest = this.convertLegacyRequest(request);
    const response = await this.sendRequest(enhancedRequest);
    
    return {
      content: response.code || response.explanation || '',
      confidence: response.confidence,
      metadata: response.metadata,
      reasoning: response.reasoning,
      explanation: response.explanation,
      suggestedActions: response.suggestions
    };
  }

  /**
   * Handle OpenAI API requests
   */
  private async handleOpenAIRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    try {
      const url = 'https://api.openai.com/v1/chat/completions';
      
      const systemPrompt = this.buildSystemPrompt(request.type);
      const userPrompt = this.buildUserPrompt(request);

      const payload = {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      };

      this.logger.debug('Making OpenAI API request', { model: this.config.model });

      const response = await this.httpClient.post(url, payload);
      const content = response.data.choices[0]?.message?.content || '';

      return this.parseAIResponse(content, request.type, {
        usage: response.data.usage,
        model: response.data.model,
        finishReason: response.data.choices[0]?.finish_reason
      });

    } catch (error) {
      this.logger.error('OpenAI request failed', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('OpenAI API key is invalid or expired');
        } else if (error.response?.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else if (error.response?.status === 402) {
          throw new Error('OpenAI API quota exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * Handle Anthropic Claude API requests
   */
  private async handleClaudeRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    try {
      const url = 'https://api.anthropic.com/v1/messages';
      
      const systemPrompt = this.buildSystemPrompt(request.type);
      const userPrompt = this.buildUserPrompt(request);

      const payload = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      };

      this.logger.debug('Making Claude API request', { model: this.config.model });

      const response = await this.httpClient.post(url, payload);
      const content = response.data.content[0]?.text || '';

      return this.parseAIResponse(content, request.type, {
        usage: response.data.usage,
        model: response.data.model,
        stopReason: response.data.stop_reason
      });

    } catch (error) {
      this.logger.error('Claude request failed', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Claude API key is invalid or expired');
        } else if (error.response?.status === 429) {
          throw new Error('Claude API rate limit exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * Handle Ollama local model requests
   */
  private async handleOllamaRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    try {
      const baseUrl = this.config.baseUrl || 'http://localhost:11434';
      const url = `${baseUrl}/api/generate`;
      
      const systemPrompt = this.buildSystemPrompt(request.type);
      const userPrompt = this.buildUserPrompt(request);
      const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;

      const payload = {
        model: this.config.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          num_predict: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: 0.9,
          top_k: 40
        }
      };

      this.logger.debug('Making Ollama request', { 
        model: this.config.model, 
        baseUrl 
      });

      const response = await this.httpClient.post(url, payload);
      const content = response.data.response || '';

      return this.parseAIResponse(content, request.type, {
        model: response.data.model,
        evalCount: response.data.eval_count,
        totalDuration: response.data.total_duration
      });

    } catch (error) {
      this.logger.error('Ollama request failed', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama server is not running. Please start Ollama and try again.');
        } else if (error.response?.status === 404) {
          throw new Error(`Ollama model '${this.config.model}' not found. Please pull the model first.`);
        }
      }
      throw error;
    }
  }

  /**
   * Handle LM Studio requests (OpenAI-compatible API)
   */
  private async handleLMStudioRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    try {
      const baseUrl = this.config.baseUrl || 'http://localhost:1234';
      const url = `${baseUrl}/v1/chat/completions`;
      
      const systemPrompt = this.buildSystemPrompt(request.type);
      const userPrompt = this.buildUserPrompt(request);

      const payload = {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      };

      this.logger.debug('Making LM Studio request', { 
        model: this.config.model, 
        baseUrl 
      });

      const response = await this.httpClient.post(url, payload);
      const content = response.data.choices[0]?.message?.content || '';

      return this.parseAIResponse(content, request.type, {
        model: response.data.model,
        usage: response.data.usage
      });

    } catch (error) {
      this.logger.error('LM Studio request failed', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('LM Studio server is not running. Please start LM Studio and load a model.');
        }
      }
      throw error;
    }
  }

  /**
   * Handle vLLM FastAPI requests
   */
  private async handleVLLMRequest(request: EnhancedAIRequest): Promise<AICodeResponse> {
    try {
      const baseUrl = this.config.baseUrl || 'http://localhost:8000';
      const url = `${baseUrl}/v1/completions`;
      
      const systemPrompt = this.buildSystemPrompt(request.type);
      const userPrompt = this.buildUserPrompt(request);
      const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;

      const payload = {
        model: this.config.model,
        prompt: fullPrompt,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: 0.9,
        stream: false
      };

      this.logger.debug('Making vLLM request', { 
        model: this.config.model, 
        baseUrl 
      });

      const response = await this.httpClient.post(url, payload);
      const content = response.data.choices[0]?.text || '';

      return this.parseAIResponse(content, request.type, {
        model: response.data.model,
        usage: response.data.usage
      });

    } catch (error) {
      this.logger.error('vLLM request failed', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('vLLM server is not running. Please start the vLLM server.');
        }
      }
      throw error;
    }
  }

  /**
   * Get capabilities of the current provider
   */
  public getProviderCapabilities(): ProviderCapabilities {
    const capabilities: Record<AIProvider, ProviderCapabilities> = {
      [AIProvider.OPENAI]: {
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 16000,
        requiresApiKey: true
      },
      [AIProvider.CLAUDE]: {
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 100000,
        requiresApiKey: true
      },
      [AIProvider.OLLAMA]: {
        supportsStreaming: true,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 4000,
        requiresApiKey: false
      },
      [AIProvider.LMSTUDIO]: {
        supportsStreaming: false,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 4000,
        requiresApiKey: false
      },
      [AIProvider.VLLM]: {
        supportsStreaming: false,
        supportsCodeGeneration: true,
        supportsCodeExplanation: true,
        supportsFileModification: true,
        maxContextLength: 4000,
        requiresApiKey: false
      }
    };

    return capabilities[this.currentProvider];
  }

  /**
   * Test connection to the AI provider
   */
  public async testConnection(): Promise<boolean> {
    try {
      const testRequest: EnhancedAIRequest = {
        prompt: 'Test connection - respond with "OK"',
        type: 'explain'
      };

      const response = await this.sendRequest(testRequest);
      const responseText = response.code || response.explanation || '';
      return responseText.toLowerCase().includes('ok');
      
    } catch (error) {
      this.logger.warn('Connection test failed', { 
        provider: this.currentProvider,
        error: error instanceof Error ? error.message : error 
      });
      return false;
    }
  }

  /**
   * Create HTTP client with provider-specific configuration
   */
  private createHttpClient(): AxiosInstance {
    const config: AxiosRequestConfig = {
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sidekick-AI-VSCode/1.0.0'
      }
    };

    // Add authorization headers for API-based providers
    if (this.currentProvider === AIProvider.OPENAI && this.config.apiKey) {
      config.headers!['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.currentProvider === AIProvider.CLAUDE && this.config.apiKey) {
      config.headers!['x-api-key'] = this.config.apiKey;
      config.headers!['anthropic-version'] = '2023-06-01';
    }

    return axios.create(config);
  }

  /**
   * Build system prompt based on request type
   */
  private buildSystemPrompt(type: AIRequestType): string {
    const basePrompt = `You are Sidekick AI, an expert coding assistant integrated into VS Code. You help developers by writing, modifying, and explaining code with high precision and clarity.

Key principles:
- Always provide complete, working code
- Include clear explanations for your reasoning
- Respect existing code style and patterns
- Be concise but thorough
- Consider security and best practices
- Use modern language features and idioms`;

    const typeSpecificPrompts: Record<AIRequestType, string> = {
      write: `${basePrompt}

For code writing tasks:
- Generate complete, functional code based on requirements
- Include appropriate imports and dependencies  
- Add helpful comments for complex logic
- Follow language-specific conventions and best practices
- Structure your response with the code first, then explanation`,

      modify: `${basePrompt}

For file modification tasks:
- Preserve existing functionality unless explicitly asked to change it
- Make minimal, targeted changes that achieve the goal
- Maintain code style consistency with the existing file
- Explain what changes you're making and why
- Structure your response with the modified code first, then explanation`,

      generate: `${basePrompt}

For function generation tasks:
- Create well-named, single-purpose functions
- Include proper parameter validation and error handling
- Add comprehensive JSDoc or similar documentation
- Consider edge cases and return appropriate types
- Structure your response with the function code first, then explanation`,

      explain: `${basePrompt}

For code explanation tasks:
- Provide clear, educational explanations
- Break down complex logic into understandable parts
- Mention any potential issues or improvements
- Explain the purpose and context of the code
- Structure your response with the explanation first, then any suggestions`
    };

    return typeSpecificPrompts[type];
  }

  /**
   * Build user prompt with context and metadata
   */
  private buildUserPrompt(request: EnhancedAIRequest): string {
    let prompt = request.prompt;

    if (request.context) {
      prompt += `\n\nContext:\n${request.context}`;
    }

    if (request.selection) {
      prompt += `\n\nSelected code:\n\`\`\`${request.language || ''}\n${request.selection}\n\`\`\``;
    }

    if (request.filePath) {
      prompt += `\n\nFile: ${request.filePath}`;
    }

    // Add request type specific instructions
    switch (request.type) {
      case 'write':
        prompt += `\n\nPlease generate the complete code. Start your response with the code block, then provide explanation.`;
        break;
      case 'modify':
        prompt += `\n\nPlease provide the complete modified code. Start your response with the updated code block, then explain the changes.`;
        break;
      case 'generate':
        prompt += `\n\nPlease generate the complete function with documentation. Start your response with the function code, then provide explanation.`;
        break;
      case 'explain':
        prompt += `\n\nPlease explain this code in detail. Focus on what it does, how it works, and any suggestions for improvement.`;
        break;
    }

    return prompt;
  }

  /**
   * Parse AI response and extract code and explanation
   */
  private parseAIResponse(
    content: string, 
    type: AIRequestType, 
    metadata?: Record<string, unknown>
  ): AICodeResponse {
    let code = '';
    let explanation: string | undefined = undefined;

    if (type === 'explain') {
      // For explanations, the entire response is the explanation
      explanation = content.trim();
      code = ''; // No code expected for explanations
    } else {
      // For code generation/modification, try to extract code blocks
      const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/g;
      const codeBlocks: string[] = [];
      let match;

      while ((match = codeBlockRegex.exec(content)) !== null) {
        codeBlocks.push(match[1].trim());
      }

      if (codeBlocks.length > 0) {
        // Use the first (or largest) code block as the main code
        code = codeBlocks.reduce((prev, current) => 
          current.length > prev.length ? current : prev
        );

        // Everything outside code blocks is explanation
        const explanationText = content.replace(/```[\w]*\n?[\s\S]*?\n?```/g, '').trim();
        if (explanationText) {
          explanation = explanationText;
        }
      } else {
        // No code blocks found, treat entire response as code for write/modify/generate
        if (type !== 'explain') {
          // Try to detect if this looks like code or explanation
          const looksLikeCode = this.detectCodeContent(content);
          if (looksLikeCode) {
            code = content.trim();
          } else {
            explanation = content.trim();
          }
        }
      }
    }

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(content, type, metadata);

    return {
      code,
      explanation,
      confidence,
      metadata
    };
  }

  /**
   * Detect if content looks like code
   */
  private detectCodeContent(content: string): boolean {
    const codeIndicators = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /class\s+\w+/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /{[\s\S]*}/,
      /;$/m,
      /\/\*[\s\S]*?\*\//,
      /\/\/.*$/m
    ];

    const lines = content.split('\n');
    const codeLines = lines.filter(line => 
      codeIndicators.some(pattern => pattern.test(line))
    );

    return codeLines.length > lines.length * 0.3; // 30% threshold
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(
    content: string, 
    type: AIRequestType, 
    metadata?: Record<string, unknown>
  ): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on content length and structure
    if (content.length > 100) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;

    // Adjust based on response type
    if (type === 'explain' && content.length > 200) confidence += 0.1;
    if (type !== 'explain' && content.includes('```')) confidence += 0.1;

    // Adjust based on provider metadata
    if (metadata) {
      if (metadata.finishReason === 'stop' || metadata.stopReason === 'end_turn') {
        confidence += 0.1;
      }
      if (metadata.finishReason === 'length' || metadata.stopReason === 'max_tokens') {
        confidence -= 0.2;
      }
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Convert legacy request format to enhanced format
   */
  private convertLegacyRequest(request: AIRequest): EnhancedAIRequest {
    let type: AIRequestType;
    
    switch (request.commandType) {
      case CommandType.WRITE_CODE:
        type = 'write';
        break;
      case CommandType.MODIFY_FILE:
        type = 'modify';
        break;
      case CommandType.GENERATE_FUNCTION:
        type = 'generate';
        break;
      case CommandType.EXPLAIN_CODE:
        type = 'explain';
        break;
      default:
        type = 'write';
    }

    return {
      prompt: request.prompt,
      context: request.context,
      type,
      filePath: request.filePath,
      selection: request.selection,
      metadata: request.metadata
    };
  }
}

/**
 * Legacy support function for converting old request format
 */
export function convertLegacyRequest(request: AIRequest): EnhancedAIRequest {
  let type: AIRequestType;
  
  switch (request.commandType) {
    case CommandType.WRITE_CODE:
      type = 'write';
      break;
    case CommandType.MODIFY_FILE:
      type = 'modify';
      break;
    case CommandType.GENERATE_FUNCTION:
      type = 'generate';
      break;
    case CommandType.EXPLAIN_CODE:
      type = 'explain';
      break;
    default:
      type = 'write';
  }

  return {
    prompt: request.prompt,
    context: request.context,
    type,
    filePath: request.filePath,
    selection: request.selection,
    metadata: request.metadata
  };
}

