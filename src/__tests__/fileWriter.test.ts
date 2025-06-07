/**
 * Unit tests for FileWriter
 */

import * as vscode from 'vscode';
import { FileWriter } from '../utils/fileWriter';
import { OutputChannelManager } from '../logging/outputChannel';
import { CommandType, ChangeStatus } from '../types';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    openTextDocument: jest.fn(),
    fs: {
      writeFile: jest.fn(),
      delete: jest.fn(),
      stat: jest.fn()
    }
  },
  window: {
    showTextDocument: jest.fn()
  },
  Uri: {
    file: jest.fn()
  },
  Position: jest.fn(),
  Selection: jest.fn(),
  FileType: {
    Directory: 2
  }
}));

// Mock OutputChannelManager
jest.mock('../logging/outputChannel');

describe('FileWriter', () => {
  let fileWriter: FileWriter;
  let mockLogger: jest.Mocked<OutputChannelManager>;
  let mockTextDocument: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = new OutputChannelManager() as jest.Mocked<OutputChannelManager>;
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.logFileOperation = jest.fn();

    // Mock text document
    mockTextDocument = {
      fileName: '/test/file.js',
      getText: jest.fn().mockReturnValue('original content')
    };

    // Mock VS Code APIs
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockTextDocument);
    (vscode.Uri.file as jest.Mock).mockImplementation((path: string) => ({ fsPath: path }));
    (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (vscode.workspace.fs.delete as jest.Mock).mockResolvedValue(undefined);
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);

    fileWriter = new FileWriter(mockLogger);
  });

  describe('createFile', () => {
    it('should create a new file change for creation', async () => {
      const filePath = '/test/new-file.js';
      const content = 'new file content';
      const description = 'Create new JavaScript file';

      const change = await fileWriter.createFile(
        filePath,
        content,
        description,
        CommandType.WRITE_CODE,
        'AI reasoning'
      );

      expect(change).toMatchObject({
        filePath,
        originalContent: '',
        newContent: content,
        changeType: 'create',
        description,
        status: ChangeStatus.PENDING,
        commandType: CommandType.WRITE_CODE,
        reasoning: 'AI reasoning'
      });

      expect(change.id).toBeDefined();
      expect(change.timestamp).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'File creation queued: new-file.js',
        { changeId: change.id }
      );
    });

    it('should add change to pending changes list', async () => {
      await fileWriter.createFile(
        '/test/file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const pendingChanges = fileWriter.getPendingChanges();
      expect(pendingChanges).toHaveLength(1);
      expect(pendingChanges[0].changeType).toBe('create');
    });
  });

  describe('modifyFile', () => {
    it('should create a new file change for modification', async () => {
      const filePath = '/test/existing-file.js';
      const newContent = 'modified content';
      const description = 'Update existing file';

      const change = await fileWriter.modifyFile(
        filePath,
        newContent,
        description,
        CommandType.MODIFY_FILE
      );

      expect(change).toMatchObject({
        filePath,
        originalContent: 'original content',
        newContent,
        changeType: 'modify',
        description,
        status: ChangeStatus.PENDING,
        commandType: CommandType.MODIFY_FILE
      });

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        vscode.Uri.file(filePath)
      );
    });

    it('should handle file read errors gracefully', async () => {
      (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(
        new Error('File not found')
      );

      const change = await fileWriter.modifyFile(
        '/test/missing-file.js',
        'content',
        'description',
        CommandType.MODIFY_FILE
      );

      expect(change.originalContent).toBe('');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not read original content for /test/missing-file.js',
        { error: expect.any(Error) }
      );
    });
  });

  describe('deleteFile', () => {
    it('should create a new file change for deletion', async () => {
      const filePath = '/test/file-to-delete.js';
      const description = 'Delete obsolete file';

      const change = await fileWriter.deleteFile(
        filePath,
        description,
        CommandType.MODIFY_FILE
      );

      expect(change).toMatchObject({
        filePath,
        originalContent: 'original content',
        newContent: '',
        changeType: 'delete',
        description,
        status: ChangeStatus.PENDING,
        commandType: CommandType.MODIFY_FILE
      });
    });
  });

  describe('applyChange', () => {
    it('should apply a file creation change', async () => {
      const change = await fileWriter.createFile(
        '/test/new-file.js',
        'new content',
        'Create file',
        CommandType.WRITE_CODE
      );

      const success = await fileWriter.applyChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        vscode.Uri.file('/test/new-file.js'),
        expect.any(Uint8Array)
      );
      expect(vscode.window.showTextDocument).toHaveBeenCalled();

      const pendingChanges = fileWriter.getPendingChanges();
      expect(pendingChanges).toHaveLength(0); // Should be moved to history

      const history = fileWriter.getChangeHistory(10);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(ChangeStatus.APPLIED);
    });

    it('should apply a file modification change', async () => {
      const change = await fileWriter.modifyFile(
        '/test/existing-file.js',
        'modified content',
        'Modify file',
        CommandType.MODIFY_FILE
      );

      const success = await fileWriter.applyChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it('should apply a file deletion change', async () => {
      const change = await fileWriter.deleteFile(
        '/test/file-to-delete.js',
        'Delete file',
        CommandType.MODIFY_FILE
      );

      const success = await fileWriter.applyChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        vscode.Uri.file('/test/file-to-delete.js')
      );
    });

    it('should handle dry run mode', async () => {
      const change = await fileWriter.createFile(
        '/test/dry-run-file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const success = await fileWriter.applyChange(change.id, true);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Dry run: Would apply change ${change.id}`,
        expect.any(Object)
      );
    });

    it('should handle file operation errors', async () => {
      (vscode.workspace.fs.writeFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      const change = await fileWriter.createFile(
        '/test/failed-file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const success = await fileWriter.applyChange(change.id);

      expect(success).toBe(false);
      expect(change.status).toBe(ChangeStatus.FAILED);
    });

    it('should return false for non-existent change', async () => {
      await expect(fileWriter.applyChange('non-existent-id')).rejects.toThrow(
        'Change not found: non-existent-id'
      );
    });
  });

  describe('applyAllChanges', () => {
    it('should apply multiple changes and return statistics', async () => {
      // Create multiple changes
      await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      await fileWriter.modifyFile('/test/file2.js', 'content2', 'desc2', CommandType.MODIFY_FILE);
      await fileWriter.deleteFile('/test/file3.js', 'desc3', CommandType.MODIFY_FILE);

      const result = await fileWriter.applyAllChanges();

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(fileWriter.getPendingChanges()).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      await fileWriter.createFile('/test/file2.js', 'content2', 'desc2', CommandType.WRITE_CODE);

      // Mock failure for second write
      (vscode.workspace.fs.writeFile as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write failed'));

      const result = await fileWriter.applyAllChanges();

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle dry run for all changes', async () => {
      await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      await fileWriter.modifyFile('/test/file2.js', 'content2', 'desc2', CommandType.MODIFY_FILE);

      const result = await fileWriter.applyAllChanges(true);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('cancelChange', () => {
    it('should cancel a pending change', async () => {
      const change = await fileWriter.createFile(
        '/test/file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const success = fileWriter.cancelChange(change.id);

      expect(success).toBe(true);
      expect(fileWriter.getPendingChanges()).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Change cancelled: ${change.id}`,
        { filePath: change.filePath }
      );
    });

    it('should return false for non-existent change', () => {
      const success = fileWriter.cancelChange('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('clearPendingChanges', () => {
    it('should clear all pending changes', async () => {
      await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      await fileWriter.createFile('/test/file2.js', 'content2', 'desc2', CommandType.WRITE_CODE);
      await fileWriter.modifyFile('/test/file3.js', 'content3', 'desc3', CommandType.MODIFY_FILE);

      const count = fileWriter.clearPendingChanges();

      expect(count).toBe(3);
      expect(fileWriter.getPendingChanges()).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Cleared 3 pending changes');
    });
  });

  describe('getChangePreview', () => {
    it('should return preview for create change', async () => {
      const change = await fileWriter.createFile(
        '/test/new-file.js',
        'const x = 1;',
        'Create new file',
        CommandType.WRITE_CODE
      );

      const preview = fileWriter.getChangePreview(change.id);

      expect(preview).toMatchObject({
        id: change.id,
        title: 'CREATE: new-file.js',
        description: 'Create new file',
        filePath: '/test/new-file.js',
        changeType: 'create',
        isDestructive: false,
        canUndo: false
      });
      expect(preview?.preview).toContain('Create new file with 11 characters');
    });

    it('should return preview for modify change', async () => {
      mockTextDocument.getText.mockReturnValue('original content with 25 chars'); // 25 chars

      const change = await fileWriter.modifyFile(
        '/test/file.js',
        'new content with 20 chars', // 26 chars, so +1
        'Update file',
        CommandType.MODIFY_FILE
      );

      const preview = fileWriter.getChangePreview(change.id);

      expect(preview?.preview).toContain('Modify file (+1 characters)');
      expect(preview?.isDestructive).toBe(false);
      expect(preview?.canUndo).toBe(true);
    });

    it('should return preview for delete change', async () => {
      const change = await fileWriter.deleteFile(
        '/test/file.js',
        'Remove file',
        CommandType.MODIFY_FILE
      );

      const preview = fileWriter.getChangePreview(change.id);

      expect(preview?.changeType).toBe('delete');
      expect(preview?.isDestructive).toBe(true);
      expect(preview?.preview).toContain('Delete file');
    });

    it('should return undefined for non-existent change', () => {
      const preview = fileWriter.getChangePreview('non-existent-id');
      expect(preview).toBeUndefined();
    });
  });

  describe('undoChange', () => {
    it('should undo a file creation by deleting the file', async () => {
      const change = await fileWriter.createFile(
        '/test/created-file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      // Apply the change first
      await fileWriter.applyChange(change.id);

      // Now undo it
      const success = await fileWriter.undoChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        vscode.Uri.file('/test/created-file.js')
      );
    });

    it('should undo a file modification by restoring original content', async () => {
      const change = await fileWriter.modifyFile(
        '/test/modified-file.js',
        'new content',
        'description',
        CommandType.MODIFY_FILE
      );

      // Apply the change first
      await fileWriter.applyChange(change.id);

      // Now undo it
      const success = await fileWriter.undoChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        vscode.Uri.file('/test/modified-file.js'),
        expect.any(Uint8Array)
      );
    });

    it('should undo a file deletion by recreating the file', async () => {
      const change = await fileWriter.deleteFile(
        '/test/deleted-file.js',
        'description',
        CommandType.MODIFY_FILE
      );

      // Apply the change first
      await fileWriter.applyChange(change.id);

      // Now undo it
      const success = await fileWriter.undoChange(change.id);

      expect(success).toBe(true);
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        vscode.Uri.file('/test/deleted-file.js'),
        expect.any(Uint8Array)
      );
    });

    it('should return false for non-existent or non-applied change', async () => {
      const change = await fileWriter.createFile(
        '/test/file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      // Try to undo without applying first
      const success = await fileWriter.undoChange(change.id);
      expect(success).toBe(false);

      // Try to undo non-existent change
      const success2 = await fileWriter.undoChange('non-existent-id');
      expect(success2).toBe(false);
    });
  });

  describe('validateChange', () => {
    it('should validate a valid change', async () => {
      const change = await fileWriter.createFile(
        '/test/valid-file.js',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const validation = fileWriter.validateChange(change.id);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect empty file path', async () => {
      const change = await fileWriter.createFile(
        '',
        'content',
        'description',
        CommandType.WRITE_CODE
      );

      const validation = fileWriter.validateChange(change.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File path is empty');
    });

    it('should warn about destructive operations', async () => {
      const change = await fileWriter.deleteFile(
        '/test/file.js',
        'description',
        CommandType.MODIFY_FILE
      );

      const validation = fileWriter.validateChange(change.id);

      expect(validation.warnings).toContain('This operation will permanently delete the file');
    });

    it('should warn about large file modifications', async () => {
      const largeContent = 'x'.repeat(2000000); // 2MB
      const change = await fileWriter.createFile(
        '/test/large-file.js',
        largeContent,
        'description',
        CommandType.WRITE_CODE
      );

      const validation = fileWriter.validateChange(change.id);

      expect(validation.warnings).toContain('This is a very large file modification');
    });

    it('should return error for non-existent change', () => {
      const validation = fileWriter.validateChange('non-existent-id');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Change not found');
    });
  });

  describe('getPendingChanges', () => {
    it('should return all pending changes', async () => {
      await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      await fileWriter.modifyFile('/test/file2.js', 'content2', 'desc2', CommandType.MODIFY_FILE);

      const pending = fileWriter.getPendingChanges();

      expect(pending).toHaveLength(2);
      expect(pending[0].status).toBe(ChangeStatus.PENDING);
      expect(pending[1].status).toBe(ChangeStatus.PENDING);
    });
  });

  describe('getChangeHistory', () => {
    it('should return applied changes from history', async () => {
      const change1 = await fileWriter.createFile('/test/file1.js', 'content1', 'desc1', CommandType.WRITE_CODE);
      const change2 = await fileWriter.createFile('/test/file2.js', 'content2', 'desc2', CommandType.WRITE_CODE);

      await fileWriter.applyChange(change1.id);
      await fileWriter.applyChange(change2.id);

      const history = fileWriter.getChangeHistory(10);

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe(ChangeStatus.APPLIED);
      expect(history[1].status).toBe(ChangeStatus.APPLIED);
    });

    it('should respect history limit', async () => {
      // Create and apply many changes
      for (let i = 0; i < 5; i++) {
        const change = await fileWriter.createFile(`/test/file${i}.js`, 'content', 'desc', CommandType.WRITE_CODE);
        await fileWriter.applyChange(change.id);
      }

      const limitedHistory = fileWriter.getChangeHistory(3);
      expect(limitedHistory).toHaveLength(3);
    });
  });
});