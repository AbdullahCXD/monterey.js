import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import {
  JavaScriptLoader,
  MontereyClass,
  MontereyContent,
  MontereyFunction,
  MontereyVariable,
} from "../types";
import semver from "semver";
import { Transpiler } from "./Transpiler";
import { getMontereyVersion } from "../MontereyHeaders";
import { createTab, formatValue } from "../utils";
import { Environment } from "../badgers/Environment";
import { Invoker } from "../badgers/Invoker";
import { ContextVariables } from "../badgers/Variables";
import { GlobalDefined, GlobalDefinedVariable } from "../badgers/GlobalDefined";

/**
 * Default Monterey transpiler that converts Monterey JSON to readable JavaScript
 * @class MontereyTranspiler
 * @extends {Transpiler}
 */
export class MontereyTranspiler extends Transpiler {
  /** Cache for already written variables to improve performance */
  private readonly variableCache = new Set<string>();
  private readonly functionCache = new Set<string>();
  private environment?: Environment;
  private invoker?: Invoker;
  private variables?: ContextVariables;
  private globaldef?: GlobalDefined;

  constructor() {
    super();
  }

  /**
   * Transpiles Monterey content to JavaScript
   * @param {string} content - Raw Monterey JSON content
   * @returns {string} Transpiled JavaScript code
   * @throws {MontereyError} When content is invalid
   */
  transpile(content: string): string {
    const resolvedJSONCode = this.parseJSONContent(content);
    this.environment = new Environment(resolvedJSONCode);
    this.variables = new ContextVariables(resolvedJSONCode);
    this.invoker = new Invoker(resolvedJSONCode, this.variables!);
    this.globaldef = new GlobalDefined(resolvedJSONCode);
    return this.toJavaScript(resolvedJSONCode);
  }

  /**
   * Converts parsed Monterey content to JavaScript code
   * @param {MontereyContent} content - Parsed Monterey content
   * @returns {string} Generated JavaScript code
   */
  toJavaScript(content: MontereyContent): string {
    const sections = new Map<string, string[]>([
      ["variables", []],
      ["classes", []],
      ["functions", []],
    ]);

    if (content.variables?.length) {
      sections.set("variables", this.resolveVariables(content.variables));
    }

    if (content.functions?.length) {
      sections.set("functions", this.resolveFunctions(content.functions));
    }

    if (content.classes?.length) {
      sections.set("classes", this.resolveClasses(content.classes));
    }

    return this.build(
      content.javascript,
      sections.get("variables") || [],
      sections.get("functions") || [],
      sections.get("classes") || []
    );
  }

  /**
   * Builds final JavaScript output with proper formatting
   * @param {string[]} variables - Processed variable declarations
   * @param {string[]} functions - Processed function declarations
   * @param {string[]} classes - Processed class declarations
   * @returns {string} Formatted JavaScript code
   */
  build(
    javascript: JavaScriptLoader | undefined,
    variables: string[],
    functions: string[],
    classes: string[]
  ): string {
    const sections = [
      { title: "Variables", content: variables },
      { title: "Classes", content: classes },
      { title: "Functions", content: functions },
    ];

    const joinedSections = sections
      .map(
        ({ title, content }) =>
          `/* Generated ${title} */\n${content.join("\n")}\n`
      )
      .filter((section) => section.trim())
      .join("\n");

    let document = ``;
    if (javascript) {
      document = javascript.async
        ? this.createAsyncDocument(javascript.top) +
          `\n\n${joinedSections}\n\n` +
          this.createAsyncDocument(javascript.end)
        : this.createSyncDocument(javascript.top) +
          `\n\n${joinedSections}\n\n` +
          this.createSyncDocument(javascript.end);
    } else {
        document = joinedSections;
    }

    return document;
  }

  createAsyncDocument(document: string) {
    return `(async () => {\n${createTab(2)}${document}\n})();`;
  }

  createSyncDocument(document: string) {
    return `(() => {\n${createTab(2)}${document}\n})()`;
  }

  /**
   * Processes variable declarations
   * @param {MontereyVariable[]} variables - Array of variable definitions
   * @returns {string[]} Processed variable declarations
   * @throws {MontereyError} When duplicate variables are found
   */
  resolveVariables(variables: MontereyVariable[]): string[] {
    this.variableCache.clear();

    return variables.map((variable) => {
      if (this.variableCache.has(variable.name)) {
        throw new MontereyError(
          ErrorCodes.BUILD,
          `Variable already exists: ${variable.name}`
        );
      }

      this.variableCache.add(variable.name);
      const declarationType = variable.immutable ? "const" : "let";
      let baseValue = variable.value;
      // Change order: first resolve invoker (method calls), then variables, then env vars
      if (typeof baseValue === "string") {
        baseValue = this.invoker?.resolve(baseValue) ?? baseValue;
        baseValue = this.variables?.resolve(baseValue) ?? baseValue;
        baseValue = this.environment?.resolve(baseValue) ?? baseValue;
        baseValue = this.globaldef?.resolve(baseValue) ?? baseValue;  
      }
      if (baseValue === variable.value) {
        baseValue = formatValue(baseValue);
      }
      return `${declarationType} ${variable.name} = ${baseValue};`;
    });
  }

