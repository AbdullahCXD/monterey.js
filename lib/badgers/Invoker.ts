import { MontereyContent, MontereyFunction } from "../types";
import { IBadger } from "./IBadger";
import { ContextVariables } from "./Variables";

export type InvokerVariable = `$${string}(${string})`;

export class Invoker implements IBadger {
    private methods: Map<string, string>;

    constructor(
        private content: MontereyContent,
        private variables: ContextVariables
    ) {
        this.methods = new Map();
        this.loadMethodsFromContent();
    }

    private loadMethodsFromContent() {

        this.addMethods(this.content.functions);
        
    }

    addMethods(methods: MontereyFunction[]) {
        if (!methods.length) return;
        for (const fn of methods) {
            this.methods.set(fn.name, fn.name);
        }
    }

    resolve(content: string): string {
        if (typeof content !== 'string') return content;
        
        return content.replace(/\$([.\w]+)(\([^)]*\))/g, (match, name, args) => {
            // Handle method chains (e.g., console.log)
            const methodParts = name.split('.');
            
            if (!this.methods.has(methodParts[0])) {
                // Remove $ prefix for built-in methods
                return methodParts.join('.') + args;
            }
            
            // Clean up the args and resolve any nested variables
            const cleanArgs = args.slice(1, -1)
                .split(',')
                .map((arg: string) => {
                    arg = arg.trim();
                    if (arg.startsWith('$var:')) {
                        return this.variables.resolve(arg);
                    }
                    return arg;
                })
                .join(', ');
            
            return `${this.methods.get(methodParts[0])}(${cleanArgs})`;
        });
    }

    hasVariable(key: InvokerVariable): boolean {
        const methodName = key.match(/\$(\w+)\(/)?.[1];
        return methodName ? this.methods.has(methodName) : false;
    }
}