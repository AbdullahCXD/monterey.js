import { ProjectConfig } from "../../utils/types";

export interface BuildOptions {
    output?: string;
    minify?: boolean;
    sourcemap?: boolean;
    transpiler?: "default" | "oneline";
}

export interface BuildContext {
    files: string[];
    outputDir: string;
    config?: ProjectConfig;
    stats: {
        filesProcessed: number;
        errors: Error[];
    };
}
