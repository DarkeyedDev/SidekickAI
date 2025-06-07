/**
 * Jest test setup file
 * This file is executed before each test suite
 */

// Mock the VS Code API globally
const mockVSCode = {
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
    openTextDocument: jest.fn(),
    fs: {
      writeFile: jest.fn(),
      readFile: jest.fn(),
      delete: jest.fn(),
      stat: jest.fn(),
      readDirectory: jest.fn()
    },
    workspaceFolders: []
  },
  window: {
    createOutputChannel: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showTextDocument: jest.fn(),
    createStatusBarItem: jest.fn(),
    withProgress: jest.fn(),
    activeTextEditor: undefined,
    createTreeView: jest.fn(),
    createWebviewPanel: jest.fn()
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },
  ProgressLocation: {
    SourceControl: 1,
    Window: 10,
    Notification: 15
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
  },
  Uri: {
    file: jest.fn((path: string) => ({
      scheme: 'file',
      fsPath: path,
      path: path,
      toString: () => `file://${path}`
    })),
    parse: jest.fn()
  },
  Range: jest.fn(),
  Position: jest.fn(),
  Selection: jest.fn(),
  ThemeIcon: jest.fn(),
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3
  },
  env: {
    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn()
    }
  },
  TextEncoder: global.TextEncoder || class TextEncoder {
    encode(str: string): Uint8Array {
      return new Uint8Array(Buffer.from(str, 'utf8'));
    }
  }
};

// Mock vscode module
jest.mock('vscode', () => mockVSCode, { virtual: true });

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    defaults: { headers: {} }
  })),
  post: jest.fn(),
  get: jest.fn()
}));

// Mock vscode-nls for localization
jest.mock('vscode-nls', () => ({
  loadMessageBundle: jest.fn(() => (key: string, ...args: any[]) => {
    // Simple mock that returns the key as the localized string
    return key;
  })
}));

// Global test utilities
global.mockVSCode = mockVSCode;

// Set up console methods to be less noisy during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterEach(() => {
  // Restore console methods
  if (!process.env.DEBUG) {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Helper function to create mock VS Code text document
export function createMockTextDocument(content: string, fileName: string = 'test.js') {
  return {
    fileName,
    languageId: fileName.split('.').pop() || 'javascript',
    lineCount: content.split('\n').length,
    getText: jest.fn(() => content),
    lineAt: jest.fn((line: number) => ({
      lineNumber: line,
      text: content.split('\n')[line] || '',
      range: { start: { line, character: 0 }, end: { line, character: 100 } },
      rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: content.split('\n')[line]?.trim() === ''
    })),
    positionAt: jest.fn((offset: number) => ({ line: 0, character: offset })),
    offsetAt: jest.fn((position: any) => position.character),
    getWordRangeAtPosition: jest.fn(),
    validateRange: jest.fn(),
    validatePosition: jest.fn()
  };
}

// Helper function to create mock VS Code editor
export function createMockTextEditor(document: any, selection?: any) {
  return {
    document,
    selection: selection || {
      active: { line: 0, character: 0 },
      anchor: { line: 0, character: 0 },
      isEmpty: true,
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    },
    selections: [selection || { isEmpty: true }],
    visibleRanges: [],
    options: {},
    viewColumn: 1,
    edit: jest.fn(),
    insertSnippet: jest.fn(),
    setDecorations: jest.fn(),
    revealRange: jest.fn(),
    show: jest.fn(),
    hide: jest.fn()
  };
}

// Helper function to simulate VS Code configuration
export function mockConfiguration(values: Record<string, any>) {
  const config = {
    get: jest.fn((key: string, defaultValue?: any) => {
      return values[key] !== undefined ? values[key] : defaultValue;
    }),
    update: jest.fn(),
    has: jest.fn((key: string) => key in values),
    inspect: jest.fn()
  };
  
  mockVSCode.workspace.getConfiguration = jest.fn(() => config);
  return config;
}

// Helper to create timeout promises for async testing
export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global declarations for TypeScript
declare global {
  var mockVSCode: any;
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithError(expectedError: string): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toHaveBeenCalledWithError(received: jest.Mock, expectedError: string) {
    const pass = received.mock.calls.some(call => 
      call.some(arg => 
        typeof arg === 'string' && arg.includes(expectedError) ||
        (arg instanceof Error && arg.message.includes(expectedError))
      )
    );

    if (pass) {
      return {
        message: () => `Expected mock not to have been called with error containing "${expectedError}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected mock to have been called with error containing "${expectedError}"`,
        pass: false,
      };
    }
  },
});

export { mockConfiguration, createMockTextDocument, createMockTextEditor, timeout };