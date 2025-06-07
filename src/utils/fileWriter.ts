/**
 * File Writer - Comprehensive file editing system for VS Code extensions
 * Handles AI-generated code application with previews, confirmations, change tracking, and undo capabilities
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Types of file edits that can be performed
 */
export enum EditType {
  CREATE = 'create',
  REPLACE = 'replace', 
  INSERT = 'insert',
  MODIFY = 'modify',
  DELETE = 'delete'
}

/**
 * Change status tracking
 */
export enum ChangeStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Command types for categorizing changes
 */
export enum CommandType {
  AI_GENERATED = 'ai_generated',
  USER_REQUESTED = 'user_requested',
  REFACTOR = 'refactor',
  FIX = 'fix',
  ENHANCEMENT = 'enhancement'
}

/**
 * Request to edit a file with AI-generated content
 */
export interface FileEditRequest {
  filePath: string;
  editType: EditType;
  newContent: string;
  originalContent?: string | undefined;
  insertionPoint?: vscode.Position | undefined;
  replaceRange?: vscode.Range | undefined;
  description: string;
  reasoning?: string | undefined;
  commandType: CommandType;
}

/**
 * Tracked file change with history
 */
export interface FileChange {
  id: string;
  filePath: string;
  originalContent: string;
  newContent: string;
  changeType: EditType;
  description: string;
  timestamp: Date;
  status: ChangeStatus;
  commandType: CommandType;
  reasoning?: string | undefined;
}

/**
 * Range of text that was modified
 */
export interface ModifiedRange {
  start: vscode.Position;
  end: vscode.Position;
  originalText: string;
  newText: string;
}

/**
 * Result of a file edit operation
 */
export interface FileEditResult {
  success: boolean;
  filePath: string;
  editType: EditType;
  modifiedRanges: ModifiedRange[];
  message: string;
  dryRun: boolean;
  previewShown: boolean;
  userConfirmed: boolean;
  changeId?: string | undefined;
}

/**
 * Preview information for an edit
 */
export interface EditPreview {
  filePath: string;
  editType: EditType;
  description: string;
  isDestructive: boolean;
  originalContent: string;
  newContent: string;
  diffSummary: string;
  estimatedChanges: number;
}

/**
 * Change preview with undo information
 */
export interface ChangePreview {
  id: string;
  title: string;
  description: string;
  filePath: string;
  changeType: EditType;
  preview: string;
  isDestructive: boolean;
  canUndo: boolean;
}

/**
 * Options for file edit operations
 */
export interface FileEditOptions {
  dryRun?: boolean | undefined;
  showPreview?: boolean | undefined;
  askConfirmation?: boolean | undefined;
  autoConfirmNonDestructive?: boolean | undefined;
  preserveFormatting?: boolean | undefined;
  trackChanges?: boolean | undefined;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Simple logger interface for compatibility
 */
export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
  logFileOperation(operation: string, filePath: string, success: boolean, data?: any): void;
}

/**
 * Default console logger implementation
 */
class ConsoleLogger implements Logger {
  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data || '');
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error || '');
  }

  logFileOperation(operation: string, filePath: string, success: boolean, data?: any): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    console.log(`[${status}] ${operation}: ${filePath}`, data || '');
  }
}

/**
 * Main FileWriter class combining AI-generated content handling with change tracking
 */
