# Contributing to Sidekick AI

We welcome contributions to Sidekick AI! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We appreciate all types of contributions:

- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new functionality
- 🔧 **Code Contributions** - Implement features or fix bugs
- 📚 **Documentation** - Improve guides, examples, and API docs
- 🧪 **Testing** - Add test cases and improve coverage
- 🎨 **UI/UX Improvements** - Enhance user experience
- 🔌 **AI Provider Integration** - Add support for new AI services

### Before You Start

1. **Check Existing Issues** - Look through [existing issues](https://github.com/DarkeyedDev/sidekick-ai/issues) to avoid duplicates
2. **Read the Code of Conduct** - Follow our community guidelines
3. **Review the Architecture** - Understand the codebase structure
4. **Set Up Development Environment** - Follow the setup guide below

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **VS Code** 1.74.0+
- **Git** for version control
- **TypeScript** knowledge (the entire codebase is TypeScript)

### Installation

```bash
# Clone the repository
git clone https://github.com/DarkeyedDev/sidekick-ai.git
cd sidekick-ai

# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test
```

### Development Workflow

```bash
# Start development mode with file watching
npm run watch

# In VS Code, press F5 to launch Extension Development Host
# This opens a new VS Code window with your extension loaded

# Run tests in watch mode
npm run test:watch

# Lint and fix code style issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Testing Your Changes

1. **Unit Tests**: `npm test`
2. **Integration Tests**: `npm run test:integration`
3. **Manual Testing**: Use F5 to test in Extension Development Host
4. **Coverage**: `npm run test:coverage` (aim for 99%+ coverage)

## 📋 Coding Standards

### TypeScript Guidelines

- **Strict Mode**: All code must compile under TypeScript strict mode
- **Type Safety**: Avoid `any` type - use proper interfaces and generics
- **Null Safety**: Handle undefined/null cases explicitly
- **Error Handling**: Use proper try/catch blocks and error propagation

```typescript
// ✅ Good
interface UserRequest {
  prompt: string;
  filePath?: string;
}

async function processRequest(request: UserRequest): Promise<AIResponse> {
  try {
    // Implementation
  } catch (error) {
    logger.error('Request processing failed', error);
    throw error;
  }
}

// ❌ Bad
function processRequest(request: any): any {
  // Implementation without error handling
}
```

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

**Key Rules:**
- Use single quotes for strings
- 2-space indentation
- Semicolons required
- 120 character line limit
- Prefer const/let over var
- Use arrow functions where appropriate

### Architecture Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **Dependency Injection**: Pass dependencies rather than importing directly
3. **Error Boundaries**: Handle errors gracefully with user-friendly messages
4. **Testability**: Write code that's easy to unit test
5. **Performance**: Consider extension startup time and memory usage

### File Organization

```
src/
├── extension.ts              # Main entry point - keep minimal
├── ai/                       # AI service and provider implementations
├── utils/                    # Utility functions and helpers
├── commands/                 # VS Code command implementations
├── logging/                  # Logging and telemetry
├── types/                    # TypeScript type definitions
└── __tests__/               # Test files alongside source
```

## 🧪 Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows

### Writing Good Tests

```typescript
describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    mockContext = createMockContext();
    configManager = new ConfigManager(mockContext);
  });

  describe('getAIConfig', () => {
    it('should return default configuration when no settings exist', async () => {
      // Arrange
      mockContext.configuration.get.mockReturnValue(undefined);

      // Act
      const config = await configManager.getAIConfig();

      // Assert
      expect(config.provider).toBe(AIProvider.OPENAI);
      expect(config.model).toBe('gpt-3.5-turbo');
    });

    it('should handle configuration errors gracefully', async () => {
      // Arrange
      mockContext.configuration.get.mockRejectedValue(new Error('Config error'));

      // Act & Assert
      await expect(configManager.getAIConfig()).rejects.toThrow('Config error');
    });
  });
});
```

### Test Coverage Requirements

- **Minimum**: 90% line coverage
- **Target**: 99%+ coverage
- **Critical Paths**: 100% coverage for security and file operations
- **Error Handling**: All error paths must be tested

## 🐛 Bug Reports

When reporting bugs, please include:

### Required Information

```markdown
**Bug Description**
Clear description of what went wrong

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should have happened

**Actual Behavior**
What actually happened

**Environment**
- VS Code Version:
- Extension Version:
- Operating System:
- AI Provider:
- Node.js Version:

**Error Messages**
```
Any error messages or logs
```

**Additional Context**
Screenshots, configuration, etc.
```

### Bug Priority Levels

- **Critical**: Security issues, data loss, extension crashes
- **High**: Major functionality broken, significant performance issues
- **Medium**: Minor functionality issues, confusing UX
- **Low**: Cosmetic issues, minor inconveniences

## 💡 Feature Requests

### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Who would use this and why?

**Proposed Solution**
How should this work?

**Alternative Solutions**
Any alternative approaches considered?

**Additional Context**
Mockups, examples, related features
```

### Feature Evaluation Criteria

- **User Value**: How much does this help users?
- **Complexity**: How difficult to implement and maintain?
- **Compatibility**: Does it work with existing features?
- **Performance**: What's the impact on extension performance?
- **Security**: Are there any security considerations?

