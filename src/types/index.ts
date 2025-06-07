/**
 * Core type definitions for the Sidekick AI extension
 */

/**
 * AI provider options
 */
export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',
  VLLM = 'vllm'
}

/**
 * Command types for categorizing AI operations
 */
export enum CommandType {
  WRITE_CODE = 'write_code',
  MODIFY_FILE = 'modify_file',
  EXPLAIN_CODE = 'explain_code',
  GENERATE_FUNCTION = 'generate_function',
  CUSTOM = 'custom'
}

/**
 * Configuration options for AI service
 */
export interface AIServiceOptions {
  provider: AIProvider;
  model: string;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  timeout?: number | undefined;
}

/**
 * Capabilities of an AI provider
 */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsCodeGeneration: boolean;
  supportsCodeExplanation: boolean;
  supportsFileModification: boolean;
  maxContextLength: number;
  requiresApiKey: boolean;
}

/**
 * Request to AI service
 */
export interface AIRequest {
  prompt: string;
  context?: string | undefined;
  filePath?: string | undefined;
  selection?: string | undefined;
  commandType: CommandType;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Response from AI service
 */
export interface AIResponse {
  content: string;
  confidence?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
  reasoning?: string | undefined;
  explanation?: string | undefined;
  suggestedActions?: string[] | undefined;
}

/**
 * Code generation result
 */
export interface CodeGeneration {
  code: string;
  language: string;
  description: string;
  isCompleteFile: boolean;
}

/**
 * Code explanation result
 */
export interface ExplanationResult {
  explanation: string;
  codeSnippet: string;
  complexity: 'low' | 'medium' | 'high';
  suggestions?: string[] | undefined;
}

/**
 * File modification result
 */
export interface FileModification {
  originalContent: string;
  modifiedContent: string;
  description: string;
  changeDescription?: string | undefined;
}

/**
 * Function generation result
 */
export interface FunctionGeneration {
  functionCode: string;
  functionName?: string | undefined;
  description: string;
  parameters?: string[] | undefined;
  returnType?: string | undefined;
}

/**
 * Telemetry event data
 */
export interface TelemetryEvent {
  eventName: string;
  properties?: Record<string, string> | undefined;
  measurements?: Record<string, number> | undefined;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown> | undefined;
  source?: string | undefined;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  showLineNumbers: boolean;
  wrapText: boolean;
  autoSave: boolean;
  confirmBeforeApplying: boolean;
  telemetryEnabled: boolean;
}

/**
 * Extension state
 */
export interface ExtensionState {
  initialized: boolean;
  activeSessions: number;
  lastUsed: string;
  version: string;
  telemetryEnabled: boolean;
}

/**
 * AI model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  capabilities: string[];
  contextLength: number;
  isDefault: boolean;
}

/**
 * Session statistics
 */
export interface SessionStats {
  requestCount: number;
  totalTokens: number;
  successRate: number;
  averageLatency: number;
  startTime: string;
  endTime?: string | undefined;
}

/**
 * Error with additional context
 */
export interface ExtendedError extends Error {
  code?: string | undefined;
  details?: Record<string, unknown> | undefined;
  timestamp: string;
  handled: boolean;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  actions?: string[] | undefined;
  duration?: number | undefined;
  dismissable?: boolean | undefined;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  filePath: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  message?: string | undefined;
  timestamp: string;
}

/**
 * Command execution context
 */
export interface CommandContext {
  commandType: CommandType;
  startTime: string;
  endTime?: string | undefined;
  success: boolean;
  errorMessage?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * User interaction event
 */
export interface UserInteractionEvent {
  type: 'click' | 'input' | 'selection' | 'command';
  target: string;
  value?: string | undefined;
  timestamp: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  requestLatency: number;
  processingTime: number;
  renderTime: number;
  totalTime: number;
  memoryUsage?: number | undefined;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  provider?: AIProvider | undefined;
  expiresAt?: string | undefined;
  scopes?: string[] | undefined;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  enableStreaming: boolean;
  enableTelemetry: boolean;
  enableBetaFeatures: boolean;
  maxContextLength: number;
  maxTokensPerRequest: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: string;
  expiresAt?: string | undefined;
  tags?: string[] | undefined;
}

/**
 * Workspace context
 */
export interface WorkspaceContext {
  workspaceFolders: string[];
  activeFile?: string | undefined;
  selectedText?: string | undefined;
  language?: string | undefined;
  gitBranch?: string | undefined;
}

/**
 * AI request options
 */
export interface AIRequestOptions {
  stream?: boolean | undefined;
  timeout?: number | undefined;
  retries?: number | undefined;
  cache?: boolean | undefined;
  priority?: 'low' | 'normal' | 'high' | undefined;
}

/**
 * AI streaming response
 */
export interface AIStreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: string;
  chunkIndex: number;
}

/**
 * Code action
 */
export interface CodeAction {
  title: string;
  description: string;
  kind: 'refactor' | 'fix' | 'extract' | 'inline' | 'custom';
  isPreferred: boolean;
  edit?: Record<string, unknown> | undefined;
  command?: Record<string, unknown> | undefined;
}

/**
 * Diagnostic information
 */
export interface DiagnosticInfo {
  message: string;
  severity: 'error' | 'warning' | 'information' | 'hint';
  code?: string | undefined;
  source: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Code completion item
 */
export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string | undefined;
  documentation?: string | undefined;
  insertText: string;
  sortText?: string | undefined;
  filterText?: string | undefined;
  preselect?: boolean | undefined;
}

/**
 * Hover information
 */
export interface HoverInfo {
  contents: string[];
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  } | undefined;
}

