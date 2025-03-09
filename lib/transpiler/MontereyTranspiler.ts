import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import { MontereyContent, MontereyVariable } from "../types";
import semver from "semver"
import { Transpiler } from "./Transpiler";
import { getMontereyVersion } from "../MontereyHeaders";
import { formatValue } from "../utils";

/**
 * Default Monterey transpiler that converts Monterey JSON to readable JavaScript
 * @class MontereyTranspiler
 * @extends {Transpiler}
 */
export class MontereyTranspiler extends Transpiler {
    /** Cache for already written variables to improve performance */
    private readonly variableCache = new Set<string>();
    
    constructor() {
        super();
    }

    /**
     * Transpiles Monterey content to JavaScript
     * @param {string} content - Raw Monterey JSON content
     * @returns {string} Transpiled JavaScript code
     * @throws {MontereyError} When content is invalid
     */
    transpile(content: string): string {
        const resolvedJSONCode = this.parseJSONContent(content);
        return this.toJavaScript(resolvedJSONCode);
    }

    /**
     * Converts parsed Monterey content to JavaScript code
     * @param {MontereyContent} content - Parsed Monterey content
     * @returns {string} Generated JavaScript code
     */
    toJavaScript(content: MontereyContent): string {
        const sections = new Map<string, string[]>([
            ['variables', []],
            ['classes', []],
            ['functions', []]
        ]);

        if (content.variables?.length) {
            sections.set('variables', this.resolveVariables(content.variables));
        }

        return this.build(
            sections.get('variables') || [],
            sections.get('functions') || [],
            sections.get('classes') || []
        );
    }

    /**
     * Builds final JavaScript output with proper formatting
     * @param {string[]} variables - Processed variable declarations
     * @param {string[]} functions - Processed function declarations
     * @param {string[]} classes - Processed class declarations
     * @returns {string} Formatted JavaScript code
     */
    build(variables: string[], functions: string[], classes: string[]): string {
        const sections = [
            { title: 'Variables', content: variables },
            { title: 'Classes', content: classes },
            { title: 'Functions', content: functions }
        ];

        return sections
            .map(({ title, content }) => 
                `/* Generated ${title} */\n${content.join('\n')}\n`
            )
            .filter(section => section.trim())
            .join('\n');
    }

    /**
     * Processes variable declarations
     * @param {MontereyVariable[]} variables - Array of variable definitions
     * @returns {string[]} Processed variable declarations
     * @throws {MontereyError} When duplicate variables are found
     */
    resolveVariables(variables: MontereyVariable[]): string[] {
        this.variableCache.clear();
        
        return variables.map(variable => {
            if (this.variableCache.has(variable.name)) {
                throw new MontereyError(
                    ErrorCodes.BUILD,
                    `Variable already exists: ${variable.name}`
                );
            }

            this.variableCache.add(variable.name);
            const declarationType = variable.immutable ? 'const' : 'let';
            return `${declarationType} ${variable.name} = ${formatValue(variable.value)};`;
        });
    }

    /**
     * Parses and validates Monterey JSON content
     * @param {string} content - Raw JSON content
     * @returns {MontereyContent} Parsed and validated content
     * @throws {MontereyError} When content is invalid
     */
    parseJSONContent(content: string): MontereyContent {
        try {
            // Pre-validate JSON structure
            if (!content || content.trim().length === 0) {
                throw new MontereyError(
                    ErrorCodes.TRANSPILE_ERROR,
                    "Empty Monterey content",
                    { causedBy: __filename }
                );
            }

            const parsed = JSON.parse(content);
            
            // Validate required fields
            if (!parsed || typeof parsed !== 'object') {
                throw new MontereyError(
                    ErrorCodes.TRANSPILE_ERROR,
                    "Invalid JSON structure",
                    { causedBy: __filename }
                );
            }

            if (!("header" in parsed)) {
                throw new MontereyError(
                    ErrorCodes.TRANSPILE_ERROR,
                    "Missing Monterey header",
                    { causedBy: __filename }
                );
            }

            if (!("$schema" in parsed)) {
                throw new MontereyError(
                    ErrorCodes.TRANSPILE_ERROR,
                    "Missing $schema field",
                    { causedBy: __filename }
                );
            }

            const { montereyVersion } = parsed.header;
            
            // Validate version format
            if (!montereyVersion || typeof montereyVersion !== 'string') {
                throw new MontereyError(
                    ErrorCodes.INVALID_VERSION,
                    "Invalid version format",
                    { causedBy: __filename }
                );
            }

            const currentVersion = getMontereyVersion();
            const versionComparison = semver.compare(currentVersion, montereyVersion);

            if (versionComparison === 1) {
                throw new MontereyError(
                    ErrorCodes.OUTDATED,
                    `Project uses outdated Monterey version ${montereyVersion}. Current version is ${currentVersion}`
                );
            } else if (versionComparison === -1) {
                throw new MontereyError(
                    ErrorCodes.INVALID_VERSION,
                    `Project requires Monterey version ${montereyVersion} but current version is ${currentVersion}`
                );
            }

            return parsed as MontereyContent;
        } catch (err) {
            if (err instanceof MontereyError) throw err;
            throw new MontereyError(
                ErrorCodes.TRANSPILE_ERROR,
                "Failed to parse Monterey content",
                { causedBy: (err as Error).message }
            );
        }
    }
}