export class FileWriter {
  private logger: Logger;
  private changeHistory: FileChange[] = [];
  private pendingChanges: FileChange[] = [];
  private maxHistorySize = 100;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger();
  }

  /**
   * Apply AI-generated code to a file with preview and confirmation
   */
  public async applyAIGeneratedCode(
    request: FileEditRequest,
    options: FileEditOptions = {}
  ): Promise<FileEditResult> {
    const {
      dryRun = false,
      showPreview = true,
      askConfirmation = true,
      autoConfirmNonDestructive = false,
      preserveFormatting = true,
      trackChanges = true
    } = options;

    try {
      // Validate the request
      const validation = this.validateEditRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          filePath: request.filePath,
          editType: request.editType,
          modifiedRanges: [],
          message: `Validation failed: ${validation.errors.join(', ')}`,
          dryRun,
          previewShown: false,
          userConfirmed: false
        };
      }

      // Prepare the edit content
      const preparedContent = preserveFormatting 
        ? await this.preserveFileFormatting(request)
        : request.newContent;

      // Generate preview
      const preview = await this.generateEditPreview({
        ...request,
        newContent: preparedContent
      });

      let previewShown = false;
      let userConfirmed = false;

      // Show preview if requested
      if (showPreview) {
        await this.showEditPreview(preview);
        previewShown = true;
      }

      // Get user confirmation if needed
      if (askConfirmation) {
        const shouldAutoConfirm = autoConfirmNonDestructive && !preview.isDestructive;
        
        if (!shouldAutoConfirm) {
          userConfirmed = await this.confirmEdit(preview);
          if (!userConfirmed) {
            return {
              success: false,
              filePath: request.filePath,
              editType: request.editType,
              modifiedRanges: [],
              message: 'User cancelled the operation',
              dryRun,
              previewShown,
              userConfirmed: false
            };
          }
        } else {
          userConfirmed = true;
        }
      } else {
        userConfirmed = true;
      }

      // Create change tracking if enabled
      let changeId: string | undefined;
      if (trackChanges) {
        const change = await this.createChange({
          ...request,
          newContent: preparedContent
        });
        changeId = change.id;
      }

      // Apply the edit
      if (dryRun) {
        const simulatedRanges = await this.simulateEdit(request);
        return {
          success: true,
          filePath: request.filePath,
          editType: request.editType,
          modifiedRanges: simulatedRanges,
          message: `Dry run completed: ${simulatedRanges.length} ranges would be modified`,
          dryRun: true,
          previewShown,
          userConfirmed,
          changeId
        };
      } else {
        const modifiedRanges = await this.applyEdit({
          ...request,
          newContent: preparedContent
        });

        // Mark change as applied if tracking
        if (changeId) {
          await this.applyChange(changeId, false);
        }

        return {
          success: true,
          filePath: request.filePath,
          editType: request.editType,
          modifiedRanges,
          message: `Successfully applied ${request.editType} to ${path.basename(request.filePath)}`,
          dryRun: false,
          previewShown,
          userConfirmed,
          changeId
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        filePath: request.filePath,
        editType: request.editType,
        modifiedRanges: [],
        message: `Failed to apply edit: ${errorMessage}`,
        dryRun,
        previewShown: false,
        userConfirmed: false
      };
    }
  }

  /**
   * Create a new file with the specified content
   */
  public async createFile(
    filePath: string, 
    content: string, 
    description: string,
    commandType: CommandType,
    reasoning?: string | undefined
  ): Promise<FileChange> {
    const change: FileChange = {
      id: this.generateChangeId(),
      filePath,
      originalContent: '',
      newContent: content,
      changeType: EditType.CREATE,
      description,
      timestamp: new Date(),
      status: ChangeStatus.PENDING,
      commandType,
      reasoning
    };

    this.pendingChanges.push(change);
    this.logger.info(`File creation queued: ${path.basename(filePath)}`, { changeId: change.id });
    
    return change;
  }

  /**
   * Modify an existing file
   */
  public async modifyFile(
    filePath: string,
    newContent: string,
    description: string,
    commandType: CommandType,
    reasoning?: string | undefined
  ): Promise<FileChange> {
    let originalContent = '';
    
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      originalContent = document.getText();
    } catch (error) {
      this.logger.warn(`Could not read original content for ${filePath}`, { error });
    }

    const change: FileChange = {
      id: this.generateChangeId(),
      filePath,
      originalContent,
      newContent,
      changeType: EditType.MODIFY,
      description,
      timestamp: new Date(),
      status: ChangeStatus.PENDING,
      commandType,
      reasoning
    };

    this.pendingChanges.push(change);
    this.logger.info(`File modification queued: ${path.basename(filePath)}`, { changeId: change.id });
    
    return change;
  }

  /**
   * Delete a file
   */
  public async deleteFile(
    filePath: string,
    description: string,
    commandType: CommandType,
    reasoning?: string | undefined
  ): Promise<FileChange> {
    let originalContent = '';
    
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      originalContent = document.getText();
    } catch (error) {
      this.logger.warn(`Could not read content before deletion for ${filePath}`, { error });
    }

    const change: FileChange = {
      id: this.generateChangeId(),
      filePath,
      originalContent,
      newContent: '',
      changeType: EditType.DELETE,
      description,
      timestamp: new Date(),
      status: ChangeStatus.PENDING,
      commandType,
      reasoning
    };

    this.pendingChanges.push(change);
    this.logger.info(`File deletion queued: ${path.basename(filePath)}`, { changeId: change.id });
    
    return change;
  }

  /**
   * Create a change from an edit request
   */
  private async createChange(request: FileEditRequest): Promise<FileChange> {
    let originalContent = '';
    
    if (request.editType !== EditType.CREATE) {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
        originalContent = document.getText();
      } catch (error) {
        this.logger.warn(`Could not read original content for ${request.filePath}`, { error });
      }
    }

    const change: FileChange = {
      id: this.generateChangeId(),
      filePath: request.filePath,
      originalContent: request.originalContent || originalContent,
      newContent: request.newContent,
      changeType: request.editType,
      description: request.description,
      timestamp: new Date(),
      status: ChangeStatus.PENDING,
      commandType: request.commandType,
      reasoning: request.reasoning
    };

    this.pendingChanges.push(change);
    this.logger.info(`Change created: ${path.basename(request.filePath)}`, { changeId: change.id });
    
    return change;
  }

  /**
   * Apply a pending change
   */
  public async applyChange(changeId: string, dryRun: boolean = false): Promise<boolean> {
    const change = this.pendingChanges.find(c => c.id === changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    if (dryRun) {
      this.logger.info(`Dry run: Would apply change ${changeId}`, {
        changeType: change.changeType,
        filePath: change.filePath
      });
      return true;
    }

    try {
      const success = await this.executeChange(change);
      
      if (success) {
        change.status = ChangeStatus.APPLIED;
        this.moveToHistory(change);
        this.logger.logFileOperation(
          `${change.changeType} file`,
          change.filePath,
          true,
          { changeId: change.id, description: change.description }
        );
      } else {
        change.status = ChangeStatus.FAILED;
      }

      return success;
    } catch (error) {
      change.status = ChangeStatus.FAILED;
      this.logger.logFileOperation(
        `${change.changeType} file`,
        change.filePath,
        false,
        { changeId: change.id, error: error instanceof Error ? error.message : error }
      );
      return false;
    }
  }

  /**
   * Apply all pending changes
   */
  public async applyAllChanges(dryRun: boolean = false): Promise<{ successful: number; failed: number }> {
    const changes = [...this.pendingChanges];
    let successful = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        const success = await this.applyChange(change.id, dryRun);
        if (success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to apply change ${change.id}`, error);
      }
    }

    this.logger.info(`Applied ${successful} changes, ${failed} failed`, { dryRun });
    return { successful, failed };
  }

  /**
   * Cancel a pending change
   */
  public cancelChange(changeId: string): boolean {
    const index = this.pendingChanges.findIndex(c => c.id === changeId);
    if (index === -1) {
      return false;
    }

    const change = this.pendingChanges[index];
    change.status = ChangeStatus.CANCELLED;
    this.pendingChanges.splice(index, 1);
    
    this.logger.info(`Change cancelled: ${changeId}`, { filePath: change.filePath });
    return true;
  }

  /**
   * Clear all pending changes
   */
  public clearPendingChanges(): number {
    const count = this.pendingChanges.length;
    this.pendingChanges.forEach(change => {
      change.status = ChangeStatus.CANCELLED;
    });
    this.pendingChanges = [];
    
    this.logger.info(`Cleared ${count} pending changes`);
    return count;
  }

  /**
   * Get preview of a change
   */
  public getChangePreview(changeId: string): ChangePreview | undefined {
    const change = this.pendingChanges.find(c => c.id === changeId);
    if (!change) {
      return undefined;
    }

    const isDestructive = change.changeType === EditType.DELETE || 
                         (change.changeType === EditType.MODIFY && change.originalContent.length > change.newContent.length * 2);

    return {
      id: change.id,
      title: `${change.changeType.toUpperCase()}: ${path.basename(change.filePath)}`,
      description: change.description,
      filePath: change.filePath,
      changeType: change.changeType,
      preview: this.generatePreviewText(change),
      isDestructive,
      canUndo: change.changeType !== EditType.CREATE
    };
  }

  /**
   * Get all pending changes
   */
  public getPendingChanges(): FileChange[] {
    return [...this.pendingChanges];
  }

  /**
   * Get change history
   */
  public getChangeHistory(limit: number = 50): FileChange[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Undo a previously applied change
   */
  public async undoChange(changeId: string): Promise<boolean> {
    const change = this.changeHistory.find(c => c.id === changeId);
    if (!change || change.status !== ChangeStatus.APPLIED) {
      return false;
    }

    try {
      let success = false;

      switch (change.changeType) {
        case EditType.CREATE:
          // Delete the created file
          success = await this.deleteFilePhysically(change.filePath);
          break;
        case EditType.MODIFY:
          // Restore original content
          success = await this.writeFileContent(change.filePath, change.originalContent);
          break;
        case EditType.DELETE:
          // Recreate the deleted file
          success = await this.writeFileContent(change.filePath, change.originalContent);
          break;
      }

      if (success) {
        this.logger.logFileOperation(
          `undo ${change.changeType}`,
          change.filePath,
          true,
          { originalChangeId: change.id }
        );
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to undo change ${changeId}`, error);
      return false;
    }
  }

  /**
   * Validate a change or edit request
   */
  public validateChange(changeId: string): ValidationResult {
    const change = this.pendingChanges.find(c => c.id === changeId);
    if (!change) {
      return {
        isValid: false,
        errors: ['Change not found'],
        warnings: []
      };
    }

    return this.validateFileChange(change);
  }

  /**
   * Validate an edit request
   */
  private validateEditRequest(request: FileEditRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.filePath) {
      errors.push('File path is required');
    }

    if (!request.newContent && request.editType !== EditType.DELETE) {
      errors.push('New content is required for non-delete operations');
    }

    if (!request.description) {
      errors.push('Description is required');
    }

    if (request.editType === EditType.REPLACE && !request.replaceRange && !request.originalContent) {
      errors.push('Replace operations require either a range or original content');
    }

    // Check file size for large modifications
    if (request.newContent && request.newContent.length > 1000000) { // 1MB
      warnings.push('This is a very large file modification');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a file change
   */
  private validateFileChange(change: FileChange): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file path validity
    if (!change.filePath || change.filePath.trim() === '') {
      errors.push('File path is empty');
    }

    // Check for potentially dangerous operations
    if (change.changeType === EditType.DELETE) {
      warnings.push('This operation will permanently delete the file');
    }

    // Check file size for large modifications
    if (change.newContent.length > 1000000) { // 1MB
      warnings.push('This is a very large file modification');
    }

    // Check if file exists for modifications
    if (change.changeType === EditType.MODIFY) {
      try {
        const uri = vscode.Uri.file(change.filePath);
        vscode.workspace.fs.stat(uri);
      } catch {
        errors.push('File does not exist and cannot be modified');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Preview and Edit Methods

  /**
   * Generate a preview of the proposed edit
   */
  private async generateEditPreview(request: FileEditRequest): Promise<EditPreview> {
    let originalContent = '';
    let newContent = request.newContent;

    // Get original content based on edit type
    switch (request.editType) {
      case EditType.CREATE:
        originalContent = '';
        break;
        
      case EditType.REPLACE:
      case EditType.MODIFY:
      case EditType.DELETE:
        if (request.originalContent) {
          originalContent = request.originalContent;
        } else {
          try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
            originalContent = document.getText();
          } catch {
            originalContent = '';
          }
        }
        break;
        
      case EditType.INSERT:
        try {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
          originalContent = document.getText();
          
          if (request.insertionPoint) {
            // Insert new content at specified position
            const lines = originalContent.split('\n');
            const insertLine = Math.min(request.insertionPoint.line, lines.length);
            lines.splice(insertLine, 0, newContent);
            newContent = lines.join('\n');
          } else {
            // Append to end
            newContent = originalContent + (originalContent.endsWith('\n') ? '' : '\n') + newContent;
          }
        } catch {
          originalContent = '';
        }
        break;
    }

    // Calculate diff summary
    const diffSummary = this.calculateDiffSummary(originalContent, newContent);
    
    // Determine if this is a destructive change
    const isDestructive = this.isDestructiveChange(request.editType, originalContent, newContent);
    
    // Count estimated changes
    const estimatedChanges = this.countChanges(originalContent, newContent);

    return {
      filePath: request.filePath,
      editType: request.editType,
      description: request.description,
      isDestructive,
      originalContent,
      newContent,
      diffSummary,
      estimatedChanges
    };
  }

  /**
   * Show edit preview using VS Code's diff editor
   */
  private async showEditPreview(preview: EditPreview): Promise<void> {
    try {
      const fileName = path.basename(preview.filePath);
      const originalUri = vscode.Uri.parse(`untitled:${fileName} (Original)`);
      const modifiedUri = vscode.Uri.parse(`untitled:${fileName} (Modified)`);

      // Create temporary documents for diff view
      const originalDoc = await vscode.workspace.openTextDocument(originalUri.with({
        scheme: 'sidekick-ai-original',
        query: encodeURIComponent(preview.originalContent)
      }));

      const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri.with({
        scheme: 'sidekick-ai-modified', 
        query: encodeURIComponent(preview.newContent)
      }));

      // Show diff editor
      await vscode.commands.executeCommand(
        'vscode.diff',
        originalDoc.uri,
        modifiedDoc.uri,
        `FileWriter: ${preview.description}`,
        { preview: true }
      );

    } catch (error) {
      // Fallback to text preview if diff fails
      await this.showTextPreview(preview);
    }
  }

  /**
   * Show text-based preview as fallback
   */
  private async showTextPreview(preview: EditPreview): Promise<void> {
    const previewContent = `# FileWriter Edit Preview

**File:** ${preview.filePath}
**Type:** ${preview.editType.toUpperCase()}
**Description:** ${preview.description}
**Destructive:** ${preview.isDestructive ? 'YES' : 'No'}
**Estimated Changes:** ${preview.estimatedChanges}

## Summary
${preview.diffSummary}

## New Content
\`\`\`
${preview.newContent}
\`\`\`

---
*This is a preview. No changes have been applied yet.*`;

    const document = await vscode.workspace.openTextDocument({
      content: previewContent,
      language: 'markdown'
    });

    await vscode.window.showTextDocument(document, { preview: true });
  }

  /**
   * Ask user for confirmation before applying edit
   */
  private async confirmEdit(preview: EditPreview): Promise<boolean> {
    const fileName = path.basename(preview.filePath);
    const actionText = preview.isDestructive ? 'DESTRUCTIVE EDIT' : 'Apply Edit';
    
    const message = preview.isDestructive
      ? `⚠️ ${actionText}: ${preview.description}\n\nThis will make significant changes to ${fileName}. Continue?`
      : `${actionText}: ${preview.description}\n\nApply changes to ${fileName}?`;

    const options = ['Apply', 'Cancel'];
    if (!preview.isDestructive) {
      options.unshift('Preview Again');
    }

    const result = await vscode.window.showWarningMessage(
      message,
      { modal: preview.isDestructive },
      ...options
    );

    if (result === 'Preview Again') {
      await this.showEditPreview(preview);
      return await this.confirmEdit(preview); // Recursive call for re-confirmation
    }

    return result === 'Apply';
  }

  /**
   * Apply the edit to the file
   */
  private async applyEdit(request: FileEditRequest): Promise<ModifiedRange[]> {
    const uri = vscode.Uri.file(request.filePath);
    const edit = new vscode.WorkspaceEdit();
    const modifiedRanges: ModifiedRange[] = [];

    switch (request.editType) {
      case EditType.CREATE:
        // Create new file
        edit.createFile(uri, { ignoreIfExists: false });
        edit.insert(uri, new vscode.Position(0, 0), request.newContent);
        
        modifiedRanges.push({
          start: new vscode.Position(0, 0),
          end: this.getEndPosition(request.newContent),
          originalText: '',
          newText: request.newContent
        });
        break;

      case EditType.REPLACE:
        if (request.replaceRange) {
          edit.replace(uri, request.replaceRange, request.newContent);
          
          modifiedRanges.push({
            start: request.replaceRange.start,
            end: request.replaceRange.end,
            originalText: request.originalContent || '',
            newText: request.newContent
          });
        } else {
          // Replace entire file
          const document = await vscode.workspace.openTextDocument(uri);
          const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            document.lineAt(document.lineCount - 1).range.end
          );
          
          edit.replace(uri, fullRange, request.newContent);
          
          modifiedRanges.push({
            start: fullRange.start,
            end: fullRange.end,
            originalText: document.getText(),
            newText: request.newContent
          });
        }
        break;

      case EditType.INSERT:
        const insertPosition = request.insertionPoint || new vscode.Position(0, 0);
        edit.insert(uri, insertPosition, request.newContent);
        
        modifiedRanges.push({
          start: insertPosition,
          end: insertPosition,
          originalText: '',
          newText: request.newContent
        });
        break;

      case EditType.MODIFY:
        // For modify, we need to calculate the specific changes
        const document = await vscode.workspace.openTextDocument(uri);
        const originalText = document.getText();
        const changes = this.calculateLineChanges(originalText, request.newContent);
        
        for (const change of changes) {
          if (change.type === 'replace') {
            edit.replace(uri, change.range, change.newText);
            modifiedRanges.push({
              start: change.range.start,
              end: change.range.end,
              originalText: change.originalText,
              newText: change.newText
            });
          } else if (change.type === 'insert') {
            edit.insert(uri, change.position, change.newText);
            modifiedRanges.push({
              start: change.position,
              end: change.position,
              originalText: '',
              newText: change.newText
            });
          }
        }
        break;

      case EditType.DELETE:
        if (request.replaceRange) {
          edit.delete(uri, request.replaceRange);
          modifiedRanges.push({
            start: request.replaceRange.start,
            end: request.replaceRange.end,
            originalText: request.originalContent || '',
            newText: ''
          });
        } else {
          // Delete entire file
          edit.deleteFile(uri, { ignoreIfNotExists: false });
        }
        break;
    }

    // Apply the edit
    const success = await vscode.workspace.applyEdit(edit);
    
    if (!success) {
      throw new Error('Failed to apply workspace edit');
    }

    // Show the modified file
    if (request.editType !== EditType.DELETE) {
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
        
        // Highlight the modified ranges
        if (modifiedRanges.length > 0) {
          await this.highlightModifiedRanges(document, modifiedRanges);
        }
      } catch (error) {
        console.warn('Failed to show modified document:', error);
      }
    }

    return modifiedRanges;
  }

  /**
   * Simulate an edit without applying it
   */
  private async simulateEdit(request: FileEditRequest): Promise<ModifiedRange[]> {
    const modifiedRanges: ModifiedRange[] = [];
    
    switch (request.editType) {
      case EditType.CREATE:
        modifiedRanges.push({
          start: new vscode.Position(0, 0),
          end: this.getEndPosition(request.newContent),
          originalText: '',
          newText: request.newContent
        });
        break;
        
      case EditType.REPLACE:
        if (request.replaceRange) {
          modifiedRanges.push({
            start: request.replaceRange.start,
            end: request.replaceRange.end,
            originalText: request.originalContent || '',
            newText: request.newContent
          });
        } else {
          try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
            modifiedRanges.push({
              start: new vscode.Position(0, 0),
              end: document.lineAt(document.lineCount - 1).range.end,
              originalText: document.getText(),
              newText: request.newContent
            });
          } catch {
            modifiedRanges.push({
              start: new vscode.Position(0, 0),
              end: new vscode.Position(0, 0),
              originalText: '',
              newText: request.newContent
            });
          }
        }
        break;
        
      case EditType.INSERT:
        const insertPosition = request.insertionPoint || new vscode.Position(0, 0);
        modifiedRanges.push({
          start: insertPosition,
          end: insertPosition,
          originalText: '',
          newText: request.newContent
        });
        break;
        
      case EditType.MODIFY:
        try {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
          const originalText = document.getText();
          const changes = this.calculateLineChanges(originalText, request.newContent);
          
          for (const change of changes) {
            if (change.type === 'replace') {
              modifiedRanges.push({
                start: change.range.start,
                end: change.range.end,
                originalText: change.originalText,
                newText: change.newText
              });
            } else if (change.type === 'insert') {
              modifiedRanges.push({
                start: change.position,
                end: change.position,
                originalText: '',
                newText: change.newText
              });
            }
          }
        } catch {
          modifiedRanges.push({
            start: new vscode.Position(0, 0),
            end: new vscode.Position(0, 0),
            originalText: '',
            newText: request.newContent
          });
        }
        break;
        
      case EditType.DELETE:
        if (request.replaceRange) {
          modifiedRanges.push({
            start: request.replaceRange.start,
            end: request.replaceRange.end,
            originalText: request.originalContent || '',
            newText: ''
          });
        } else {
          try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(request.filePath));
            modifiedRanges.push({
              start: new vscode.Position(0, 0),
              end: document.lineAt(document.lineCount - 1).range.end,
              originalText: document.getText(),
              newText: ''
            });
          } catch {
            // File doesn't exist, can't simulate deletion
          }
        }
        break;
    }
    
    return modifiedRanges;
  }

  /**
   * Execute a file change
   */
  private async executeChange(change: FileChange): Promise<boolean> {
    const uri = vscode.Uri.file(change.filePath);
    
    try {
      switch (change.changeType) {
        case EditType.CREATE:
          await this.writeFileContent(change.filePath, change.newContent);
          break;
          
        case EditType.MODIFY:
        case EditType.REPLACE:
          await this.writeFileContent(change.filePath, change.newContent);
          break;
          
        case EditType.DELETE:
          await this.deleteFilePhysically(change.filePath);
          break;
          
        case EditType.INSERT:
          // For insert, we need to read the file first
          try {
            const document = await vscode.workspace.openTextDocument(uri);
            const originalContent = document.getText();
            const lines = originalContent.split('\n');
            
            // Insert at the beginning by default
            let insertLine = 0;
            
            // Try to find a good insertion point
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim() === '') {
                insertLine = i;
                break;
              }
            }
            
            lines.splice(insertLine, 0, change.newContent);
            await this.writeFileContent(change.filePath, lines.join('\n'));
          } catch (error) {
            // If file doesn't exist, create it with the new content
            await this.writeFileContent(change.filePath, change.newContent);
          }
          break;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to execute change: ${change.id}`, error);
      return false;
    }
  }

  /**
   * Write content to a file
   */
  private async writeFileContent(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
    
    // Write file content
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
  }

  /**
   * Delete a file
   */
  private async deleteFilePhysically(filePath: string): Promise<boolean> {
    try {
      const uri = vscode.Uri.file(filePath);
      await vscode.workspace.fs.delete(uri, { useTrash: false });
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Move a change from pending to history
   */
  private moveToHistory(change: FileChange): void {
    const index = this.pendingChanges.findIndex(c => c.id === change.id);
    if (index !== -1) {
      this.pendingChanges.splice(index, 1);
    }
    
    this.changeHistory.push(change);
    
    // Trim history if it gets too large
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate a unique change ID
   */
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Calculate line changes between original and new content
   */
  private calculateLineChanges(originalContent: string, newContent: string): Array<
    { type: 'replace'; range: vscode.Range; originalText: string; newText: string } |
    { type: 'insert'; position: vscode.Position; newText: string }
  > {
    // Simple implementation - replace entire content
    // A more sophisticated diff algorithm could be used here
    return [{
      type: 'replace',
      range: new vscode.Range(
        new vscode.Position(0, 0),
        this.getEndPosition(originalContent)
      ),
      originalText: originalContent,
      newText: newContent
    }];
  }

  /**
   * Get the end position of a text string
   */
  private getEndPosition(text: string): vscode.Position {
    const lines = text.split('\n');
    const lastLineIndex = Math.max(0, lines.length - 1);
    const lastLineLength = lines[lastLineIndex].length;
    return new vscode.Position(lastLineIndex, lastLineLength);
  }

  /**
   * Calculate a summary of differences between two texts
   */
  private calculateDiffSummary(originalContent: string, newContent: string): string {
    const originalLines = originalContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    const lineDiff = newLines - originalLines;
    
    const originalChars = originalContent.length;
    const newChars = newContent.length;
    const charDiff = newChars - originalChars;
    
    let summary = '';
    
    if (lineDiff !== 0) {
      summary += `${lineDiff > 0 ? '+' : ''}${lineDiff} lines, `;
    }
    
    summary += `${charDiff > 0 ? '+' : ''}${charDiff} characters`;
    
    return summary;
  }

  /**
   * Count the number of changes between two texts
   */
  private countChanges(originalContent: string, newContent: string): number {
    // Simple implementation - count line differences
    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    
    let changes = 0;
    const maxLines = Math.max(originalLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = i < originalLines.length ? originalLines[i] : '';
      const newLine = i < newLines.length ? newLines[i] : '';
      
      if (originalLine !== newLine) {
        changes++;
      }
    }
    
    return changes;
  }

  /**
   * Determine if a change is destructive
   */
  private isDestructiveChange(editType: EditType, originalContent: string, newContent: string): boolean {
    if (editType === EditType.DELETE) {
      return true;
    }
    
    if (editType === EditType.MODIFY || editType === EditType.REPLACE) {
      // Consider it destructive if more than 50% of the content is removed
      const originalLength = originalContent.length;
      const newLength = newContent.length;
      
      if (originalLength > 0 && newLength < originalLength * 0.5) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate a preview text for a change
   */
  private generatePreviewText(change: FileChange): string {
    switch (change.changeType) {
      case EditType.CREATE:
        return `New file with ${change.newContent.length} characters`;
        
      case EditType.DELETE:
        return `Delete file with ${change.originalContent.length} characters`;
        
      case EditType.MODIFY:
      case EditType.REPLACE:
        const diffSummary = this.calculateDiffSummary(change.originalContent, change.newContent);
        return `Modify file: ${diffSummary}`;
        
      case EditType.INSERT:
        return `Insert ${change.newContent.length} characters`;
        
      default:
        return 'Unknown change type';
    }
  }

  /**
   * Highlight modified ranges in the editor
   */
  private async highlightModifiedRanges(document: vscode.TextDocument, ranges: ModifiedRange[]): Promise<void> {
    // This would require a custom decoration provider
    // For now, we'll just move the cursor to the first modified range
    if (ranges.length > 0) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.fsPath === document.uri.fsPath) {
        const firstRange = new vscode.Range(ranges[0].start, ranges[0].end);
        editor.selection = new vscode.Selection(firstRange.start, firstRange.end);
        editor.revealRange(firstRange, vscode.TextEditorRevealType.InCenter);
      }
    }
  }

  /**
   * Preserve formatting when applying changes
   */
  private async preserveFileFormatting(request: FileEditRequest): Promise<string> {
    // This is a placeholder for more sophisticated formatting preservation
    // For now, we just return the new content as-is
    return request.newContent;
  }
}

