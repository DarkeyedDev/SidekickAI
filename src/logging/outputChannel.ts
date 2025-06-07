/**
 * Logging and output management for Sidekick AI
 * Provides structured logging with different levels, secure output, and telemetry
 */

import * as vscode from 'vscode';

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
}

/**
 * Telemetry event structure (GDPR compliant)
 */
export interface TelemetryEvent {
  timestamp?: Date;
  provider?: string;
  commandType?: string;
  success?: boolean;
  duration?: number;
  errorType?: string;
}

/**
 * Advanced output channel manager with logging, telemetry, and security features
 */
export class OutputChannelManager {
  private outputChannel: vscode.OutputChannel;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;
  private telemetryEvents: TelemetryEvent[] = [];
  private isDebugMode: boolean = false;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Sidekick AI');
    this.isDebugMode = this.detectDebugMode();
    
    this.info('Sidekick AI output channel initialized', undefined, 'OutputChannel');
  }

  /**
   * Log a message with the specified level
   */
  public log(level: LogLevel, message: string, data?: unknown, source?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: this.sanitizeMessage(message),
      data: this.sanitizeData(data),
      source
    };

    this.addToHistory(entry);
    this.writeToChannel(entry);

    // Also log to console in debug mode
    if (this.isDebugMode) {
      this.logToConsole(entry);
    }
  }

  /**
   * Log debug information (only shown in debug mode)
   */
  public debug(message: string, data?: unknown, source?: string): void {
    if (this.isDebugMode) {
      this.log(LogLevel.DEBUG, message, data, source);
    }
  }

  /**
   * Log informational messages
   */
  public info(message: string, data?: unknown, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log warnings
   */
  public warn(message: string, data?: unknown, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log errors
   */
  public error(message: string, error?: unknown, source?: string): void {
    let errorData: unknown = error;
    
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: this.isDebugMode ? error.stack : undefined
      };
    }

    this.log(LogLevel.ERROR, message, errorData, source);
  }

  /**
   * Log AI service activity
   */
  public logAIActivity(
    provider: string, 
    action: string, 
    success: boolean, 
    duration?: number, 
    details?: Record<string, unknown>
  ): void {
    const message = `AI Activity [${provider}]: ${action} ${success ? 'succeeded' : 'failed'}`;
    const data = {
      provider: provider,
      action,
      success,
      duration,
      ...this.sanitizeData(details)
    };

    if (success) {
      this.info(message, data, 'AIService');
    } else {
      this.error(message, data, 'AIService');
    }
  }

  /**
   * Log file operations
   */
  public logFileOperation(
    operation: string, 
    filePath: string, 
    success: boolean, 
    details?: Record<string, unknown>
  ): void {
    const sanitizedPath = this.sanitizeFilePath(filePath);
    const message = `File Operation: ${operation} on ${sanitizedPath} ${success ? 'succeeded' : 'failed'}`;
    
    if (success) {
      this.info(message, this.sanitizeData(details), 'FileWriter');
    } else {
      this.error(message, this.sanitizeData(details), 'FileWriter');
    }
  }

  /**
   * Log command execution
   */
  public logCommand(commandName: string, success: boolean, duration?: number, error?: unknown): void {
    const message = `Command: ${commandName} ${success ? 'completed' : 'failed'}`;
    const data = {
      command: commandName,
      success,
      duration,
      error: error instanceof Error ? error.message : error
    };

    if (success) {
      this.info(message, data, 'Commands');
    } else {
      this.error(message, data, 'Commands');
    }
  }

  /**
   * Log configuration changes
   */
  public logConfigChange(property: string, oldValue: string, newValue: string): void {
    const message = `Config change: ${property} changed from "${oldValue}" to "${newValue}"`;
    this.info(message, { property, oldValue, newValue }, 'Config');
  }

  /**
   * Log performance metrics
   */
  public logPerformance(
    operation: string,
    startTime: number,
    endTime: number,
    additionalData?: Record<string, unknown>
  ): void {
    const duration = endTime - startTime;
    const message = `Performance: ${operation} completed in ${duration}ms`;
    const data = {
      operation,
      duration,
      ...additionalData
    };
    
    this.debug(message, data, 'Performance');
  }

  /**
   * Record telemetry event (GDPR compliant)
   */
  public recordTelemetry(event: TelemetryEvent): void {
    // Only record if telemetry is enabled
    const config = vscode.workspace.getConfiguration('sidekickAI');
    if (!config.get<boolean>('telemetry.enabled', false)) {
      return;
    }

    // Ensure no PII is included
    const sanitizedEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date(),
      // Remove any potential PII
      provider: event.provider,
      commandType: event.commandType,
      success: event.success,
      duration: event.duration,
      errorType: event.errorType
    };

    this.telemetryEvents.push(sanitizedEvent);
    this.debug('Telemetry event recorded', sanitizedEvent, 'Telemetry');

    // Keep only recent events
    if (this.telemetryEvents.length > 100) {
      this.telemetryEvents = this.telemetryEvents.slice(-100);
    }
  }

  /**
   * Log structured data
   */
  public logStructured(
    category: string,
    event: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `[${category.toUpperCase()}] ${event}: ${status}`;
    
    const data = metadata ? { ...metadata, category, event, success } : { category, event, success };
    
    if (success) {
      this.info(message, data, category);
    } else {
      this.error(message, data, category);
    }
  }

  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  public clear(): void {
    this.outputChannel.clear();
    this.logHistory = [];
    this.info('Output cleared', undefined, 'OutputChannel');
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logHistory.slice(-count);
  }

  /**
   * Get logs by level
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logHistory.filter(entry => entry.level === level);
  }

  /**
   * Export logs for debugging
   */
  public exportLogs(): string {
    const logs = this.logHistory.map(entry => {
      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const source = entry.source ? `[${entry.source}] ` : '';
      const data = entry.data ? ` | Data: ${JSON.stringify(entry.data, null, 2)}` : '';
      
      return `${timestamp} ${level} ${source}${entry.message}${data}`;
    }).join('\n');

    return logs;
  }

  /**
   * Get anonymized telemetry data
   */
  public getTelemetryData(): TelemetryEvent[] {
    return [...this.telemetryEvents];
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.info('Sidekick AI output channel disposing', undefined, 'OutputChannel');
    this.outputChannel.dispose();
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    
    // Keep history size manageable
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  private writeToChannel(entry: LogEntry): void {
    const timestamp = this.getTimestamp();
    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.source ? `[${entry.source}] ` : '';
    
    let output = `[${timestamp}] ${level} ${source}${entry.message}`;
    
    if (entry.data && this.isDebugMode) {
      output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    this.outputChannel.appendLine(output);
  }

  private logToConsole(entry: LogEntry): void {
    const consoleMethod = entry.level === LogLevel.ERROR ? console.error :
                         entry.level === LogLevel.WARN ? console.warn :
                         entry.level === LogLevel.DEBUG ? console.debug :
                         console.log;
    
    const source = entry.source ? `[${entry.source}] ` : '';
    consoleMethod(`[Sidekick AI] ${source}${entry.message}`, entry.data || '');
  }

  private sanitizeMessage(message: string): string {
    // Remove potential API keys, tokens, or other sensitive data
    return message
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
      .replace(/sk-ant-[a-zA-Z0-9-]{20,}/g, 'sk-ant-***')
      .replace(/Bearer\s+[a-zA-Z0-9-._~+/]+=*/g, 'Bearer ***')
      .replace(/token[=:]\s*[a-zA-Z0-9-._~+/]+=*/gi, 'token=***');
  }

  private sanitizeData(data: unknown): unknown {
    if (!data) {
      return data;
    }

    // Convert to string for sanitization if it's an object
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const sanitized = this.sanitizeMessage(dataStr);
    
    try {
      return typeof data === 'string' ? sanitized : JSON.parse(sanitized);
    } catch {
      return sanitized;
    }
  }

  private sanitizeFilePath(filePath: string): string {
    // Show only the filename and parent directory for privacy
    const parts = filePath.split(/[/\\]/);
    if (parts.length <= 2) {
      return filePath;
    }
    return `.../${parts.slice(-2).join('/')}`;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  private getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
  }

  private detectDebugMode(): boolean {
    // Check environment variables
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Check VS Code settings
    try {
      const config = vscode.workspace.getConfiguration('sidekickAI');
      return config.get<boolean>('debug', false);
    } catch {
      return false;
    }
  }
}

// Singleton instance management
let outputManager: OutputChannelManager | undefined;

/**
 * Get or create the singleton output manager
 */
function getOutputManager(): OutputChannelManager {
  if (!outputManager) {
    outputManager = new OutputChannelManager();
  }
  return outputManager;
}

// Exported utility functions for easy access

/**
 * Log a general message to the Sidekick AI output channel
 */
export function logMessage(message: string, data?: unknown, source?: string): void {
  getOutputManager().info(message, data, source);
}

/**
 * Log an error to the Sidekick AI output channel
 */
export function logError(error: Error | string, context?: string): void {
  const manager = getOutputManager();
  if (typeof error === 'string') {
    manager.error(error, undefined, context);
  } else {
    manager.error(context || error.message, error, context);
  }
}

/**
 * Log debug information (only shown in debug mode)
 */
export function logDebug(message: string, data?: unknown, source?: string): void {
  getOutputManager().debug(message, data, source);
}

/**
 * Log a warning message
 */
export function logWarning(message: string, data?: unknown, source?: string): void {
  getOutputManager().warn(message, data, source);
}

/**
 * Log AI service activity with structured format
 */
export function logAIActivity(
  provider: string,
  operation: string,
  success: boolean,
  duration?: number,
  details?: Record<string, unknown>
): void {
  getOutputManager().logAIActivity(provider, operation, success, duration, details);
}

/**
 * Log file operations with structured format
 */
export function logFileOperation(
  operation: string,
  filePath: string,
  success: boolean,
  details?: Record<string, unknown>
): void {
  getOutputManager().logFileOperation(operation, filePath, success, details);
}

/**
 * Log command execution with timing
 */
export function logCommand(
  commandName: string,
  success: boolean,
  duration?: number,
  errorMessage?: string
): void {
  getOutputManager().logCommand(commandName, success, duration, errorMessage);
}

/**
 * Log configuration changes
 */
export function logConfigChange(property: string, oldValue: string, newValue: string): void {
  getOutputManager().logConfigChange(property, oldValue, newValue);
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  startTime: number,
  endTime: number,
  additionalData?: Record<string, unknown>
): void {
  getOutputManager().logPerformance(operation, startTime, endTime, additionalData);
}

/**
 * Log structured data
 */
export function logStructured(
  category: string,
  event: string,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  getOutputManager().logStructured(category, event, success, metadata);
}

/**
 * Record telemetry event
 */
export function recordTelemetry(event: TelemetryEvent): void {
  getOutputManager().recordTelemetry(event);
}

/**
 * Show the Sidekick AI output channel
 */
export function showOutputChannel(): void {
  getOutputManager().show();
}

/**
 * Clear the output channel
 */
export function clearOutputChannel(): void {
  getOutputManager().clear();
}

/**
 * Get recent log entries
 */
export function getRecentLogs(count: number = 50): LogEntry[] {
  return getOutputManager().getRecentLogs(count);
}

/**
 * Get logs by level
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return getOutputManager().getLogsByLevel(level);
}

/**
 * Export logs for debugging
 */
export function exportLogs(): string {
  return getOutputManager().exportLogs();
}

/**
 * Get telemetry data
 */
export function getTelemetryData(): TelemetryEvent[] {
  return getOutputManager().getTelemetryData();
}

/**
 * Dispose of the output channel (call on extension deactivation)
 */
export function disposeOutputChannel(): void {
  if (outputManager) {
    outputManager.dispose();
    outputManager = undefined;
  }
}

/**
 * Enhanced logging class for advanced usage
 */
export class SidekickAILogger {
  private manager: OutputChannelManager;

  constructor() {
    this.manager = getOutputManager();
  }

  /**
   * Log with custom formatting
   */
  public log(level: LogLevel, message: string, data?: Record<string, unknown>, source?: string): void {
    this.manager.log(level, message, data, source);
  }

  /**
   * Log structured data
   */
  public logStructured(
    category: string,
    event: string,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    this.manager.logStructured(category, event, success, metadata);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(
    operation: string,
    startTime: number,
    endTime: number,
    additionalData?: Record<string, unknown>
  ): void {
    this.manager.logPerformance(operation, startTime, endTime, additionalData);
  }

  /**
   * Get the underlying output channel for advanced usage
   */
  public getOutputChannel(): vscode.OutputChannel {
    return (this.manager as any).outputChannel;
  }

  /**
   * Get the underlying manager for advanced usage
   */
  public getManager(): OutputChannelManager {
    return this.manager;
  }
}

/**
 * Create a new logger instance for advanced usage
 */
export function createLogger(): SidekickAILogger {
  return new SidekickAILogger();
}

/**
 * Utility function to wrap async operations with logging
 */
export async function withLogging<T>(
  operation: string,
  asyncFn: () => Promise<T>,
  context?: string
): Promise<T> {
  const startTime = Date.now();
  const fullContext = context ? `${context} - ${operation}` : operation;
  
  try {
    logDebug(`Starting: ${fullContext}`);
    const result = await asyncFn();
    const duration = Date.now() - startTime;
    logMessage(`Completed: ${fullContext}`, { duration }, context);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error instanceof Error ? error : new Error(String(error)), 
             `Failed: ${fullContext} after ${duration}ms`);
    throw error;
  }
}

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safe error logging that handles non-Error objects
 */
export function logSafeError(error: unknown, context?: string): void {
  if (isError(error)) {
    logError(error, context);
  } else {
    logError(new Error(String(error)), context);
  }
}