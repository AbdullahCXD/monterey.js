import fs, { readFileSync } from "fs";
import path from "path";
import { ErrorCodes, MontereyError } from "./errors/MontereyError";
import {
  getMontereyExtension,
  getMontereyJavaScriptHeader,
} from "./MontereyHeaders";
import { MontereyTranspiler, Transpiler } from "./transpiler";
import { JavaScriptContent, MontereyBuildOptions } from "./types";
import { throwError } from "./utils";

export class Monterey {
  private transpiler?: Transpiler;
  private defaultTranspiler: Transpiler;

  constructor() {
    this.defaultTranspiler = new MontereyTranspiler();
  }

  setTranspiler(transpiler?: Transpiler) {
    if (!transpiler) {
      if (this.transpiler) return;
      this.transpiler = this.defaultTranspiler;
    } else {
      this.transpiler = transpiler;
    }
    return this.transpiler;
  }

  buildJsFile(fileName: `${string}.js`) {
    if (!fileName.endsWith(".js"))
      throw new MontereyError(
        ErrorCodes.INVALID_EXTENSION,
        "The file name extension is invalid. Make sure the extension is `.js`"
      );
    if (!fs.existsSync(fileName))
      throw new MontereyError(
        ErrorCodes.FILE_NOT_FOUND,
        "Unable to find Monterey file, please ensure it exists.",
        { causedBy: fileName }
      );
    try {
      const content = readFileSync(fileName, "utf-8");
      return this.build(content, { header: true });
    } catch (err) {
      throw err;
    }
  }

  buildFile(fileName: string) {
    if (!fileName.endsWith(getMontereyExtension()))
      throw new MontereyError(
        ErrorCodes.INVALID_EXTENSION,
        "The file name extension is invalid. Make sure the extension is `.monjson`"
      );
    if (!fs.existsSync(fileName))
      throw new MontereyError(
        ErrorCodes.FILE_NOT_FOUND,
        "Unable to find Monterey file, please ensure it exists.",
        { causedBy: fileName }
      );
    try {
      const content = readFileSync(fileName, "utf-8");
      return this.build(content);
    } catch (err) {
      throw err;
    }
  }

  build(montereyContent: string, options: MontereyBuildOptions = {}): JavaScriptContent {
    if (!this.transpiler)
      throw new MontereyError(
        ErrorCodes.NO_TRANSPILER,
        "Unable to find the transpiler, please set it using `Monterey#setTranspiler`",
        { causedBy: __filename }
      );
    try {
      const transpiledContent = this.transpiler.transpile(montereyContent);
      return `${options?.header ? getMontereyJavaScriptHeader() + "\n\n" : ""}${transpiledContent}`.trim();
    } catch (err) {
      throw err;
    }
  }
}
