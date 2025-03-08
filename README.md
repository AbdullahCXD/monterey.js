# Monterey.js

A modern JSON-based language that transpiles to JavaScript, making configuration and scripting more intuitive.

## Overview

Monterey.js allows you to write JavaScript-like code using JSON syntax, which is then transpiled into valid JavaScript. This creates a bridge between configuration files and executable code.

## Installation

```bash
npm install monterey.js
# or
pnpm add monterey.js
# or 
yarn add monterey.js
```

## Quick Start

1. Create a Monterey file (`example.monjson`):

```json
{
    "$schema": "https://json.schemastore.org/typings",
    "header": {
        "montereyVersion": "1.0.0"
    },
    "variables": [
        {
            "name": "greeting",
            "value": "Hello World",
            "immutable": true
        }
    ]
}
```

2. Use Monterey in your code:

```javascript
const { Monterey } = require('monterey.js');
const monterey = new Monterey();

// Set the default transpiler
monterey.setTranspiler();

// Build your file
const javascript = monterey.buildFile('example.monjson');
```

## Features

- **JSON-Based Syntax**: Write your code using familiar JSON syntax
- **Type Safety**: Built with TypeScript for enhanced development experience
- **Extensible**: Create custom transpilers by extending the base `Transpiler` class
- **Version Control**: Built-in version checking to ensure compatibility
- **Modern Error Handling**: Detailed error messages with error codes and causes

## API Reference

### `Monterey` Class

The main class for interacting with Monterey.js.

```typescript
const monterey = new Monterey();

// Set a transpiler (optional - defaults to MontereyTranspiler)
monterey.setTranspiler();

// Build from file
const output = monterey.buildFile("input.monjson");

// Build from string
const output = monterey.build(jsonString);
```

### File Structure

A Monterey file consists of:

- Header with version information
- Schema URL
- Variables definitions
- Function definitions
- Class definitions

Example structure:
```json
{
    "$schema": "your-schema-url",
    "header": {
        "montereyVersion": "1.0.0"
    },
    "variables": [...],
    "functions": [...],
    "classes": [...]
}
```

## Error Handling

Monterey provides detailed error messages with codes:

- `OUTDATED`: Monterey version is outdated
- `INVALID_VERSION`: Invalid version specified
- `TRANSPILE_ERROR`: Error during transpilation
- `BUILD_ERROR`: Error during build process
- `INVALID_EXT`: Invalid file extension
- `NO_TRANSPILER`: No transpiler set
- `FN_NOT_FOUND`: File not found

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the LICENSE file for details.

## Author

Developed with <3 by AbdullahCXD