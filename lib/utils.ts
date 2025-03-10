import lodash from "lodash";
import { MontereyError } from "./errors/MontereyError";

/**
 * Regular expression for validating Monterey version strings
 * @private
 */
const VERSION_REGEX = /^v?\d+\.\d+\.\d+$/;

/**
 * Cache for commonly used formatters to improve performance
 * @private
 */
const formatCache = new Map<string, string>();

/**
 * Handles error throwing with proper formatting and exit codes
 * @param {Error} err - Error to be thrown
 * @throws {never} Always terminates process
 */
export function throwError(err: Error): never {
    const isMontereyError = err instanceof MontereyError;
    console.error(
        '\x1b[31m%s\x1b[0m',
        isMontereyError ? err.message : `Unexpected error: ${err.message}`
    );
    process.exit(isMontereyError ? 1 : 2);
}

/**
 * Formats a value for JavaScript code generation
 * Uses caching for improved performance with repeated values
 * @param {any} value - Value to format
 * @returns {string} Formatted string representation
 */
export function formatValue(value: any): string {
    // Handle null/undefined early
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    // Use cache for primitive values
    const cacheKey = `${typeof value}:${String(value)}`;
    const cached = formatCache.get(cacheKey);
    if (cached) return cached;

    let formatted: string;
    if (lodash.isString(value)) {
        formatted = `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    } else if (Array.isArray(value)) {
        formatted = `[${value.map(v => formatValue(v)).join(', ')}]`;
    } else if (typeof value === 'object') {
        try {
            // Handle potential circular references
            const stringified = JSON.stringify(value, (_, v) => 
                typeof v === 'object' && v !== null ? 
                    lodash.cloneDeep(v) : v
            );
            formatted = stringified || '{}';
        } catch {
            formatted = '{}';
        }
    } else {
        formatted = String(value);
    }

    // Cache the result for primitive values
    if (typeof value !== 'object') {
        formatCache.set(cacheKey, formatted);
    }

    return formatted;
}

/**
 * Validates a Monterey version string
 * Uses precompiled regex for better performance
 * @param {string} version - Version string to validate
 * @returns {boolean} True if version string is valid
 */
export function validateMontereyVersion(version: string): boolean {
    return VERSION_REGEX.test(version);
}

/**
 * Clears the format cache
 * Useful for testing or memory management
 * @internal
 */
export function _clearFormatCache(): void {
    formatCache.clear();
}

export function createTab(length: number): string {
    let indent = "";
    for (let i = 0; i<length; i++) indent += ` `;
    return indent;
}