## 🔧 Pull Request Process

### Before Submitting

1. **Create an Issue** first for significant changes
2. **Fork the Repository** and create a feature branch
3. **Write Tests** for your changes
4. **Update Documentation** if needed
5. **Test Thoroughly** including edge cases

### Pull Request Checklist

- [ ] **Code Quality**
  - [ ] TypeScript compiles without errors
  - [ ] ESLint passes with no warnings
  - [ ] Code follows established patterns
  - [ ] No console.log statements (use logger instead)

- [ ] **Testing**
  - [ ] Unit tests added/updated
  - [ ] All tests pass
  - [ ] Test coverage maintained or improved
  - [ ] Manual testing completed

- [ ] **Documentation**
  - [ ] README updated if needed
  - [ ] JSDoc comments added for public APIs
  - [ ] CHANGELOG updated for user-facing changes
  - [ ] Type definitions updated

- [ ] **Security**
  - [ ] No hardcoded secrets or API keys
  - [ ] Input validation added where needed
  - [ ] Error messages don't leak sensitive info
  - [ ] Dependencies are secure and up-to-date

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Maintainer may test manually
4. **Approval**: Changes approved and merged

## 🏗️ Architecture Deep Dive

### Extension Structure

```typescript
// Main entry point
export async function activate(context: vscode.ExtensionContext) {
  // Initialize services
  const configManager = new ConfigManager(context);
  const logger = new OutputChannelManager();
  const fileWriter = new FileWriter(logger);
  const aiService = new AIService(logger, options);

  // Register commands
  registerCommands(context, aiService, fileWriter, logger);
}
```

### Key Components

1. **ConfigManager**: Handles all settings and API key storage
2. **AIService**: Routes requests to appropriate AI providers
3. **FileWriter**: Manages safe file operations with undo support
4. **OutputChannelManager**: Provides structured logging and telemetry
5. **Commands**: Implement specific AI functionality

### Adding New AI Providers

```typescript
// 1. Add provider to enum
export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  NEW_PROVIDER = 'newprovider'  // Add here
}

// 2. Implement in AIService
private async handleNewProviderRequest(request: AIRequest): Promise<AIResponse> {
  // Implementation
}

// 3. Add configuration schema
"sidekickAI.newprovider.baseUrl": {
  "type": "string",
  "default": "http://localhost:8080",
  "description": "New Provider base URL"
}

// 4. Add to capabilities map
[AIProvider.NEW_PROVIDER]: {
  supportsStreaming: true,
  // ... other capabilities
}
```

## 🔒 Security Guidelines

### API Key Handling

```typescript
// ✅ Good - Use VS Code secrets
await context.secrets.store('sidekickAI.openai.apiKey', apiKey);

// ❌ Bad - Don't store in plain text
config.update('openai.apiKey', apiKey);
```

### Input Validation

```typescript
// ✅ Good - Validate and sanitize
function validateFilePath(filePath: string): boolean {
  if (!filePath || filePath.includes('../')) {
    return false;
  }
  return true;
}

// ❌ Bad - Use input directly
await fs.writeFile(userInput, content);
```

### Error Messages

```typescript
// ✅ Good - Safe error messages
catch (error) {
  logger.error('AI request failed', { provider: 'openai' });
  throw new Error('AI request failed');
}

// ❌ Bad - Might leak sensitive info
catch (error) {
  throw error; // Could contain API keys in stack trace
}
```

## 📚 Documentation Standards

### JSDoc Comments

```typescript
/**
 * Send a request to the configured AI provider
 * @param request - The AI request containing prompt and context
 * @returns Promise resolving to AI response with generated content
 * @throws {Error} When AI provider is not configured or request fails
 * @example
 * ```typescript
 * const response = await aiService.sendRequest({
 *   prompt: 'Generate a function',
 *   commandType: CommandType.WRITE_CODE
 * });
 * ```
 */
public async sendRequest(request: AIRequest): Promise<AIResponse>
```

### README Updates

When adding features, update:
- Feature list with brief description
- Configuration examples if new settings added
- Usage examples for new commands
- Troubleshooting section for known issues

## 🎯 Roadmap and Priorities

### Current Priorities

1. **Stability**: Bug fixes and performance improvements
2. **Testing**: Increase coverage and add more integration tests
3. **Documentation**: Improve guides and examples
4. **AI Providers**: Add support for more local and cloud providers

### Future Features

- Streaming responses for real-time output
- Multi-file context for better code understanding
- Custom prompt templates and workflows
- Team collaboration features
- Plugin ecosystem for community providers

## 🆘 Getting Help

### Resources

- **Documentation**: [README.md](README.md) and [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/DarkeyedDev/sidekick-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DarkeyedDev/sidekick-ai/discussions)
- **Discord**: [Community Discord](https://discord.gg/sidekick-ai)

### Asking Questions

When asking for help:
1. Search existing issues and discussions first
2. Provide minimal reproduction case
3. Include relevant configuration and error messages
4. Specify your environment (VS Code version, OS, etc.)

## 📄 License

By contributing to Sidekick AI, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Mentioned in release notes for significant contributions
- Invited to join the maintainer team for sustained contributions

---

**Thank you for contributing to Sidekick AI! Together, we're making AI-powered coding accessible to everyone.** 🚀
