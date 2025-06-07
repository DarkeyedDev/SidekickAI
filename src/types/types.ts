/**
 * Core type definitions for Sidekick AI VS Code Extension
 * Contains all shared interfaces, enums, and type definitions
 */

import * as vscode from 'vscode';

// ============================
// Enums
// ============================

/**
 * Supported AI providers
 */
export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',
  VLLM = 'vllm'
}

/**
 * Types of commands that can be executed
 */
export enum CommandType {
  WRITE_CODE = 'writeCode',
  MODIFY_FILE = 'modifyFile',
  GENERATE_FUNCTION = 'generateFunction',
  EXPLAIN_CODE = 'explainCode'
}

/**
 * Status of file changes
 */
export enum ChangeStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

/**
 * Types of file operations
 */
export enum FileOperationType {
  CREATE = 'create',
  MODIFY = 'modify',
  DELETE = 'delete',
  RENAME = 'rename'
}

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Types of AI requests
 */
export enum AIRequestType {
  CODE_GENERATION = 'codeGeneration',
  CODE_EXPLANATION = 'codeExplanation',
  CODE_MODIFICATION = 'codeModification',
  CODE_COMPLETION = 'codeCompletion'
}

/**
 * Request types for different AI operations (string literal type)
 */
export type AIRequestTypeString = 'write' | 'modify' | 'explain' | 'generate';

// ============================
// Core Configuration Types
// ============================

/**
 * Main configuration interface for Sidekick AI
 */
export interface SidekickConfig {
  /**
   * Selected AI provider
   */
  provider: AIProvider;

  /**
   * Model name for the selected provider
   */
  model: string;

  /**
   * Maximum tokens for AI responses
   */
  maxTokens: number;

  /**
   * Temperature for AI responses (0-2, where 0 is deterministic)
   */
  temperature: number;

  /**
   * Enable dry-run mode (simulate changes without applying)
   */
  dryRun: boolean;

  /**
   * Auto-confirm non-destructive changes
   */
  autoConfirm: boolean;

  /**
   * Enable optional telemetry
   */
  telemetryEnabled: boolean;

  /**
   * Provider-specific configuration
   */
  providers: ProviderConfigurations;
}

/**
 * Provider-specific configurations
 */
export interface ProviderConfigurations {
  openai: OpenAIConfig;
  claude: ClaudeConfig;
  ollama: OllamaConfig;
  lmstudio: LMStudioConfig;
  vllm: VLLMConfig;
}

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig {
  apiKey: string;
  organization?: string | undefined;
  baseURL?: string | undefined;
}

/**
 * Claude provider configuration
 */
export interface ClaudeConfig {
  apiKey: string;
  version?: string | undefined;
}

/**
 * Ollama provider configuration
 */
export interface OllamaConfig {
  baseUrl: string;
  timeout?: number | undefined;
}

/**
 * LM Studio provider configuration
 */
export interface LMStudioConfig {
  baseUrl: string;
  timeout?: number | undefined;
}

/**
 * vLLM provider configuration
 */
export interface VLLMConfig {
  baseUrl: string;
  timeout?: number | undefined;
  apiKey?: string | undefined;
}

// ============================
// AI Service Types
// ============================

/**
 * Request sent to AI services
 */
export interface AIRequest {
  /**
   * The user's prompt or instruction
   */
  prompt: string;

  /**
   * Additional context information
   */
  context?: string | undefined;

  /**
   * Selected text from editor
   */
  selection?: string | undefined;

  /**
   * File path being worked on
   */
  filePath?: string | undefined;

  /**
   * Type of command being executed
   */
  commandType: CommandType;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown> | undefined;
}

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
 * Enhanced AI request interface with string literal type
 */
export interface EnhancedAIRequestString {
  prompt: string;
  context?: string | undefined;
  type: AIRequestTypeString;
  filePath?: string | undefined;
  selection?: string | undefined;
  language?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Response from AI services
 */
export interface AIResponse {
  /**
   * Generated content/code
   */
  content: string;

  /**
   * Explanation of the generated content
   */
  explanation?: string | undefined;

  /**
   * Confidence score (0-1)
   */
  confidence?: number | undefined;

  /**
   * AI's reasoning process
   */
  reasoning?: string | undefined;

  /**
   * Suggested follow-up actions
   */
  suggestedActions?: string[] | undefined;

  /**
   * Additional metadata from the provider
   */
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
 * Options for configuring AI service behavior
 */
export interface AIServiceOptions {
  provider: AIProvider;
  model: string;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  timeout?: number | undefined;
  streamingEnabled?: boolean | undefined;
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

/**
 * Capabilities of different AI providers
 */
export interface ProviderCapabilities {
  /**
   * Whether the provider supports streaming responses
   */
  supportsStreaming: boolean;

  /**
   * Whether the provider can generate code
   */
  supportsCodeGeneration: boolean;

  /**
   * Whether the provider can explain code
   */
  supportsCodeExplanation: boolean;

