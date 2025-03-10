import { ErrorCodes, MontereyError } from "../errors/MontereyError";
import { MontereyContent, MontereyVariable, MontereyFunction, MontereyClass, JavaScriptLoader } from "../types";
import { Transpiler } from "./Transpiler";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { getMontereyVersion } from "../MontereyHeaders";

export class JavaScriptTranspiler extends Transpiler {
    private variables: MontereyVariable[] = [];
    private functions: MontereyFunction[] = [];
    private classes: MontereyClass[] = [];

    transpile(content: string): string {
        try {
            // Parse JavaScript code into AST
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript']
            });

            // Reset collections
            this.variables = [];
            this.functions = [];
            this.classes = [];
            let javascript;
            let currentFunction: MontereyFunction | null = null;

            // Extract JavaScript top/end code from IIFEs
            const topLevelIIFEs = ast.program.body.filter(node => 
                t.isExpressionStatement(node) && 
                t.isCallExpression(node.expression) &&
                t.isFunctionExpression(node.expression.callee)
            );

            if (topLevelIIFEs.length) {
                javascript = {
                    top: this.extractIIFEContent(topLevelIIFEs[0]),
                    end: topLevelIIFEs[1] ? this.extractIIFEContent(topLevelIIFEs[1]) : undefined,
                    async: this.hasAsyncIIFE(topLevelIIFEs)
                };
            }

            // Traverse AST and collect declarations
            traverse(ast, {
                FunctionDeclaration: {
                    enter: (path) => {
                        // Filter out variable declarations and return statements
                        const rawStatements = path.node.body.body
                            .filter(stmt => 
                                !t.isVariableDeclaration(stmt) && 
                                !t.isReturnStatement(stmt) &&
                                !t.isFunctionDeclaration(stmt))
                            .map(stmt => this.generateCode(stmt))
                            .filter(code => code !== '');

                        currentFunction = {
                            name: path.node.id?.name || 'anonymous',
                            parameters: path.node.params.map(param => ({
                                name: (param as t.Identifier).name,
                                nullable: false
                            })),
                            body: {
                                variables: [],
                                functions: [],
                                raw: rawStatements,
                                return: this.extractReturnStatement(path.node.body)
                            }
                        };
                        this.functions.push(currentFunction);
                    },
                    exit: () => {
                        currentFunction = null;
                    }
                },

                VariableDeclaration: (path) => {
                    path.node.declarations.forEach(decl => {
                        if (t.isIdentifier(decl.id)) {
                            const variable = {
                                name: decl.id.name,
                                immutable: path.node.kind === 'const',
                                value: this.extractValue(decl.init)
                            };

                            // Add variable to current function scope or global scope
                            if (currentFunction) {
                                currentFunction.body.variables.push(variable);
                            } else {
                                this.variables.push(variable);
                            }
                        }
                    });
                },

                ClassDeclaration: {
                    enter: (path) => {
                        const cls: MontereyClass = {
                            name: path.node.id?.name || 'anonymous',
                            constructor: {
                                paramters: this.extractConstructorParams(path.node)
                            },
                            body: {
                                variables: [],
                                functions: this.extractClassMethods(path.node)
                            }
                        };
                        this.classes.push(cls);
                    }
                }
            });

            // Generate Monterey JSON
            const montereyContent: MontereyContent = {
                $schema: "https://raw.githubusercontent.com/AbdullahCXD/monterey.js/refs/heads/develop/schema/monterey.schema.json",
                header: {
                    montereyVersion: getMontereyVersion(),
                    environment: [],
                    settings: {
                        loadDotenv: false
                    }
                },
                variables: this.variables,
                functions: this.functions,
                classes: this.classes,
                javascript: javascript as JavaScriptLoader | undefined
            };

