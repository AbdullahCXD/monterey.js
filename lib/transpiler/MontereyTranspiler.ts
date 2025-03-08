import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import { MontereyContent, MontereyVariable } from "../types";
import semver from "semver"
import { Transpiler } from "./Transpiler";
import { getMontereyVersion } from "../MontereyHeaders";

export class MontereyTranspiler extends Transpiler {
    
    constructor() {
        super();
    }

    transpile(content: string): string {

        const resolvedJSONCode = this.parseJSONContent(content);
        const js = this.toJavaScript(resolvedJSONCode);

        return js;

    }

    toJavaScript(content: MontereyContent) {

        let javaScriptVariableArray: string[] = [];

        /* Section 1: Variables */
        if (content.variables && content.variables.length) {
            javaScriptVariableArray = this.resolveVariables(content.variables);
        }

        return this.build(javaScriptVariableArray, [], []);
    }

    build(variables: string[], functions: string[], classes: string[]) {
        let content = ``;

        /* Start with variables at the top */
        content += `/* Generated Variables */\n${variables.join(`\n`)}\n\n`;

        /* Secondly classes */
        content += `/* Generated Classes */\n${classes.join(`\n`)}\n\n`;

        /* Finish with functions */
        content += `/* Generated Functions */\n${functions.join("\n")}\n\n`;

        return content;

    }

    resolveVariables(variables: MontereyVariable[]): string[] {
        const jsArray: string[] = [];
        const alreadyWritten: string[] = []

        for (const variable of variables) {
            if (alreadyWritten.includes(variable.name)) throw new MontereyError(ErrorCodes.BUILD, "Variable already exists at: " + variable.name);
            let line = ``;
            if (variable.immutable)
                line += `const `;
            else
                line += `let `;

            line += `${variable.name} = ${variable.value};`;
            jsArray.push(line);
            alreadyWritten.push(variable.name);
        }

        return jsArray;
    }

    parseJSONContent(content: string): MontereyContent {
        const parsed = JSON.parse(content);
        if (!("header" in parsed)) throw new MontereyError(ErrorCodes.TRANSPILE_ERROR, "Unable to find Monterey header in the monterey file.", { causedBy: __filename });
        const parsedType: MontereyContent = parsed as MontereyContent;
        const { montereyVersion } = parsedType.header;
        const compared = semver.compare(getMontereyVersion(), montereyVersion);
        if (compared == 1) throw new MontereyError(ErrorCodes.OUTDATED, "Monterey Version is outdated!");
        else if (compared == -1) throw new MontereyError(ErrorCodes.INVALID_VERSION, "Monterey Version is invalid!");
        return parsedType;
    }

}