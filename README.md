<div align="center">

# 🚀 Monterey.js

Transform JSON into JavaScript with elegance and type safety.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/monterey.js.svg)](https://www.npmjs.com/package/monterey.js)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

</div>

## ✨ Why Monterey?

Ever wished JSON could do more? Monterey.js bridges the gap between static configuration and dynamic code. Write your logic in a familiar JSON format and let Monterey transform it into production-ready JavaScript.

> "Configuration as code, but make it JSON" - that's Monterey's philosophy.

## 🚀 Quick Start

Get up and running in seconds:

```bash
# Using your favorite package manager
npm i monterey.js      # npm
pnpm add monterey.js   # pnpm
yarn add monterey.js   # yarn
```

## 📝 Example

Here's how simple it is to use Monterey:

1️⃣ Create your Monterey file (`hello.monjson`):
```json
{
    "$schema": "https://raw.githubusercontent.com/abdullahcxd/monterey.js/main/schema/monterey.schema.json",
    "header": {
        "montereyVersion": "1.0.0"
    },
    "variables": [
        {
            "name": "greeting",
            "value": "Hello, World! 🌍",
            "immutable": true
        }
    ]
}
```

2️⃣ Transform it to JavaScript:
```javascript
const { Monterey } = require('monterey.js');

// Initialize Monterey
const monterey = new Monterey();
monterey.setTranspiler();

// Transform your code
const js = monterey.buildFile('hello.monjson');
```

## 🎯 Features

- 💎 **Type-Safe** - Built with TypeScript for robust development
- 🔄 **JSON-Powered** - Write in JSON, get JavaScript
- 🧩 **Extensible** - Create custom transpilers for your needs
- 🛡️ **Version Control** - Built-in version compatibility checks
- 🎨 **Modern Syntax** - Clean, readable output code
- 📝 **Schema Validation** - Catch errors before they happen

## 🛠️ API

### Core Components

```typescript
// Create a new instance
const monterey = new Monterey();

// Choose your transpiler
monterey.setTranspiler(customTranspiler); // Optional

// Build methods
const fromFile = monterey.buildFile("input.monjson");
const fromString = monterey.build(jsonString);
```

### File Structure

Your Monterey files follow this intuitive structure:

```json
{
    "$schema": "...",
    "header": {
        "montereyVersion": "1.0.0"
    },
    "variables": [...],
    "functions": [...],
    "classes": [...]
}
```

## 🚨 Error Handling

Monterey provides clear, actionable error messages:

| Code | Description |
|------|-------------|
| `OUTDATED` | Time to update Monterey |
| `INVALID_VERSION` | Version mismatch |
| `TRANSPILE_ERROR` | Transpilation failed |
| `BUILD_ERROR` | Build process error |
| `INVALID_EXT` | Wrong file extension |
| `NO_TRANSPILER` | Transpiler not set |
| `FN_NOT_FOUND` | File not found |

## 🚧 Development

```bash
# Get started
pnpm install

# Build
pnpm build

# Test
pnpm test
```

## 🤝 Contributing

Contributions make Monterey better! Whether it's:

- 🐛 Fixing bugs
- ✨ Adding features
- 📝 Improving docs
- 🎨 Enhancing design

All contributions are welcome! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

MIT © [AbdullahCXD](LICENSE)

---

<div align="center">
Made with ❤️ by <a href="https://github.com/abdullahcxd">AbdullahCXD</a>
</div>