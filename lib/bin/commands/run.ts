import { Command } from "./base/Command";
import { Command as CommanderCommand } from "commander";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { spawn } from "child_process";
import consola from "consola";
import { doesMontereyConfigExist } from "../utils/utils";
import { Monterey } from "../../Monterey";
import { MontereyOneLineTranspiler } from "../../transpiler/MontereyOneLineTranspiler";

export class RunCommand extends Command {
    constructor() {
        super("run [script]", "Run a Monterey script");
    }

    public onCommandInit(program: CommanderCommand): CommanderCommand {
        return program
            .option("-e, --env <environment>", "Environment variables", "development")
            .option("-t, --temp", "Use temporary directory for built files", false)
            .option("--transpiler <type>", "Transpiler type (default, oneline)", "default");
    }

    async execute(script: string = "main", options: { env: string, temp: boolean, transpiler: string }): Promise<void> {
        const projectPath = process.cwd();
        const monterey = new Monterey();

        // Handle transpiler selection
        switch (options.transpiler?.toLowerCase()) {
            case "oneline":
                monterey.setTranspiler(new MontereyOneLineTranspiler());
                break;
            case "default":
            default:
                monterey.setTranspiler();
                break;
        }
        
        if (!doesMontereyConfigExist(projectPath)) {
            throw new Error("Monterey configuration not found. Run 'monterey init' first.");
        }

        const scriptFile = `${script}.monjson`;
        const scriptPath = join(projectPath, scriptFile);

        if (!existsSync(scriptPath)) {
            throw new Error(`Script ${scriptFile} not found in project directory.`);
        }

        try {
            // Build the file
            consola.info(`Building ${scriptFile}...`);
            const built = monterey.buildFile(scriptPath);

            // Create output directory
            const outDir = options.temp ? join(projectPath, ".monterey") : join(projectPath, "dist");
            mkdirSync(outDir, { recursive: true });

            // Write built file
            const outPath = join(outDir, `${script}.js`);
            await writeFile(outPath, built);

            // Execute the built file
            consola.info(`Running ${script}.js...`);
            const child = spawn("node", [outPath], {
                stdio: "inherit",
                env: {
                    ...process.env,
                    NODE_ENV: options.env
                }
            });

            child.on("error", (err) => {
                consola.error("Failed to run script:", err.message);
                process.exit(1);
            });

            child.on("exit", (code) => {
                if (code !== 0) {
                    consola.error(`Script exited with code ${code}`);
                    process.exit(code ?? 1);
                }
            });
        } catch (error) {
            consola.error("Failed to run script:", (error as Error).message);
            process.exit(1);
        }
    }
}
