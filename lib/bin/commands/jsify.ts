import { Listr } from "listr2";
import { Command } from "./base/Command";
import {
  doesMontereyConfigExist,
  getMontereyConfig,
  findMontereyFiles,
} from "../utils/utils";
import { join, parse } from "path";
import { Command as CommanderCommand } from "commander";
import { BuildContext, BuildOptions } from "./build/types";
import { mkdir, writeFile } from "fs/promises";
import { Monterey } from "../../Monterey";
import consola from "consola";
import { MontereyOneLineTranspiler } from "../../transpiler/MontereyOneLineTranspiler";
import { ErrorCodes, MontereyError } from "../../errors/MontereyError";
import { JavaScriptTranspiler } from "../../transpiler/JavaScriptTranspiler";

export class Jsify extends Command {
  constructor() {
    super("jsify <file>", "Build a JavaScript file to Monterey JSON");
  }

  public onCommandInit(program: CommanderCommand): CommanderCommand {
    return program.option("-o, --output <dir>", "Output directory", "dist");
  }

  async execute(file: string, options: BuildOptions): Promise<void> {
    if (!file.endsWith(".js"))
      throw new MontereyError(
        ErrorCodes.INVALID_EXTENSION,
        "Unable to find JavaScript file, Invalid Extension."
      );
    const projectPath = join(process.cwd());
    const fn = join(projectPath, file);
    const outputDir = join(projectPath, options.output || "dist");
    const monterey = new Monterey();

    monterey.setTranspiler(new JavaScriptTranspiler());

    const ctx: BuildContext = {
      files: [],
      outputDir,
      config: undefined,
      stats: {
        filesProcessed: 0,
        errors: [],
      },
    };

    const tasks = new Listr<BuildContext>(
      [
        {
          title: "Validating project",
          task: async (ctx, task) => {
            if (!doesMontereyConfigExist(projectPath)) {
              throw new Error(
                "Monterey configuration not found. Run 'monterey init' first."
              );
            }
            ctx.config = await getMontereyConfig(projectPath);
          },
        },
        {
          title: "Preparing build directory",
          task: async (ctx) => {
            await mkdir(ctx.outputDir, { recursive: true });
          },
        },
        {
          title: "Finding Monterey files",
          task: async (ctx) => {
            ctx.files = await findMontereyFiles(projectPath);
            if (!ctx.files.length) {
              throw new Error("No Monterey files found to build");
            }
          },
        },
        {
          title: "Building files",
          task: async (ctx, task) => {
            try {
              const parsed = parse(file);
              // Read file content
              const result = await monterey.buildJsFile(file as `${string}.js`);
              if (!result) throw new Error(`Failed to build ${parsed.base}`);

              // Write output
              const outPath = join(ctx.outputDir, `${parsed.name}.monjson`);
              await writeFile(outPath, result);
              ctx.stats.filesProcessed++;

              task.output = `Built ${parsed.base} → ${parsed.name}.monjson`;
            } catch (error) {
              ctx.stats.errors.push(error as Error);
              throw error;
            }
          },
        },
      ],
      {
        ctx,
        rendererOptions: { collapseSubtasks: false },
      }
    );

    try {
      await tasks.run();

      // Report build results
      consola.success(
        `Build complete! Processed ${ctx.stats.filesProcessed} files`
      );

      if (ctx.stats.errors.length > 0) {
        consola.warn(
          `Encountered ${ctx.stats.errors.length} errors during build:`
        );
        ctx.stats.errors.forEach((err) => consola.error(err.message));
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