/**
 * Code lens
 */
export interface CodeLens {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  command?: {
    title: string;
    command: string;
    arguments?: unknown[] | undefined;
  } | undefined;
  isResolved: boolean;
}

/**
 * Document symbol
 */
export interface DocumentSymbol {
  name: string;
  detail?: string | undefined;
  kind: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: DocumentSymbol[] | undefined;
}

/**
 * Reference location
 */
export interface ReferenceLocation {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Rename edit
 */
export interface RenameEdit {
  oldName: string;
  newName: string;
  locations: ReferenceLocation[];
}

/**
 * Signature help
 */
export interface SignatureHelp {
  signatures: {
    label: string;
    documentation?: string | undefined;
    parameters?: { label: string; documentation?: string | undefined }[] | undefined;
  }[];
  activeSignature?: number | undefined;
  activeParameter?: number | undefined;
}

/**
 * Document formatting options
 */
export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace?: boolean | undefined;
  insertFinalNewline?: boolean | undefined;
  trimFinalNewlines?: boolean | undefined;
}

/**
 * Text edit
 */
export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

/**
 * Document link
 */
export interface DocumentLink {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  target?: string | undefined;
  tooltip?: string | undefined;
}

/**
 * Color information
 */
export interface ColorInformation {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  color: { red: number; green: number; blue: number; alpha: number };
}

/**
 * Folding range
 */
export interface FoldingRange {
  startLine: number;
  endLine: number;
  kind?: string | undefined;
}

/**
 * Selection range
 */
export interface SelectionRange {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  parent?: SelectionRange | undefined;
}

/**
 * Call hierarchy item
 */
export interface CallHierarchyItem {
  name: string;
  kind: string;
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Semantic token
 */
export interface SemanticToken {
  line: number;
  character: number;
  length: number;
  tokenType: number;
  tokenModifiers: number;
}

/**
 * Linked editing range
 */
export interface LinkedEditingRange {
  ranges: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  }[];
  wordPattern?: string | undefined;
}

/**
 * Inlay hint
 */
export interface InlayHint {
  position: { line: number; character: number };
  label: string;
  kind?: string | undefined;
  tooltip?: string | undefined;
}

/**
 * Type hierarchy item
 */
