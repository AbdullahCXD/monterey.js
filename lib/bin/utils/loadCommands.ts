import { Command as CommanderCommand } from "commander";
import { Command } from "../commands/base/Command";
import { InitCommand } from "../commands/init";
import { BuildCommand } from "../commands/build";
import { RunCommand } from "../commands/run";
import { VersionCommand } from "../commands/version";

export function loadCommands(program: CommanderCommand): void {
    const commands: Command[] = [
        new InitCommand(),
        new BuildCommand(),
        new RunCommand(),
        new VersionCommand()
    ];

    for (const command of commands) {
        command.register(program);
    }
}
