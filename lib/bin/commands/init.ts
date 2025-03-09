import { Command } from "./base/Command";
import { Listr } from "listr2";
import { join } from "path";
import { ProjectConfig } from "../utils/types";
import { createProjectStructure, createMontereyConfig } from "../utils/utils";
import { input } from "@inquirer/prompts";
import { spawnSync } from "child_process";
import { confirm } from "@inquirer/prompts";

export class InitCommand extends Command {
    constructor() {
        super("init [dir]", "Initialize a new Monterey project");
    }

    async execute(dir: string = "."): Promise<void> {
        const projectPath = join(process.cwd(), dir);
        let config: ProjectConfig;

        // Get project info
        config = await this.promptProjectInfo();

        const tasks = new Listr([
            {
                title: "Creating project structure",
                task: async () => await createProjectStructure(projectPath)
            },
            {
                title: "Creating Monterey configuration",
                task: () => createMontereyConfig(config, projectPath)
            },
            {
                title: "Setting up git repository",
                task: async (ctx, task) => {
                    try {
                        if (config.git) {
                            await spawnSync("git init", { cwd: process.cwd(), env: process.env, encoding: "utf-8", stdio: "inherit" });
                        } else {
                            task.skip("No need for git iniialization.");
                        }
                    } catch (err) {
                        task.skip("Git not available");
                    }
                }
            }
        ]);

        await tasks.run();
    }

    private async promptProjectInfo(): Promise<ProjectConfig> {
        const name = await input({ message: "Project name:", default: "monterey-project" });
        const description = await input({ message: "Description:", default: "A Monterey.js project" });
        const author = await input({ message: "Author:" });
        const git = await confirm({ message: "Initialize git?" });

        return {
            name,
            description,
            author,
            git,
            version: "0.1.0"
        };
    }
}