            return JSON.stringify(montereyContent, null, 2);
        } catch (err) {
            throw new MontereyError(
                ErrorCodes.TRANSPILE_ERROR,
                "Failed to transpile JavaScript to Monterey",
                { causedBy: (err as Error).message }
            );
        }
    }

    private extractValue(node: t.Expression | null | undefined): any {
        if (!node) return undefined;
        
        if (t.isLiteral(node)) {
            if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) {
                return node.value;
            }
            if (t.isNullLiteral(node)) {
                return null;
            }
            return undefined;
        }
        
        if (t.isBinaryExpression(node)) {
            if (t.isExpression(node.left) && t.isExpression(node.right)) {
                return `($globdef:${this.extractValue(node.left)}) ${node.operator} ($globdef:${this.extractValue(node.right)})`;
            }
            return undefined;
        }
        
        if (t.isCallExpression(node)) {
            if (t.isIdentifier(node.callee)) {
                return `$${this.extractValue(node.callee)}()`;
            }
            return undefined;
        }
        
        if (t.isIdentifier(node)) {
            return node.name;
        }

        if (t.isMemberExpression(node)) {
            const object = this.extractValue(node.object as t.Expression);
            const property = t.isIdentifier(node.property) ? node.property.name : '';
            return `${object}.${property}`;
        }

        return undefined;
    }

    private extractReturnStatement(body: t.BlockStatement): string {
        const returnStatement = body.body.find(stmt => t.isReturnStatement(stmt));
        if (returnStatement && t.isReturnStatement(returnStatement) && returnStatement.argument) {
            return this.extractValue(returnStatement.argument);
        }
        return 'undefined';
    }

    private extractConstructorParams(classNode: t.ClassDeclaration): MontereyFunction['parameters'] {
        const constructor = classNode.body.body.find(
            member => t.isClassMethod(member) && member.kind === 'constructor'
        ) as t.ClassMethod;

        if (!constructor) return [];

        return constructor.params.map(param => ({
            name: (param as t.Identifier).name,
            nullable: false
        }));
    }

    private extractClassMethods(classNode: t.ClassDeclaration): MontereyFunction[] {
        return classNode.body.body
            .filter(member => t.isClassMethod(member) && member.kind !== 'constructor')
            .map(method => {
                const classMethod = method as t.ClassMethod;
                return {
                    name: (classMethod.key as t.Identifier).name,
                    parameters: classMethod.params.map(param => ({
                        name: (param as t.Identifier).name,
                        nullable: false
                    })),
                    body: {
                        variables: [],
                        functions: [],
                        raw: [],
                        return: this.extractReturnStatement(classMethod.body as t.BlockStatement)
                    }
                };
            });
    }

    private extractIIFEContent(node: t.Node): string {
        if (t.isExpressionStatement(node) && 
            t.isCallExpression(node.expression) && 
            t.isFunctionExpression(node.expression.callee)) {
            const body = node.expression.callee.body.body;
            if (body.length && t.isExpressionStatement(body[0])) {
                return this.extractValue(body[0].expression) || 'undefined';
            }
        }
        return 'undefined';
    }

    private hasAsyncIIFE(iifes: t.Node[]): boolean {
        return iifes.some(node => {
            if (t.isExpressionStatement(node) && 
                t.isCallExpression(node.expression) && 
                t.isFunctionExpression(node.expression.callee)) {
                return node.expression.callee.async;
            }
            return false;
        });
    }

    private generateCode(node: t.Statement): string {
        if (t.isExpressionStatement(node)) {
            const expr = node.expression;
            if (t.isCallExpression(expr)) {
                const callee = expr.callee;
                if (t.isMemberExpression(callee)) {
                    // Handle member expressions like console.log
                    const object = this.extractValue(callee.object as t.Expression);
                    const property = t.isIdentifier(callee.property) ? callee.property.name : '';
                    const args = expr.arguments.map(arg => this.extractValue(arg as t.Expression));
                    return `${object}.${property}(${args.join(', ')})`;
                } else {
                    // Handle regular function calls
                    return this.extractValue(expr);
                }
            }
            return this.extractValue(expr);
        }
        return '';
    }
}
