import { MontereyContent, Variable } from "../types";
import { config } from "dotenv";
import { IBadger } from "./IBadger";

export type EnvironmentVariable = Variable<"env">;

export class Environment extends Map<string, string> implements IBadger {

    constructor(content: MontereyContent) {

        super();

        if (content.header.settings.loadDotenv) {
            config();
        }

        if (content.header.environment.length) {
            for (const envKey of content.header.environment) {
                this.set(envKey.name, envKey.value);
            }
        }

        for (const [key, value] of Object.entries(process.env)) {
            if (!value) continue;
            this.set(key, value);
        }

    }

    variable(key: EnvironmentVariable): string {
        const envKey = key.match(/\(\$env:(.+)\)/)?.[1];
        
        if (!envKey) {
            throw new Error(`Invalid environment variable format: ${key}`);
        }

        const value = this.get(envKey);
        if (value === undefined) {
            throw new Error(`Environment variable not found: ${envKey}`);
        }

        return `\"${value}\"`;
    }

    hasVariable(key: EnvironmentVariable): boolean {
        const envKey = key.match(/\(\$env:(.+)\)/)?.[1];
        return envKey ? this.has(envKey) : false;
    }

    resolve(content: string): string {
        return content.replaceAll(/\(\$env:[^)]+\)/g, (match) => {
            return this.variable(match as EnvironmentVariable);
        });
    }
}