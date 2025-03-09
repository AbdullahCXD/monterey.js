import { program } from "commander";
import { loadCommands } from "./utils/loadCommands";
import pkg from "../../package.json";

function initializeProgram() {
    program
        .name("monterey")
        .description("Monterey.js CLI - Transform JSON into JavaScript")
        .version(pkg.version);

    loadCommands(program);
    program.parse();
}

initializeProgram();