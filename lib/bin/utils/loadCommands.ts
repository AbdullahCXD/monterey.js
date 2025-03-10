import { Command as CommanderCommand } from "commander";
import { Command } from "../commands/base/Command";
import { InitCommand } from "../commands/init";
import { BuildCommand } from "../commands/build";
import { RunCommand } from "../commands/run";
import { VersionCommand } from "../commands/version";
import { WatchCommand } from "../commands/watch";
import { Jsify } from "../commands/jsify";

export function loadCommands(program: CommanderCommand): void {
    const commands: Command[] = [
        new InitCommand(),
        new BuildCommand(),
        new RunCommand(),
        new VersionCommand(),
        new WatchCommand(),
        new Jsify(),
    ];

    for (const command of commands) {
        command.register(program);
    }
}
