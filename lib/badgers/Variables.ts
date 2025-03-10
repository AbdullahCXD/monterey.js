import { MontereyContent, MontereyVariable, Variable } from "../types";
import { config } from "dotenv";
import { IBadger } from "./IBadger";

export type ContextVariable = Variable<"var">;

export class ContextVariables extends Map<string, string> implements IBadger {

    constructor(content: MontereyContent) {

        super();

        this.addVariables(content.variables);

    }

    addVariables(variables: MontereyVariable[]) {
        if (!variables.length) return;
        for (const v of variables) {
            // Store raw value instead of formatted value
            this.set(v.name, String(v.value));
        }
    }

    resolveValue(value: string): string {
        // First pass: resolve any $var references
        return this.resolve(value);
    }

    variable(key: ContextVariable): string {
        const envKey = key.match(/\(\$var:(.+)\)/)?.[1];
        
        if (!envKey) {
            throw new Error(`Invalid variable format: ${key}`);
        }

        const value = this.get(envKey);
        if (value === undefined) {
            throw new Error(`Variable not found: ${envKey}`);
        }

        // Check if value is another variable reference
        if (value.startsWith('($var:')) {
            return this.resolve(value as ContextVariable);
        }
        
        return value;
    }

    hasVariable(key: ContextVariable): boolean {
        const envKey = key.match(/\(\$var:(.+)\)/)?.[1];
        return envKey ? this.has(envKey) : false;
    }

    resolve(content: string): string {
        return content.replaceAll(/\(\$var:[^)]+\)/g, (match) => {
            return this.variable(match as ContextVariable);
        });
    }
}