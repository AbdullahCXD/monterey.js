import { Command } from "./base/Command";
import { Command as CommanderCommand } from "commander";
import { watch } from "chokidar";
import { BuildCommand } from "./build";
import consola from "consola";
import { BuildOptions } from "./build/types";
import { join, parse, resolve } from "path";
import { Monterey } from "../../Monterey";
import { writeFile } from "fs/promises";
import { Listr } from "listr2";

export class WatchCommand extends Command {
    private buildCommand: BuildCommand;
    private monterey: Monterey;
    private isShuttingDown: boolean = false;

    constructor() {
        super("watch [dir]", "Watch for changes and rebuild");
        this.buildCommand = new BuildCommand();
        const monterey = new Monterey();
        monterey.setTranspiler();
        this.monterey = monterey;
    }

    public onCommandInit(program: CommanderCommand): CommanderCommand {
        return program
            .option("-o, --out <dir>", "Output directory", "dist")
            .option("-m, --minify", "Minify output", false)
            .option("--transpiler <type>", "Transpiler type (default, oneline)", "default");
    }

    private async buildFile(path: string, options: BuildOptions): Promise<void> {
        if (this.isShuttingDown) return;

        const tasks = new Listr(
            [
                {
                    title: `Building ${path}`,
                    task: async (ctx, task) => {
                        const parsedFile = parse(path);
                        try {
                            const file = this.monterey.buildFile(path);
                            await writeFile(join(options.output ?? "dist", parsedFile.name + '.js'), file);
                            task.title = `Built ${path}`;
                        } catch (error) {
                            task.title = `Failed to build ${path}`;
                            consola.error(`Build error for ${path}:`, error);
                            // Don't throw, just log the error and continue watching
                        }
                    }
                }
            ],
            { 
                concurrent: false,
                exitOnError: false // Don't exit on error
            }
        );

        try {
            await tasks.run();
        } catch (error) {
            // Log error but don't exit
            consola.error(`Build process error:`, error);
        }
    }

    async execute(dir: string = ".", options: BuildOptions): Promise<void> {
        const watchDir = resolve(process.cwd(), dir);
        consola.info(`Watching ${watchDir} for changes...`);
        
        let debounceTimer: NodeJS.Timeout;
        
        const watcher = watch(watchDir, {
            persistent: true,
            ignoreInitial: false,
            ignored: [
                /(^|[\/\\])\../, // Ignore dot files
                '**/node_modules/**', // Ignore node_modules
                '**/dist/**' // Ignore dist folder
            ],
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            }
        });

        const handleFile = async (path: string) => {
            if (this.isShuttingDown || !path.endsWith('.monjson')) return;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.buildFile(path, options), 100);
        };

        const cleanup = () => {
            this.isShuttingDown = true;
            clearTimeout(debounceTimer);
            watcher.close();
            consola.info('Shutting down watch mode...');
            process.exit(0);
        };

        watcher
            .on('add', handleFile)
            .on('change', handleFile)
            .on('unlink', path => {
                if (!this.isShuttingDown && path.endsWith('.monjson')) {
                    consola.info(`File ${path} has been removed`);
                }
            })
            .on('error', error => {
                if (!this.isShuttingDown) {
                    consola.error(`Watcher error:`, error);
                }
            });

        // Handle process termination
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }
}
