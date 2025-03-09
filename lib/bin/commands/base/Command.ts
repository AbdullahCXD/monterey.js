import { Command as CommanderCommand } from "commander";

export abstract class Command {
    public readonly command: string;
    public readonly description: string;

    constructor(command: string, description: string) {
        this.command = command;
        this.description = description;
    }

    public onCommandInit(program: CommanderCommand): CommanderCommand {
        return program;
    }

    abstract execute(...args: any[]): Promise<void> | void;

    public register(program: CommanderCommand): void {
        let cmd = program
            .command(this.command);

        cmd = this.onCommandInit(cmd)
            .description(this.description)
            .action((...args) => this.execute(...args));
    }
}
