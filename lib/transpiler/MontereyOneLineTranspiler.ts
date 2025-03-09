import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import { MontereyContent, MontereyVariable } from "../types";
import { Transpiler } from "./Transpiler";
import { getMontereyVersion } from "../MontereyHeaders";
import semver from "semver";
import lodash from "lodash";
import { formatValue } from "../utils";

export class MontereyOneLineTranspiler extends Transpiler {
    constructor() {
        super();
    }

    transpile(content: string): string {
        const resolvedJSONCode = this.parseJSONContent(content);
        return this.toJavaScript(resolvedJSONCode).trim();
    }

    toJavaScript(content: MontereyContent) {
        let javaScriptVariableArray: string[] = [];

        if (content.variables && content.variables.length) {
            javaScriptVariableArray = this.resolveVariables(content.variables);
        }

        return this.build(javaScriptVariableArray, [], []);
    }

    build(variables: string[], functions: string[], classes: string[]) {
        // Minify everything into a single line
        return `/* Minified by Monterey */ ${[...variables, ...classes, ...functions]
            .filter(Boolean)
            .map(line => line.trim())
            .join(';')};`;
    }

    resolveVariables(variables: MontereyVariable[]): string[] {
        const jsArray: string[] = [];
        const alreadyWritten: string[] = [];

        for (const variable of variables) {
            if (alreadyWritten.includes(variable.name)) {
                throw new MontereyError(ErrorCodes.BUILD, "Variable already exists at: " + variable.name);
            }
            
            // Create ultra-minified declarations without spaces
            jsArray.push(`${variable.immutable?'const':'let'} ${variable.name}=${formatValue(variable.value)}`);
            alreadyWritten.push(variable.name);
        }

        return jsArray;
    }

    parseJSONContent(content: string): MontereyContent {
        const parsed = JSON.parse(content);
        if (!("header" in parsed)) {
            throw new MontereyError(
                ErrorCodes.TRANSPILE_ERROR,
                "Unable to find Monterey header in the monterey file.",
                { causedBy: __filename }
            );
        }
        
        const parsedType = parsed as MontereyContent;
        const { montereyVersion } = parsedType.header;
        
        const compared = semver.compare(getMontereyVersion(), montereyVersion);
        if (compared === 1) {
            throw new MontereyError(ErrorCodes.OUTDATED, "Monterey Version is outdated!");
        } else if (compared === -1) {
            throw new MontereyError(ErrorCodes.INVALID_VERSION, "Monterey Version is invalid!");
        }
        
        return parsedType;
    }
}
