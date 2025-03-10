import { MontereyContent, Variable } from "../types";
import { IBadger } from "./IBadger";

export type GlobalDefinedVariable = Variable<"globdef">;

export class GlobalDefined extends Map<string, string> implements IBadger {

    constructor(content: MontereyContent) {

        super();

    }

    variable(key: GlobalDefinedVariable): string {
        const envKey = key.match(/\(\$globdef:(.+)\)/)?.[1];
        
        if (!envKey) {
            throw new Error(`Invalid environment variable format: ${key}`);
        }

        return `${envKey}`;
    }

    hasVariable(key: GlobalDefinedVariable): boolean {
        const envKey = key.match(/\(\$globdef:(.+)\)/)?.[1];
        return envKey ? this.has(envKey) : false;
    }

    resolve(content: string): string {
        return content.replaceAll(/\(\$globdef:[^)]+\)/g, (match) => {
            return this.variable(match as GlobalDefinedVariable);
        });
    }
}