import { Listr } from "listr2";
import { Command } from "./base/Command";
import { doesMontereyConfigExist, getMontereyConfig, findMontereyFiles } from "../utils/utils";
import { join, parse } from "path";
import { Command as CommanderCommand } from "commander";
import { BuildContext, BuildOptions } from "./build/types";
import { mkdir, writeFile } from "fs/promises";
import { Monterey } from "../../Monterey";
import consola from "consola";
import { MontereyOneLineTranspiler } from "../../transpiler/MontereyOneLineTranspiler";

export class BuildCommand extends Command {
    constructor() {
        super("build [dir]", "Build Monterey project files to JavaScript");
    }

    public onCommandInit(program: CommanderCommand): CommanderCommand {
        return program
            .option("-o, --output <dir>", "Output directory", "dist")
            .option("-m, --minify", "Minify output", false)
            .option("-s, --sourcemap", "Generate sourcemaps", false)
            .option("--transpiler <type>", "Transpiler type (default, oneline)", "default");
    }

    async execute(dir: string = ".", options: BuildOptions): Promise<void> {
        const projectPath = join(process.cwd(), dir);
        const outputDir = join(projectPath, options.output || "dist");
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

        const ctx: BuildContext = {
            files: [],
            outputDir,
            config: undefined,
            stats: {
                filesProcessed: 0,
                errors: []
            },
        };

        const tasks = new Listr<BuildContext>([
            {
                title: "Validating project",
                task: async (ctx, task) => {
                    if (!doesMontereyConfigExist(projectPath)) {
                        throw new Error("Monterey configuration not found. Run 'monterey init' first.");
                    }
                    ctx.config = await getMontereyConfig(projectPath);
                }
            },
            {
                title: "Preparing build directory",
                task: async (ctx) => {
                    await mkdir(ctx.outputDir, { recursive: true });
                }
            },
            {
                title: "Finding Monterey files",
                task: async (ctx) => {
                    ctx.files = await findMontereyFiles(projectPath);
                    if (!ctx.files.length) {
                        throw new Error("No Monterey files found to build");
                    }
                }
            },
            {
                title: "Building files",
                task: async (ctx, task) => {
                    const tasks = ctx.files.map(file => ({
                        title: `Building ${parse(file).base}`,
                        task: async () => {
                            try {
                                const parsed = parse(file);
                                // Read file content
                                const result = await monterey.buildFile(file);
                                if (!result) throw new Error(`Failed to build ${parsed.base}`);
                                
                                // Write output
                                const outPath = join(ctx.outputDir, `${parsed.name}.js`);
                                await writeFile(outPath, result);
                                ctx.stats.filesProcessed++;
                                
                                task.output = `Built ${parsed.base} → ${parsed.name}.js`;
                            } catch (error) {
                                ctx.stats.errors.push(error as Error);
                                throw error;
                            }
                        }
                    }));

                    return task.newListr(tasks, { 
                        concurrent: false, // Process files sequentially for better stability
                        exitOnError: true // Continue building other files if one fails
                    });
                }
            }
        ], { 
            ctx,
            rendererOptions: { collapseSubtasks: false } 
        });

        try {
            await tasks.run();
            
            // Report build results
            consola.success(`Build complete! Processed ${ctx.stats.filesProcessed} files`);
            
            if (ctx.stats.errors.length > 0) {
                consola.warn(`Encountered ${ctx.stats.errors.length} errors during build:`);
                ctx.stats.errors.forEach(err => consola.error(err.message));
            }
            
            if (ctx.stats.errors.length === ctx.files.length) {
                process.exit(1); // Exit with error if all files failed
            }
        } catch (error) {
            consola.error("Build failed:", (error as Error).message);
            process.exit(1);
        }
    }
}