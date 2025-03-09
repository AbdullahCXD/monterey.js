# Monterey Schema

The Monterey Schema defines the structure of Monterey configuration files (.monjson). This schema ensures type safety and provides validation for Monterey files.

## Schema Structure

The schema validates the following key elements:

### Header
Required section containing version information:
```json
"header": {
    "montereyVersion": "1.0.0"
}
```

### Variables
Array of variable declarations with name, value, and mutability:
```json
"variables": [
    {
        "name": "myVariable",
        "value": "any value",
        "immutable": true
    }
]
```

### Functions
Collection of function definitions with parameters and body:
```json
"functions": [
    {
        "name": "myFunction",
        "parameters": [
            {
                "name": "param1",
                "nullable": false
            }
        ],
        "body": {
            "variables": [],
            "functions": []
        }
    }
]
```

### Classes
Object-oriented structure definitions:
```json
"classes": [
    {
        "name": "MyClass",
        "constructor": {
            "paramters": [
                {
                    "name": "param1",
                    "nullable": false
                }
            ]
        },
        "body": {
            "variables": [],
            "functions": []
        }
    }
]
```

## Usage

To use the schema in your Monterey files:

1. Reference it in your .monjson file:
```json
{
    "$schema": "https://raw.githubusercontent.com/AbdullahCXD/monterey.js/refs/heads/develop/schema/monterey.schema.json",
    // ... rest of your config
}
```

2. Configure your IDE to use the schema for .monjson files for:
- Auto-completion
- Validation
- Documentation tooltips

## Validation

The schema enforces:
- Required fields
- Correct data types
- Valid JavaScript identifiers
- Proper nesting of components
- Version format validation