export interface TypeHierarchyItem {
  name: string;
  kind: string;
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Inline value
 */
export interface InlineValue {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  text: string;
}

/**
 * Document diagnostic report
 */
export interface DocumentDiagnosticReport {
  kind: 'full' | 'unchanged';
  resultId?: string | undefined;
  items?: DiagnosticInfo[] | undefined;
}

/**
 * Notebook cell
 */
export interface NotebookCell {
  kind: 'code' | 'markdown';
  value: string;
  language?: string | undefined;
  outputs?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Notebook document
 */
export interface NotebookDocument {
  uri: string;
  notebookType: string;
  cells: NotebookCell[];
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Terminal options
 */
export interface TerminalOptions {
  name?: string | undefined;
  shellPath?: string | undefined;
  shellArgs?: string[] | undefined;
  cwd?: string | undefined;
  env?: Record<string, string | null | undefined> | undefined;
}

/**
 * Task definition
 */
export interface TaskDefinition {
  type: string;
  label: string;
  command: string;
  args?: string[] | undefined;
  group?: string | undefined;
  problemMatcher?: string[] | undefined;
  presentation?: {
    reveal?: 'always' | 'silent' | 'never' | undefined;
    focus?: boolean | undefined;
    echo?: boolean | undefined;
    panel?: 'shared' | 'dedicated' | 'new' | undefined;
    showReuseMessage?: boolean | undefined;
    clear?: boolean | undefined;
  } | undefined;
}

/**
 * Debug configuration
 */
export interface DebugConfiguration {
  type: string;
  name: string;
  request: 'launch' | 'attach';
  program?: string | undefined;
  args?: string[] | undefined;
  cwd?: string | undefined;
  env?: Record<string, string | null | undefined> | undefined;
  stopOnEntry?: boolean | undefined;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal' | undefined;
}

/**
 * Source control resource state
 */
export interface SourceControlResourceState {
  resourceUri: string;
  command?: {
    title: string;
    command: string;
    arguments?: unknown[] | undefined;
  } | undefined;
  decorations?: {
    strikeThrough?: boolean | undefined;
    faded?: boolean | undefined;
    tooltip?: string | undefined;
    light?: { color?: string | undefined; letter?: string | undefined } | undefined;
    dark?: { color?: string | undefined; letter?: string | undefined } | undefined;
  } | undefined;
}

/**
 * Source control
 */
export interface SourceControl {
  id: string;
  label: string;
  rootUri?: string | undefined;
  count?: number | undefined;
  statusBarCommands?: {
    title: string;
    command: string;
    arguments?: unknown[] | undefined;
  }[] | undefined;
  acceptInputCommand?: {
    title: string;
    command: string;
    arguments?: unknown[] | undefined;
  } | undefined;
}

/**
 * Comment thread
 */
export interface CommentThread {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  comments: {
    author: { name: string };
    body: string;
    mode?: 'preview' | 'editing' | undefined;
    timestamp?: string | undefined;
  }[];
  collapsibleState?: 'collapsed' | 'expanded' | undefined;
}

/**
 * Test item
 */
export interface TestItem {
  id: string;
  label: string;
  uri?: string | undefined;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  } | undefined;
  children?: TestItem[] | undefined;
}

/**
 * Test run
 */
export interface TestRun {
  id: string;
  name?: string | undefined;
  items: { id: string; state: 'queued' | 'running' | 'passed' | 'failed' | 'skipped' | 'errored' }[];
  started: string;
  ended?: string | undefined;
}

/**
 * Custom editor
 */
export interface CustomEditor {
  viewType: string;
  displayName: string;
  priority?: 'default' | 'option' | undefined;
  selector: { filenamePattern?: string | undefined; extension?: string | undefined }[];
}

/**
 * Web view panel
 */
export interface WebviewPanel {
  viewType: string;
  title: string;
  showOptions?: { viewColumn?: 'active' | 'beside' | 'one' | 'two' | 'three' | undefined; preserveFocus?: boolean | undefined } | undefined;
  options?: {
    enableScripts?: boolean | undefined;
    retainContextWhenHidden?: boolean | undefined;
    enableFindWidget?: boolean | undefined;
    localResourceRoots?: string[] | undefined;
  } | undefined;
}

/**
 * Status bar item
 */
export interface StatusBarItem {
  text: string;
  tooltip?: string | undefined;
  command?: string | undefined;
  color?: string | undefined;
  backgroundColor?: string | undefined;
  alignment?: 'left' | 'right' | undefined;
  priority?: number | undefined;
}

/**
 * Tree view
 */
export interface TreeView {
  id: string;
  title: string;
  showCollapseAll?: boolean | undefined;
  canSelectMany?: boolean | undefined;
  message?: string | undefined;
  description?: string | undefined;
}

/**
 * Tree item
 */
export interface TreeItem {
  id: string;
  label: string;
  description?: string | undefined;
  tooltip?: string | undefined;
  iconPath?: string | undefined;
  collapsibleState?: 'collapsed' | 'expanded' | 'none' | undefined;
  command?: {
    title: string;
    command: string;
    arguments?: unknown[] | undefined;
  } | undefined;
}

/**
 * Quick pick item
 */
export interface QuickPickItem {
  label: string;
  description?: string | undefined;
  detail?: string | undefined;
  picked?: boolean | undefined;
  alwaysShow?: boolean | undefined;
}

/**
 * Input box options
 */
export interface InputBoxOptions {
  title?: string | undefined;
  prompt?: string | undefined;
  value?: string | undefined;
  placeHolder?: string | undefined;
  password?: boolean | undefined;
  ignoreFocusOut?: boolean | undefined;
  validateInput?: (value: string) => string | undefined | null | undefined;
}

/**
 * Message options
 */
export interface MessageOptions {
  modal?: boolean | undefined;
  detail?: string | undefined;
}

/**
 * Progress options
 */
export interface ProgressOptions {
  location: 'notification' | 'sourceControl' | 'window';
  title?: string | undefined;
  cancellable?: boolean | undefined;
}

/**
 * File system watcher
 */
export interface FileSystemWatcher {
  ignoreCreateEvents?: boolean | undefined;
  ignoreChangeEvents?: boolean | undefined;
  ignoreDeleteEvents?: boolean | undefined;
  globPattern: string;
}

/**
 * Configuration target
 */
export enum ConfigurationTarget {
  GLOBAL = 1,
  WORKSPACE = 2,
  WORKSPACE_FOLDER = 3
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string, scope?: string | undefined): boolean;
}

/**
 * Text document change event
 */
export interface TextDocumentChangeEvent {
  document: {
    uri: string;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
  };
  contentChanges: {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    rangeOffset: number;
    rangeLength: number;
    text: string;
  }[];
}

/**
 * Text editor selection change event
 */
export interface TextEditorSelectionChangeEvent {
  textEditor: {
    document: {
      uri: string;
      fileName: string;
      languageId: string;
    };
    selection: {
      start: { line: number; character: number };
      end: { line: number; character: number };
      active: { line: number; character: number };
      anchor: { line: number; character: number };
    };
  };
  selections: {
    start: { line: number; character: number };
    end: { line: number; character: number };
    active: { line: number; character: number };
    anchor: { line: number; character: number };
  }[];
}

/**
 * Terminal dimensions
 */
export interface TerminalDimensions {
  columns: number;
  rows: number;
}

/**
 * Terminal link
 */
export interface TerminalLink {
  startIndex: number;
  length: number;
  tooltip?: string | undefined;
}

/**
 * Terminal profile
 */
export interface TerminalProfile {
  path: string;
  args?: string[] | undefined;
  env?: Record<string, string | null | undefined> | undefined;
}

/**
 * Clipboard
 */
export interface Clipboard {
  readText(): Promise<string>;
  writeText(value: string): Promise<void>;
}

/**
 * Environment variable
 */
export interface EnvironmentVariable {
  name: string;
  value: string;
}

/**
 * Extension context
 */
export interface ExtensionContext {
  subscriptions: { dispose(): void }[];
  workspaceState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Promise<void>;
  };
  globalState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    setKeysForSync(keys: string[]): void;
  };
  extensionPath: string;
  storagePath?: string | undefined;
  globalStoragePath: string;
  logPath: string;
  extensionUri: string;
  environmentVariableCollection: {
    persistent: boolean;
    replace(variable: string, value: string): void;
    append(variable: string, value: string): void;
    prepend(variable: string, value: string): void;
    get(variable: string): EnvironmentVariable | undefined;
    forEach(callback: (variable: string, mutator: EnvironmentVariable, collection: unknown) => void): void;
    delete(variable: string): void;
    clear(): void;
  };
}

/**
 * Extension mode
 */
export enum ExtensionMode {
  PRODUCTION = 1,
  DEVELOPMENT = 2,
  TEST = 3
}

/**
 * Extension kind
 */
export enum ExtensionKind {
  UI = 1,
  WORKSPACE = 2
}

/**
 * Extension activation events
 */
export type ExtensionActivationEvent =
  | '*'
  | 'onLanguage:${language}'
  | 'onCommand:${command}'
  | 'onDebug'
  | 'onDebugInitialConfigurations'
  | 'onDebugResolve:${type}'
  | 'onFileSystem:${scheme}'
  | 'onView:${viewId}'
  | 'onUri'
  | 'onWebviewPanel:${viewType}'
  | 'onCustomEditor:${viewType}'
  | 'onStartupFinished'
  | 'onAuthenticationRequest:${providerId}'
  | 'onTerminalProfile:${terminalId}'
  | 'onWalkthrough:${walkthroughID}'
  | 'onTaskType:${taskType}'
  | 'onNotebook:${notebookType}'
  | 'onRenderer:${rendererId}'
  | 'onSearch:${searchContextKey}';

