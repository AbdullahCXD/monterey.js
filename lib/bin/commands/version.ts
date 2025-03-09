import { Command } from "./base/Command";
import { getMontereyVersion } from "../../MontereyHeaders";
import consola from "consola";

export class VersionCommand extends Command {
    constructor() {
        super("version", "Display Monterey version information");
    }

    execute(): void {
        const version = getMontereyVersion();
        consola.info(version);
    }
}
