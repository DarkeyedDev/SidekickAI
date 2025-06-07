# AI Model Compatibility Matrix

This document provides detailed information about supported AI providers, their models, capabilities, and configuration requirements for Sidekick AI.

## 🤖 Supported Providers

### OpenAI

| Model | Context Length | Strengths | Cost | Notes |
|-------|---------------|-----------|------|-------|
| `gpt-3.5-turbo` | 16K tokens | Fast, cost-effective | $0.002/1K tokens | **Recommended for most use cases** |
| `gpt-3.5-turbo-16k` | 16K tokens | Extended context | $0.004/1K tokens | Deprecated - use gpt-3.5-turbo |
| `gpt-4` | 8K tokens | Superior reasoning | $0.030/1K tokens | Best for complex code generation |
| `gpt-4-32k` | 32K tokens | Large context | $0.060/1K tokens | For large file modifications |
| `gpt-4-turbo-preview` | 128K tokens | Latest improvements | $0.010/1K tokens | Preview model, may change |

**Configuration:**
```json
{
  "sidekickAI.provider": "openai",
  "sidekickAI.model": "gpt-3.5-turbo",
  "sidekickAI.openai.apiKey": "sk-..." // Required
}
```

**Capabilities:**
- ✅ Code generation
- ✅ Code explanation  
- ✅ File modification
- ✅ Function generation
- ✅ Streaming responses
- ✅ Multi-language support

---

### Anthropic Claude

| Model | Context Length | Strengths | Cost | Notes |
|-------|---------------|-----------|------|-------|
| `claude-3-haiku-20240307` | 200K tokens | Fast, efficient | $0.00025/1K tokens | **Best for quick tasks** |
| `claude-3-sonnet-20240229` | 200K tokens | Balanced performance | $0.003/1K tokens | **Recommended default** |
| `claude-3-opus-20240229` | 200K tokens | Highest capability | $0.015/1K tokens | For complex reasoning |
| `claude-2.1` | 200K tokens | Previous generation | $0.008/1K tokens | Legacy support |
| `claude-2.0` | 100K tokens | Previous generation | $0.008/1K tokens | Legacy support |

**Configuration:**
```json
{
  "sidekickAI.provider": "claude",
  "sidekickAI.model": "claude-3-sonnet-20240229",
  "sidekickAI.claude.apiKey": "sk-ant-..." // Required
}
```

**Capabilities:**
- ✅ Code generation
- ✅ Code explanation
- ✅ File modification
- ✅ Function generation
- ✅ Streaming responses
- ✅ Large context handling
- ✅ Superior reasoning

---

### Ollama (Local)

| Model | Size | Context Length | Strengths | Notes |
|-------|------|---------------|-----------|-------|
| `codellama:7b` | 3.8GB | 4K tokens | Fast, code-focused | **Recommended starter** |
| `codellama:13b` | 7.4GB | 4K tokens | Better accuracy | Requires 16GB+ RAM |
| `codellama:34b` | 19GB | 4K tokens | Highest quality | Requires 32GB+ RAM |
| `llama2:7b` | 3.8GB | 4K tokens | General purpose | Good for explanations |
| `llama2:13b` | 7.4GB | 4K tokens | Better reasoning | Balanced performance |
| `mistral:7b` | 4.1GB | 8K tokens | Efficient, capable | Good alternative |
| `codegemma:7b` | 5.0GB | 8K tokens | Google's code model | Specialized for coding |

**Configuration:**
```json
{
  "sidekickAI.provider": "ollama",
  "sidekickAI.model": "codellama:7b",
  "sidekickAI.ollama.baseUrl": "http://localhost:11434" // Default
}
```

**Setup Requirements:**
1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull model: `ollama pull codellama:7b`
3. Start server: `ollama serve` (runs on port 11434)

**Capabilities:**
- ✅ Code generation
- ✅ Code explanation
- ✅ File modification
- ✅ Function generation
- ✅ **100% Private**
- ✅ **No API costs**
- ⚠️ Requires local compute
- ⚠️ Smaller context windows

---

### LM Studio (Local)

