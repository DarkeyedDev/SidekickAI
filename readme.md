# Sidekick AI - VS Code Extension

🤖 **Your Intelligent Coding Companion** - A free, open-source Visual Studio
Code extension that functions as an autonomous AI coding assistant, powered by
your choice of AI providers.

[![Build Status](https://github.com/DarkeyedDev/sidekick-ai/workflows/test-and-lint/badge.svg)](https://github.com/DarkeyedDev/sidekick-ai/actions)
[![Version](https://img.shields.io/visual-studio-marketplace/v/sidekick-ai.sidekick-ai)](https://marketplace.visualstudio.com/items?itemName=sidekick-ai.sidekick-ai)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/sidekick-ai.sidekick-ai)](https://marketplace.visualstudio.com/items?itemName=sidekick-ai.sidekick-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🧠 Autonomous AI Assistance

- **Natural Language Interface**: Describe what you want in plain English
- **Multi-step Planning**: AI breaks down complex tasks into manageable steps
- **Context-Aware**: Understands your codebase, file structure, and coding
  patterns
- **Safe Previews**: Always shows what changes will be made before applying them

### 🔧 Core Commands

- **AI: Write Code** - Generate new code from natural language descriptions
- **AI: Modify File** - Update existing files with intelligent modifications
- **AI: Generate Function** - Create functions with proper documentation and
  error handling
- **AI: Explain Code** - Get detailed explanations of code functionality and
  complexity

### 🔌 Pluggable AI Backends

- **OpenAI** (GPT-3.5, GPT-4) - Industry-leading language models
- **Anthropic Claude** (Claude-3) - Advanced reasoning and code understanding
- **Ollama** - Run models locally with privacy and no cost
- **LM Studio** - Local inference with user-friendly interface
- **vLLM** - High-performance local inference with custom endpoints

### 🛡️ Privacy & Security

- **User-Controlled**: You choose and configure your AI provider
- **Secure API Key Storage**: Credentials stored safely in VS Code's secret
  storage
- **Local Options**: Use Ollama, LM Studio, or vLLM for complete privacy
- **GDPR Compliant**: Optional telemetry with full transparency

### 📊 Smart Change Management

- **Change History**: Track all AI-driven modifications
- **Dry Run Mode**: Simulate changes without applying them
- **Undo Support**: Easily revert AI modifications
- **Conflict Detection**: Intelligent handling of file changes

## 🚀 Quick Start

### Installation

1. **From VS Code Marketplace**:

   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Search for "Sidekick AI"
   - Click Install

2. **From VSIX**:
   ```bash
   code --install-extension sidekick-ai.vsix
   ```

### Basic Setup

1. **Open VS Code Settings** (`Ctrl+,` / `Cmd+,`)
2. **Search for "Sidekick AI"**
3. **Choose your AI provider** and configure:

#### Option 1: OpenAI (Recommended for beginners)

```json
{
  "sidekickAI.provider": "openai",
  "sidekickAI.model": "gpt-3.5-turbo",
  "sidekickAI.openai.apiKey": "sk-your-api-key-here"
}
```

#### Option 2: Ollama (Free, local, private)

```json
{
  "sidekickAI.provider": "ollama",
  "sidekickAI.model": "codellama:7b",
  "sidekickAI.ollama.baseUrl": "http://localhost:11434"
}
```

### First Steps

1. **Open a code file** in VS Code
2. **Press `Ctrl+Shift+P` / `Cmd+Shift+P`** to open command palette
3. **Type "AI:"** to see all available Sidekick AI commands
4. **Try "AI: Write Code"** and describe what you want to create

## 📋 Configuration Guide

### Provider Settings

```json
{
  "sidekickAI.provider": "openai", // AI provider: openai, claude, ollama, lmstudio, vllm
  "sidekickAI.model": "gpt-3.5-turbo", // Model name for the selected provider
  "sidekickAI.maxTokens": 2048, // Maximum tokens for AI responses
  "sidekickAI.temperature": 0.1, // Creativity level (0.0 = deterministic, 2.0 = very creative)
  "sidekickAI.dryRun": false, // Enable to simulate changes without applying
  "sidekickAI.autoConfirm": false, // Auto-confirm non-destructive changes
  "sidekickAI.telemetry.enabled": false // Optional usage analytics (GDPR compliant)
}
```

### AI Provider Configuration

#### 🤖 OpenAI Setup

**Prerequisites**: OpenAI API account and API key

1. **Get API Key**:

   - Visit [OpenAI API](https://platform.openai.com/api-keys)
   - Create new API key
   - Copy the key (starts with `sk-`)

2. **Configure in VS Code**:

   ```json
   {
     "sidekickAI.provider": "openai",
     "sidekickAI.model": "gpt-3.5-turbo",
     "sidekickAI.openai.apiKey": "sk-your-actual-api-key-here"
   }
   ```

3. **Recommended Models**:
   - `gpt-3.5-turbo` - Fast, cost-effective, great for most tasks
   - `gpt-4` - Higher quality, better reasoning, more expensive
   - `gpt-4-turbo-preview` - Latest improvements with larger context

**Cost**: ~$0.002 per 1K tokens (gpt-3.5-turbo)

#### 🧠 Anthropic Claude Setup

**Prerequisites**: Anthropic API account and API key

1. **Get API Key**:

   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create new API key
   - Copy the key (starts with `sk-ant-`)

2. **Configure in VS Code**:

   ```json
   {
     "sidekickAI.provider": "claude",
     "sidekickAI.model": "claude-3-sonnet-20240229",
     "sidekickAI.claude.apiKey": "sk-ant-your-actual-api-key-here"
   }
   ```

3. **Recommended Models**:
   - `claude-3-haiku-20240307` - Fast and efficient
   - `claude-3-sonnet-20240229` - Balanced performance (recommended)
   - `claude-3-opus-20240229` - Highest capability

**Cost**: ~$0.003 per 1K tokens (Claude-3 Sonnet)

#### 🏠 Ollama Setup (Local, Free)

**Prerequisites**: Ollama installed on your machine

1. **Install Ollama**:

   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh

   # Windows
   # Download from https://ollama.ai/download
   ```

2. **Pull a model**:

   ```bash
   ollama pull codellama:7b
   # or
   ollama pull llama2:7b
   ollama pull mistral:7b
   ```

3. **Start Ollama**:

   ```bash
   ollama serve
   ```

4. **Configure in VS Code**:
   ```json
   {
     "sidekickAI.provider": "ollama",
     "sidekickAI.model": "codellama:7b",
     "sidekickAI.ollama.baseUrl": "http://localhost:11434"
   }
   ```

**Available Models**:

- `codellama:7b` - 3.8GB, good for coding tasks
- `codellama:13b` - 7.4GB, better accuracy
- `llama2:7b` - 3.8GB, general purpose
- `mistral:7b` - 4.1GB, efficient alternative

**Cost**: Free (requires local compute)

#### 🖥️ LM Studio Setup (Local, Free)

**Prerequisites**: LM Studio application

1. **Install LM Studio**:

   - Download from [LM Studio](https://lmstudio.ai/)
   - Install the application

2. **Download a model**:

   - Open LM Studio
   - Browse models in the built-in browser
   - Download a GGUF model (e.g., CodeLlama-7B-Instruct-GGUF)

3. **Start local server**:

   - Go to "Local Server" tab in LM Studio
   - Load your downloaded model
   - Start server (usually on port 1234)

4. **Configure in VS Code**:
   ```json
   {
     "sidekickAI.provider": "lmstudio",
     "sidekickAI.model": "CodeLlama-7B-Instruct",
     "sidekickAI.lmstudio.baseUrl": "http://localhost:1234"
   }
   ```

**Recommended Models**:

- `CodeLlama-7B-Instruct-GGUF` - Good for coding
- `Mistral-7B-Instruct-v0.1-GGUF` - General purpose
- `CodeLlama-13B-Instruct-GGUF` - Higher quality (requires more RAM)

**Cost**: Free (requires local compute)

#### ⚡ vLLM Setup (High Performance)

**Prerequisites**: Python environment and vLLM installed

1. **Install vLLM**:

   ```bash
   pip install vllm
   ```

2. **Start vLLM server**:

   ```bash
   python -m vllm.entrypoints.api_server \
     --model codellama/CodeLlama-7b-hf \
     --host 0.0.0.0 \
     --port 8000
   ```

3. **Configure in VS Code**:
   ```json
   {
     "sidekickAI.provider": "vllm",
     "sidekickAI.model": "codellama/CodeLlama-7b-hf",
     "sidekickAI.vllm.baseUrl": "http://localhost:8000"
   }
   ```

**Recommended Models**:

- `codellama/CodeLlama-7b-hf` - Meta's code model
- `bigcode/starcoder` - Multi-language coding
- `WizardLM/WizardCoder-15B-V1.0` - Enhanced code generation

**Cost**: Free (requires GPU for best performance)

## 🎯 Usage Examples

### Writing New Code

```
Command: AI: Write Code
Prompt: "Create a React component for user authentication with email and password"
```

The AI will:

- Analyze your project structure
- Generate a complete React component
- Include proper TypeScript types
- Add error handling and validation
- Follow your existing code patterns

**Example Result**:

```typescript
interface AuthProps {
  onLogin: (user: User) => void;
  onError: (error: string) => void;
}

export const AuthComponent: React.FC<AuthProps> = ({ onLogin, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await authenticateUser(email, password);
      onLogin(user);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>{/* Complete implementation */}</form>;
};
```

### Modifying Existing Code

```
Command: AI: Modify File (with code selected)
Prompt: "Add error handling and make this function async"
```

The AI will:

- Understand the selected code context
- Add proper try/catch blocks
- Convert to async/await pattern
- Maintain existing functionality
- Preserve your code style

### Generating Functions

```
Command: AI: Generate Function
Function: calculateTotalPrice
Description: "Calculate total price with tax and discount"
Parameters: "price: number, taxRate: number, discount?: number"
Return Type: "number"
```

The AI will:

- Create a well-documented function
- Add parameter validation
- Include proper error handling
- Use TypeScript types correctly
- Generate comprehensive JSDoc comments

**Example Result**:

```typescript
/**
 * Calculate total price with tax and discount applied
 * @param price - Base price before tax and discount
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discount - Optional discount amount to subtract
 * @returns Total price after tax and discount
 * @throws Error if price or taxRate is negative
 */
function calculateTotalPrice(
  price: number,
  taxRate: number,
  discount: number = 0
): number {
  if (price < 0) throw new Error('Price cannot be negative');
  if (taxRate < 0) throw new Error('Tax rate cannot be negative');

  const discountedPrice = Math.max(0, price - discount);
  return discountedPrice * (1 + taxRate);
}
```

### Explaining Code

```
Command: AI: Explain Code (with code selected)
Level: Intermediate
```

The AI will:

- Break down the code step-by-step
- Explain algorithms and patterns used
- Identify potential improvements
- Assess complexity and maintainability
- Provide educational insights

## 🔍 Advanced Features

### Change Management Panel

The **Sidekick AI Changes** panel in the Explorer shows:

- **Pending Changes**: Modifications waiting for approval
- **Change History**: Previously applied modifications
- **Preview Options**: Diff view and detailed previews
- **Quick Actions**: Apply, cancel, or undo changes

### Dry Run Mode

Enable `sidekickAI.dryRun` to:

- Test AI modifications without applying them
- See exactly what would change
- Perfect for experimentation and learning
- Ideal for production environments

### Auto-Confirmation

Enable `sidekickAI.autoConfirm` to:

- Skip confirmation for non-destructive changes
- Speed up your workflow
- Still show previews for destructive operations

### Context Awareness

Sidekick AI understands:

- **Project Structure**: Dependencies, frameworks, and patterns
- **File Relationships**: Imports, exports, and usage
- **Code Style**: Formatting, naming conventions, and architecture
- **Language Features**: Modern syntax, best practices, and idioms

## 🛠️ Troubleshooting

### Common Issues

#### "AI provider not configured"

**Solution**: Set up your chosen provider in VS Code settings

```json
{
  "sidekickAI.provider": "openai",
  "sidekickAI.openai.apiKey": "your-api-key"
}
```

#### "OpenAI API key is invalid"

**Solutions**:

- Check your API key is correct and starts with `sk-`
- Verify your OpenAI account has available credits
- Test your key at [OpenAI Playground](https://platform.openai.com/playground)

#### "Ollama server is not running"

**Solutions**:

```bash
# Start Ollama
ollama serve

# Check if model is installed
ollama list

# Pull missing model
ollama pull codellama:7b
```

#### "Connection timeout"

**Solutions**:

- Check your internet connection for cloud providers
- For local providers, ensure the server is running
- Increase timeout in settings:

```json
{
  "sidekickAI.maxTokens": 1024 // Reduce if timeout persists
}
```

### Performance Tips

1. **For faster responses**: Use `gpt-3.5-turbo` or `claude-3-haiku`
2. **For better quality**: Use `gpt-4` or `claude-3-opus`
3. **For privacy**: Use Ollama or LM Studio locally
4. **For high throughput**: Use vLLM with GPU acceleration

### Getting Help

- **Extension Issues**:
  [GitHub Issues](https://github.com/DarkeyedDev/sidekick-ai/issues)
- **Feature Requests**:
  [GitHub Discussions](https://github.com/DarkeyedDev/sidekick-ai/discussions)
- **Documentation**: [Wiki](https://github.com/DarkeyedDev/sidekick-ai/wiki)
- **Provider-Specific Help**: See [docs/MODELS.md](docs/MODELS.md)

## 🛠️ Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- VS Code 1.74.0+
- TypeScript 5.1+

### Installation

```bash
git clone https://github.com/DarkeyedDev/sidekick-ai.git
cd sidekick-ai
npm install
```

### Development

```bash
# Build the extension
npm run build

# Watch for changes
npm run watch

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing the Extension

1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host
3. Test the extension in the new window

## 🧪 Testing

Comprehensive test suite with 99%+ coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Tests cover:

- ✅ AI service integration with all providers
- ✅ Configuration management and validation
- ✅ File operations and change management
- ✅ Command execution and error handling
- ✅ Security and privacy features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Quality

- **TypeScript**: Strict mode with comprehensive type safety
- **Testing**: Jest with 99%+ coverage requirement
- **Linting**: ESLint with recommended rules
- **Documentation**: JSDoc for all public APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🌟 Support the Project

- ⭐ **Star the repository** on GitHub
- 🐛 **Report bugs** to help us improve
- 💡 **Suggest features** via GitHub Discussions
- 🤝 **Contribute code** following our guidelines
- 📢 **Share with others** who might find it useful

## 🌟 Support

- 🐛 **Bug Reports**:
  [GitHub Issues](https://github.com/DarkeyedDev/sidekick-ai/issues)
- 💡 **Feature Requests**:
  [GitHub Discussions](https://github.com/DarkeyedDev/sidekick-ai/discussions)
- 📚 **Documentation**: [Wiki](https://github.com/DarkeyedDev/sidekick-ai/wiki)
- 💬 **Community**: [Discord Server](https://discord.gg/sidekick-ai)

## 🙏 Acknowledgments

- Inspired by [Replit Ghostwriter](https://replit.com/ai)
- Built with the excellent
  [VS Code Extension API](https://code.visualstudio.com/api)
- AI providers: [OpenAI](https://openai.com),
  [Anthropic](https://anthropic.com), [Ollama](https://ollama.ai)
- Community feedback and contributions

---

**Made with ❤️ by DarkeyedDev** _Empowering developers with intelligent,
autonomous coding assistance._