  resolveFunctions(
    functions: MontereyFunction[],
    options: { noKeyword: boolean } = { noKeyword: false }
  ): string[] {
    this.functionCache.clear();

    const processedFuncs = functions.map((fn) => {
      if (this.functionCache.has(fn.name)) {
        throw new MontereyError(
          ErrorCodes.BUILD,
          `Function already exists: ${fn.name}`
        );
      }

      this.functionCache.add(fn.name);

      // Register function with invoker
      this.invoker?.addMethods([fn]);

      const methodParameters =
        fn.parameters?.map((param) => {
          return param.nullable ? `${param.name} = undefined` : param.name;
        }) || [];

      const variables = fn.body.variables || [];
      const nestedFunctions = fn.body.functions || [];

      this.variables?.addVariables(variables);

      // Process the return value through all resolvers
      let returnValue = fn.body.return || "undefined";
      returnValue = this.invoker?.resolve(returnValue) ?? returnValue;
      returnValue = this.variables?.resolve(returnValue) ?? returnValue;
      returnValue = this.environment?.resolve(returnValue) ?? returnValue;
      returnValue = this.globaldef?.resolve(returnValue) ?? returnValue;

      const lines = [
        `${!options.noKeyword ? "function" : ""} ${
          fn.name
        }(${methodParameters.join(", ")}) {`,
        ...fn.parameters
          .filter((p) => !p.nullable)
          .map(
            (p) =>
              `    if (${p.name} === undefined) throw new Error("Parameter '${p.name}' is required");`
          ),
        ...this.resolveVariables(variables).map((line) => `    ${line}`),
        ...this.resolveFunctions(nestedFunctions, { noKeyword: true }).map(
          (line) =>
            line
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n")
        ),
        // Add raw statements
        ...(fn.body.raw || []).map(stmt => `    ${stmt};`),
        `    return ${returnValue};`,
        "}",
      ];

      return lines.join("\n");
    });

    return processedFuncs;
  }

  resolveClasses(classes: MontereyClass[]): string[] {
    return classes.map((cls) => {
      // Format constructor parameters with nullability checks
      const constructorParams = cls.constructor.paramters
        .map((param) =>
          param.nullable ? `${param.name} = undefined` : param.name
        )
        .join(", ");

      // Validate non-nullable constructor parameters
      const validations = cls.constructor.paramters
        .filter((param) => !param.nullable)
        .map(
          (param) =>
            `    if (${param.name} === undefined) throw new Error("Parameter '${param.name}' is required in constructor");`
        );

      // Process class body: variables and functions
      const bodyVariables = cls.body.variables
        ? this.resolveVariables(cls.body.variables).map((line) => `    ${line}`)
        : [];
      const bodyFunctions = cls.body.functions
        ? this.resolveFunctions(cls.body.functions, { noKeyword: true }).map(
            (func) =>
              func
                .split("\n")
                .map((l) => `    ${l}`)
                .join("\n")
          )
        : [];

      const lines = [
        `class ${cls.name} {`,
        `  constructor(${constructorParams}) {`,
        ...validations,
        ...bodyVariables,
        `  }`,
        ...bodyFunctions,
        `}`,
      ];
      return lines.join("\n");
    });
  }

  /**
   * Parses and validates Monterey JSON content
   * @param {string} content - Raw JSON content
   * @returns {MontereyContent} Parsed and validated content
   * @throws {MontereyError} When content is invalid
   */
  parseJSONContent(content: string): MontereyContent {
    try {
      // Pre-validate JSON structure
      if (!content || content.trim().length === 0) {
        throw new MontereyError(
          ErrorCodes.TRANSPILE_ERROR,
          "Empty Monterey content",
          { causedBy: __filename }
        );
      }

      const parsed = JSON.parse(content);

      // Validate required fields
      if (!parsed || typeof parsed !== "object") {
        throw new MontereyError(
          ErrorCodes.TRANSPILE_ERROR,
          "Invalid JSON structure",
          { causedBy: __filename }
        );
      }

      if (!("header" in parsed)) {
        throw new MontereyError(
          ErrorCodes.TRANSPILE_ERROR,
          "Missing Monterey header",
          { causedBy: __filename }
        );
      }

      if (!("$schema" in parsed)) {
        throw new MontereyError(
          ErrorCodes.TRANSPILE_ERROR,
          "Missing $schema field",
          { causedBy: __filename }
        );
      }

      const { montereyVersion } = parsed.header;

      // Validate version format
      if (!montereyVersion || typeof montereyVersion !== "string") {
        throw new MontereyError(
          ErrorCodes.INVALID_VERSION,
          "Invalid version format",
          { causedBy: __filename }
        );
      }

      const currentVersion = getMontereyVersion();
      const versionComparison = semver.compare(currentVersion, montereyVersion);

      if (versionComparison === 1) {
        throw new MontereyError(
          ErrorCodes.OUTDATED,
          `Project uses outdated Monterey version ${montereyVersion}. Current version is ${currentVersion}`
        );
      } else if (versionComparison === -1) {
        throw new MontereyError(
          ErrorCodes.INVALID_VERSION,
          `Project requires Monterey version ${montereyVersion} but current version is ${currentVersion}`
        );
      }

      return parsed as MontereyContent;
    } catch (err) {
      if (err instanceof MontereyError) throw err;
      throw new MontereyError(
        ErrorCodes.TRANSPILE_ERROR,
        "Failed to parse Monterey content",
        { causedBy: (err as Error).message }
      );
    }
  }
}