| Model Type | Example Models | Context Length | Notes |
|------------|---------------|---------------|-------|
| **Code Models** | CodeLlama-7B-Instruct-GGUF | 4K tokens | Specialized for code |
| **Chat Models** | Llama-2-7B-Chat-GGUF | 4K tokens | General conversation |
| **Instruct Models** | Mistral-7B-Instruct-v0.1-GGUF | 8K tokens | Instruction following |
| **Function Models** | CodeLlama-7B-Python-GGUF | 4K tokens | Python-specific |

**Configuration:**
```json
{
  "sidekickAI.provider": "lmstudio",
  "sidekickAI.model": "CodeLlama-7B-Instruct",
  "sidekickAI.lmstudio.baseUrl": "http://localhost:1234" // Default
}
```

**Setup Requirements:**
1. Download [LM Studio](https://lmstudio.ai/)
2. Download a GGUF model from the built-in browser
3. Load model and start server (Local Server tab)
4. Default endpoint: `http://localhost:1234/v1`

**Capabilities:**
- ✅ Code generation
- ✅ Code explanation
- ✅ File modification
- ✅ Function generation
- ✅ **100% Private**
- ✅ **No API costs**
- ✅ User-friendly interface
- ✅ Model quantization options
- ⚠️ Requires model downloads

---

### vLLM (High-Performance Local)

| Model Type | Example Models | Context Length | Notes |
|------------|---------------|---------------|-------|
| **CodeLlama** | codellama/CodeLlama-7b-hf | 4K tokens | Meta's code model |
| **StarCoder** | bigcode/starcoder | 8K tokens | Multi-language coding |
| **WizardCoder** | WizardLM/WizardCoder-15B-V1.0 | 2K tokens | Enhanced code generation |
| **Llama 2** | meta-llama/Llama-2-7b-chat-hf | 4K tokens | General purpose |

**Configuration:**
```json
{
  "sidekickAI.provider": "vllm",
  "sidekickAI.model": "codellama/CodeLlama-7b-hf",
  "sidekickAI.vllm.baseUrl": "http://localhost:8000" // Default
}
```

**Setup Requirements:**
```bash
# Install vLLM
pip install vllm

# Start server with model
python -m vllm.entrypoints.api_server \
  --model codellama/CodeLlama-7b-hf \
  --host 0.0.0.0 \
  --port 8000
```

**Capabilities:**
- ✅ Code generation
- ✅ Code explanation
- ✅ File modification
- ✅ Function generation
- ✅ **High throughput**
- ✅ **GPU acceleration**
- ✅ **Batch processing**
- ⚠️ Requires Python setup
- ⚠️ GPU recommended

---

## 📊 Performance Comparison

### Speed (Approximate response times)

| Provider | Model | Simple Query | Complex Code | Large File |
|----------|-------|-------------|-------------|-----------|
| OpenAI | gpt-3.5-turbo | 2-5s | 5-15s | 10-30s |
| OpenAI | gpt-4 | 5-10s | 15-45s | 30-90s |
| Claude | claude-3-haiku | 3-6s | 8-20s | 15-40s |
| Claude | claude-3-sonnet | 4-8s | 12-30s | 25-60s |
| Ollama | codellama:7b | 5-15s | 15-60s | 30-120s |
| LM Studio | 7B model | 5-20s | 20-80s | 40-160s |
| vLLM | 7B model | 3-10s | 10-40s | 20-80s |

*Times vary based on hardware, network, and model size*

### Quality Ranking (1-5 scale)

| Provider | Code Generation | Code Explanation | Reasoning | Context Understanding |
|----------|----------------|------------------|-----------|---------------------|
| OpenAI GPT-4 | 5 | 5 | 5 | 5 |
| Claude Opus | 5 | 5 | 5 | 5 |
| Claude Sonnet | 4 | 4 | 4 | 4 |
| OpenAI GPT-3.5 | 4 | 4 | 3 | 4 |
| CodeLlama 34B | 4 | 3 | 3 | 3 |
| CodeLlama 13B | 3 | 3 | 3 | 3 |
| CodeLlama 7B | 3 | 3 | 2 | 2 |

### Cost Analysis (Per 1M tokens)

| Provider | Model | Input Cost | Output Cost | Best For |
|----------|-------|-----------|-------------|----------|
| OpenAI | gpt-3.5-turbo | $1.50 | $2.00 | Daily coding tasks |
| Claude | claude-3-haiku | $0.25 | $1.25 | Quick queries |
| Claude | claude-3-sonnet | $3.00 | $15.00 | Professional use |
| OpenAI | gpt-4 | $30.00 | $60.00 | Complex problems |
| Ollama | Any model | $0.00 | $0.00 | **Cost-conscious users** |
| LM Studio | Any model | $0.00 | $0.00 | **Privacy-focused** |
| vLLM | Any model | $0.00 | $0.00 | **High-volume usage** |

---

## 🎯 Recommendations by Use Case

### 🆓 **Free Tier / Getting Started**
- **Primary**: Ollama with `codellama:7b`
- **Alternative**: LM Studio with any 7B model
- **Pros**: No costs, privacy, offline capability
- **Cons**: Slower, requires local setup

### 💼 **Professional Development**
- **Primary**: Claude `claude-3-sonnet-20240229`
- **Alternative**: OpenAI `gpt-3.5-turbo`
- **Pros**: Excellent quality, reasonable cost
- **Cons**: Requires API subscription

### 🚀 **Premium / Complex Projects**
- **Primary**: OpenAI `gpt-4`
- **Alternative**: Claude `claude-3-opus-20240229`
- **Pros**: Best quality, handles complex tasks
- **Cons**: Higher cost

### 🔒 **Privacy-Sensitive Projects**
- **Primary**: Ollama with `codellama:13b`
- **Alternative**: vLLM with `codellama/CodeLlama-7b-hf`
- **Pros**: 100% local, no data sent externally
- **Cons**: Requires powerful hardware

### ⚡ **High-Volume Usage**
- **Primary**: vLLM with GPU acceleration
- **Alternative**: Claude `claude-3-haiku`
- **Pros**: Fast batch processing, cost-effective
- **Cons**: Setup complexity (vLLM) or API costs (Claude)

---

## 🔧 Configuration Examples

### Multi-Provider Setup

You can switch between providers easily:

```json
{
  // Current active provider
  "sidekickAI.provider": "claude",
  "sidekickAI.model": "claude-3-sonnet-20240229",
  
  // All provider configurations
  "sidekickAI.openai.apiKey": "sk-...",
  "sidekickAI.claude.apiKey": "sk-ant-...",
  "sidekickAI.ollama.baseUrl": "http://localhost:11434",
  "sidekickAI.lmstudio.baseUrl": "http://localhost:1234",
  "sidekickAI.vllm.baseUrl": "http://localhost:8000"
}
```

### Performance Tuning

```json
{
  "sidekickAI.maxTokens": 4096,      // Increase for longer responses
  "sidekickAI.temperature": 0.1,    // Lower = more deterministic
  "sidekickAI.timeout": 60000       // Increase for slower local models
}
```

---

## 🆘 Troubleshooting

### Common Issues

**Provider not responding:**
- Check API keys are valid and not expired
- Verify base URLs for local providers
- Test connection using "AI: Test Connection" command

**Slow responses with local models:**
- Ensure sufficient RAM (8GB+ for 7B models)
- Use GPU acceleration when available
- Consider smaller/quantized models

**API rate limits:**
- Implement delays between requests
- Use lower-tier models for development
- Monitor usage in provider dashboards

**Context length exceeded:**
- Reduce `maxTokens` setting
- Break large files into smaller chunks
- Use models with larger context windows

---

## 🔄 Model Updates

Models are updated regularly. Check provider documentation for:

- New model releases
- Deprecation notices  
- Pricing changes
- Capability improvements

**Auto-update recommendations:**
- OpenAI: Models update automatically
- Claude: Models have date suffixes (update manually)
- Ollama: Use `ollama pull <model>` to update
- LM Studio: Check for model updates in UI
- vLLM: Update via `pip install --upgrade vllm`

---

*Last updated: June 2025*