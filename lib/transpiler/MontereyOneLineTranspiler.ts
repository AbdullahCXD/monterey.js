import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import { MontereyContent, MontereyVariable, MontereyFunction, MontereyClass, JavaScriptLoader } from "../types";
import { Transpiler } from "./Transpiler";
import { getMontereyVersion } from "../MontereyHeaders";
import semver from "semver";
import lodash from "lodash";
import { formatValue } from "../utils";
import { ContextVariables, Environment, GlobalDefined, Invoker } from "../badgers";

export class MontereyOneLineTranspiler extends Transpiler {
    private environment?: Environment;
    private invoker?: Invoker;
    private variables?: ContextVariables;
    private globaldef?: GlobalDefined;

    constructor() {
        super();
    }

    transpile(content: string): string {
        const resolvedJSONCode = this.parseJSONContent(content);
        this.environment = new Environment(resolvedJSONCode);
        this.variables = new ContextVariables(resolvedJSONCode);
        this.invoker = new Invoker(resolvedJSONCode, this.variables!);
        this.globaldef = new GlobalDefined(resolvedJSONCode);
        return this.toJavaScript(resolvedJSONCode).trim();
    }

    toJavaScript(content: MontereyContent) {
        const sections = {
            variables: content.variables?.length ? this.resolveVariables(content.variables) : [],
            functions: content.functions?.length ? this.resolveFunctions(content.functions) : [],
            classes: content.classes?.length ? this.resolveClasses(content.classes) : []
        };

        return this.build(content.javascript, sections.variables, sections.functions, sections.classes);
    }

    build(javascript: JavaScriptLoader | undefined, variables: string[], functions: string[], classes: string[]) {
        const minified = [...variables, ...classes, ...functions]
            .filter(Boolean)
            .map(line => line.replace(/\s+/g, ' ').trim())
            .join(';');

        if (!javascript) return `/* Minified by Monterey */ ${minified};`;

        const top = javascript.top?.replace(/\s+/g, ' ').trim() || '';
        const end = javascript.end?.replace(/\s+/g, ' ').trim() || '';
        
        const wrapper = javascript.async ? 
            `(async()=>{${top};${minified};${end}})();` :
            `(()=>{${top};${minified};${end}})();`;

        return `/* Minified by Monterey */ ${wrapper}`;
    }

    resolveFunctions(functions: MontereyFunction[]): string[] {
        return functions.map(fn => {
            const params = (fn.parameters || [])
                .map(p => p.nullable ? `${p.name}=undefined` : p.name)
                .join(',');

            let body = '';
            if (fn.body.variables?.length) {
                body += this.resolveVariables(fn.body.variables).join(';');
            }

            // Add raw statements
            if (fn.body.raw?.length) {
                if (body) body += ';';
                body += fn.body.raw.join(';');
            }

            let returnValue = fn.body.return || 'undefined';
            returnValue = this.invoker?.resolve(returnValue) ?? returnValue;
            returnValue = this.variables?.resolve(returnValue) ?? returnValue;
            returnValue = this.environment?.resolve(returnValue) ?? returnValue;
            returnValue = this.globaldef?.resolve(returnValue) ?? returnValue;

            return `function ${fn.name}(${params}){${body}return ${returnValue}}`;
        });
    }

    resolveClasses(classes: MontereyClass[]): string[] {
        return classes.map(cls => {
            const params = cls.constructor.paramters
                .map(p => p.nullable ? `${p.name}=undefined` : p.name)
                .join(',');

            const methods = cls.body.functions ? 
                this.resolveFunctions(cls.body.functions)
                    .map(f => f.replace('function ', ''))
                    .join(';') : '';

            return `class ${cls.name}{constructor(${params}){}${methods}}`;
        });
    }

    resolveVariables(variables: MontereyVariable[]): string[] {
        const alreadyWritten = new Set<string>();

        return variables.map(variable => {
            if (alreadyWritten.has(variable.name)) {
                throw new MontereyError(ErrorCodes.BUILD, `Variable already exists: ${variable.name}`);
            }
            alreadyWritten.add(variable.name);

            let value = variable.value;
            if (typeof value === "string") {
                value = this.invoker?.resolve(value) ?? value;
                value = this.variables?.resolve(value) ?? value;
                value = this.environment?.resolve(value) ?? value;
                value = this.globaldef?.resolve(value) ?? value;
            }
            if (value === variable.value) {
                value = formatValue(value);
            }

            return `${variable.immutable?'const':'let'}${variable.name}=${value}`;
        });
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
