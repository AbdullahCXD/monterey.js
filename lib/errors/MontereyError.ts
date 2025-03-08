

export type ErrorCodeBody = { name?: string, code?: ErrorCodeList };
export type ErrorCodeList = "OUTDATED" | "INVALID_VERSION" | "TRANSPILE_ERROR" | "BUILD_ERROR" | "INVALID_EXT" | "NO_TRANSPILER" | "FN_NOT_FOUND" | "Unknown";

export class ErrorBuilder {

    private name?: string;
    private code?: ErrorCodeList;

    setName(name: string) {
        this.name = name;
        return this;
    }

    setCode(code: ErrorCodeList) {
        this.code = code;
        return this;
    }

    build(): ErrorCodeBody {
        return {
            name: this.name,
            code: this.code,
        }
    }
}

export class MontereyError extends Error {

    constructor(error: ErrorCodeBody, message: string, options: { causedBy?: string } = {}) {
        super(`${error.name ?? "MontereyError"} | ${error.code ?? "Unknown"}: ${message} (caused by: ${options.causedBy ?? "unknown"})`);
    }

}

export const ErrorCodes = {

    NO_TRANSPILER: new ErrorBuilder()
        .setName("No Transpiler")
        .setCode("NO_TRANSPILER")
        .build(),

    FILE_NOT_FOUND: new ErrorBuilder()
        .setName("File not found")
        .setCode("FN_NOT_FOUND")
        .build(),
    
    INVALID_EXTENSION: new ErrorBuilder()
        .setName("Invalid Extension")
        .setCode("INVALID_EXT")
        .build(),

    BUILD: new ErrorBuilder()
        .setName("Build")
        .setCode("BUILD_ERROR")
        .build(),

    TRANSPILE_ERROR: new ErrorBuilder()
        .setName("Transpile Error")
        .setCode("TRANSPILE_ERROR")
        .build(),

    OUTDATED: new ErrorBuilder()
        .setName("Monterey Outdated")
        .setCode("OUTDATED")
        .build(),

    INVALID_VERSION: new ErrorBuilder()
        .setName("Invalid Version")
        .setCode("INVALID_VERSION")
        .build(),

};