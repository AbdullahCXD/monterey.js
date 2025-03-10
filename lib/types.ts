export type JavaScriptContent = string;
export type MontereyVersion = `v${string}`;
export type MontereyURL = `https://${string}` | `file://${string}` | `http://${string}`;
export type Variable<Prefix extends string> = `($${Prefix}:${string})`;

export interface JavaScriptLoader {
    top: string;
    end: string;
    async?: boolean;
}

export interface MontereyContent {
    header: MontereyHeader;
    $schema: MontereyURL;
    javascript?: JavaScriptLoader;
    variables: MontereyVariable[];
    functions: MontereyFunction[];
    classes: MontereyClass[];
}

export type MontereyBody = Omit<MontereyContent, "header" | "$schema">;

export interface MontereyHeader {
    montereyVersion: MontereyVersion;
    environment: MontereyEnvironment[];
    settings: MontereySettings;
}

export interface MontereySettings {

    loadDotenv: boolean;

}

export interface MontereyEnvironment {
    name: string;
    value: string;
}

export interface MontereyFunctionParameter {

    name: string;
    nullable: boolean;

}

export interface MontereyFunction {

    name: string;
    parameters: MontereyFunctionParameter[];
    body: Omit<MontereyBody, "classes"> & {
        return: string;
    };
    
}

export interface MontereyConstructor {

    paramters: MontereyFunctionParameter[];

}

export interface MontereyClass {
    
    name: string;
    constructor: MontereyConstructor;
    body: Omit<MontereyBody, "classes">

}

export interface MontereyVariable {
    name: string;
    immutable: boolean;
    value: any;
}