import { Monterey } from "../Monterey";

export abstract class Transpiler {

    constructor() {}

    abstract transpile(content: string): string;
}