  /**
   * Whether the provider can modify existing files
   */
  supportsFileModification: boolean;

  /**
   * Maximum context length in tokens
   */
  maxContextLength: number;

  /**
   * Whether the provider requires an API key
   */
  requiresApiKey: boolean;

  /**
   * Supported programming languages
   */
  supportedLanguages?: string[] | undefined;
}

// ============================
// File Management Types
// ============================

/**
 * Represents a pending or completed file change
 */
export interface FileChange {
  /**
   * Unique identifier for this change
   */
  id: string;

  /**
   * Path to the file being changed
   */
  filePath: string;

  /**
   * Original content before the change
   */
  originalContent: string;

  /**
   * New content after the change
   */
  newContent: string;

  /**
   * Type of change being made
   */
  changeType: FileOperationType;

  /**
   * Human-readable description of the change
   */
  description: string;

  /**
   * When the change was created
   */
  timestamp: Date;

  /**
   * Current status of the change
   */
  status: ChangeStatus;

  /**
   * Command that initiated this change
   */
  commandType: CommandType;

  /**
   * AI's reasoning for this change
   */
  reasoning?: string | undefined;

  /**
   * Whether this change can be undone
   */
  canUndo: boolean;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Preview information for a file change
 */
export interface ChangePreview {
  /**
   * Change identifier
   */
  id: string;

  /**
   * Display title for the change
   */
  title: string;

  /**
   * Description of what will change
   */
  description: string;

  /**
   * File path being modified
   */
  filePath: string;

  /**
   * Type of change
   */
  changeType: FileOperationType;

  /**
   * Preview text of the changes
   */
  preview: string;

  /**
   * Whether this change is potentially destructive
   */
  isDestructive: boolean;

  /**
   * Whether this change can be undone
   */
  canUndo: boolean;

  /**
   * Estimated number of lines affected
   */
  linesAffected?: number | undefined;

  /**
   * Diff statistics
   */
  diffStats?: DiffStatistics | undefined;
}

/**
 * Statistics about differences between content versions
 */
export interface DiffStatistics {
  /**
   * Number of lines added
   */
  linesAdded: number;

  /**
   * Number of lines removed
   */
  linesRemoved: number;

  /**
   * Number of lines modified
   */
  linesModified: number;

  /**
   * Total character difference
   */
  characterDifference: number;
}

// ============================
// Code Generation Types
// ============================

/**
 * Result of code generation operations
 */
export interface CodeGeneration {
  /**
   * Generated code content
   */
  code: string;

  /**
   * Programming language of the generated code
   */
  language: string;

  /**
   * Description of what was generated
   */
  description: string;

  /**
   * Specific insertion point for the code
   */
  insertionPoint?: vscode.Position | undefined;

  /**
   * Range to replace with the new code
   */
  replaceRange?: vscode.Range | undefined;

  /**
   * Whether the code is a complete file or snippet
   */
  isCompleteFile?: boolean | undefined;

  /**
   * Dependencies required by the generated code
   */
  dependencies?: string[] | undefined;

  /**
   * Additional setup instructions
   */
  setupInstructions?: string[] | undefined;
}

/**
 * Result of code explanation operations
 */
export interface ExplanationResult {
  /**
   * Detailed explanation of the code
   */
  explanation: string;

  /**
   * The code that was explained
   */
  codeSnippet: string;

  /**
   * Complexity assessment
   */
  complexity: 'low' | 'medium' | 'high';

  /**
   * Suggestions for improvement
   */
  suggestions?: string[] | undefined;

  /**
   * Identified patterns or algorithms
   */
  patterns?: string[] | undefined;

  /**
   * Potential issues or concerns
   */
  issues?: string[] | undefined;
}

// ============================
// Validation and Error Types
// ============================

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  isValid: boolean;

  /**
   * List of validation errors
   */
  errors: string[];

  /**
   * List of validation warnings
   */
  warnings: string[];

  /**
   * Additional validation context
   */
  context?: Record<string, unknown> | undefined;
}

/**
 * Structured error information
 */
export interface SidekickError extends Error {
  /**
   * Error code for programmatic handling
   */
  code: string;

  /**
   * Context where the error occurred
   */
  context?: string | undefined;

  /**
   * Whether this error should be reported to telemetry
   */
  reportable?: boolean | undefined;

  /**
   * Additional error metadata
   */
  metadata?: Record<string, unknown> | undefined;
}

// ============================
// Telemetry and Analytics Types
// ============================

/**
 * Telemetry event for usage analytics
 */
export interface TelemetryEvent {
  /**
   * Type of event
   */
  eventType: string;

  /**
   * When the event occurred
   */
  timestamp: Date;

  /**
   * AI provider used
   */
  provider: AIProvider;

  /**
   * Command type executed
   */
  commandType: CommandType;

  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Duration of the operation in milliseconds
   */
  duration?: number | undefined;

  /**
   * Type of error if operation failed
   */
  errorType?: string | undefined;

  /**
   * Additional anonymous metadata
   */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  /**
   * Operation identifier
   */
  operationId: string;

  /**
   * Start time of the operation
   */
  startTime: number;

  /**
   * End time of the operation
   */
  endTime: number;

  /**
   * Total duration in milliseconds
   */
  duration: number;

  /**
   * Memory usage during operation
   */
  memoryUsage?: NodeJS.MemoryUsage | undefined;

  /**
   * Additional performance data
   */
  additionalMetrics?: Record<string, number> | undefined;
}

// ============================
// User Interface Types
// ============================

/**
 * Tree item for displaying changes in VS Code tree view
 */
export interface ChangeTreeItem {
  /**
   * Change this item represents
   */
  change: FileChange;

  /**
   * Display label for the item
   */
  label: string;

  /**
   * Description text
   */
  description?: string | undefined;

  /**
   * Tooltip text
   */
  tooltip?: string | undefined;

  /**
   * Icon for the tree item
   */
  iconPath?: vscode.ThemeIcon | vscode.Uri | undefined;

  /**
   * Context value for commands
   */
  contextValue?: string | undefined;

  /**
   * Command to execute when clicked
   */
  command?: vscode.Command | undefined;
}

/**
 * Progress information for long-running operations
 */
export interface ProgressInfo {
  /**
   * Current step being executed
   */
  currentStep: string;

  /**
   * Progress percentage (0-100)
   */
  percentage: number;

  /**
   * Whether the operation can be cancelled
   */
  cancellable: boolean;

  /**
   * Estimated time remaining in milliseconds
   */
  estimatedTimeRemaining?: number | undefined;
}

// ============================
// Workspace and Project Types
// ============================

/**
 * Information about the current workspace
 */
export interface WorkspaceInfo {
  /**
   * Name of the workspace
   */
  name?: string | undefined;

  /**
   * Root path of the workspace
   */
  rootPath?: string | undefined;

  /**
   * Detected project type
   */
  projectType?: string | undefined;

  /**
   * Primary programming language
   */
  primaryLanguage?: string | undefined;

  /**
   * Project dependencies
   */
  dependencies?: string[] | undefined;

  /**
   * Build tools detected
   */
  buildTools?: string[] | undefined;

  /**
   * Testing frameworks detected
   */
  testingFrameworks?: string[] | undefined;
}

/**
 * Information about the current file
 */
export interface FileInfo {
  /**
   * Full file path
   */
  filePath: string;

  /**
   * File name without path
   */
  fileName: string;

  /**
   * File extension
   */
  extension: string;

  /**
   * Programming language
   */
  language: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Last modified timestamp
   */
  lastModified: Date;

  /**
   * Whether the file has unsaved changes
   */
  hasUnsavedChanges: boolean;
}

// ============================
// Extension Context Types
// ============================

/**
 * Global state for the extension
 */
export interface ExtensionState {
  /**
   * Whether the extension is activated
   */
  isActivated: boolean;

  /**
   * Current configuration
   */
  config: SidekickConfig;

  /**
   * Active AI provider instance
   */
  activeProvider?: AIProvider | undefined;

  /**
   * Pending file changes
   */
  pendingChanges: FileChange[];

  /**
   * Extension version
   */
  version: string;

  /**
   * Installation timestamp
   */
  installedAt: Date;

  /**
   * Usage statistics
   */
  usageStats: UsageStatistics;
}

/**
 * Usage statistics for the extension
 */
export interface UsageStatistics {
  /**
   * Total commands executed
   */
  totalCommands: number;

  /**
   * Commands executed by type
   */
  commandsByType: Record<CommandType, number>;

  /**
   * AI providers used
   */
  providerUsage: Record<AIProvider, number>;

  /**
   * Total lines of code generated
   */
  totalLinesGenerated: number;

  /**
   * Total files modified
   */
  totalFilesModified: number;

  /**
   * Last activity timestamp
   */
  lastActivity: Date;
}

/**
 * Log entry for structured logging
 */
export interface LogEntry {
  /**
   * When the log entry was created
   */
  timestamp: Date;

  /**
   * Log level
   */
  level: LogLevel;

  /**
   * Log message
   */
  message: string;

  /**
   * Additional log data
   */
  data?: unknown | undefined;

  /**
   * Source of the log entry
   */
  source?: string | undefined;
}

// ============================
// Utility Types
// ============================

/**
 * Generic callback function type
 */
export type Callback<T = void> = (result: T) => void;

/**
 * Generic error callback type
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Async operation result
 */
export type AsyncResult<T> = Promise<T>;

/**
 * Optional configuration override
 */
export type ConfigOverride = Partial<SidekickConfig>;

/**
 * Event listener function type
 */
export type EventListener<T = unknown> = (event: T) => void;

/**
 * Disposable resource type
 */
export type Disposable = vscode.Disposable;

/**
 * Make all properties of a type optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract the return type of a promise
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
