import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import path, { join } from 'path';
import { ProjectConfig } from './types';
import { glob } from "glob";

export const _MONTEREY_CONFIG_NAME_ = "config.monterey.json";
export const _MONTEREY_MAIN_ENTRY_ = `main.monjson`;

export function createBase(projectPath: string, name: string) {
    const baseCode = {
        "$schema": "https://raw.githubusercontent.com/AbdullahCXD/monterey.js/refs/heads/develop/schema/monterey.schema.json",
        "header": {
            "montereyVersion": "1.0.0"
        },
        "variables": []
    };
    writeFileSync(
        join(projectPath, name),
        JSON.stringify(baseCode, null, 2)
    );
}

export async function createProjectStructure(projectPath: string) {
    const dirs: string[] = [];
    dirs.forEach(dir => mkdirSync(join(projectPath, dir), { recursive: true }));
    createBase(projectPath, _MONTEREY_MAIN_ENTRY_);
}

export function createMontereyConfig(config: ProjectConfig, projectPath: string) {
    const montereyConfig = {
        main: _MONTEREY_MAIN_ENTRY_
    };

    writeFileSync(
        join(projectPath, _MONTEREY_CONFIG_NAME_),
        JSON.stringify(montereyConfig, null, 2)
    );
}

export function doesMontereyConfigExist(projectPath: string) {
    return existsSync(path.join(projectPath, _MONTEREY_CONFIG_NAME_));
}

export function getMontereyConfig(projectPath: string): ProjectConfig | undefined {
    if (!doesMontereyConfigExist(projectPath)) return undefined;
    const data = readFileSync(path.join(projectPath, _MONTEREY_CONFIG_NAME_), "utf-8");
    return JSON.parse(data);
}

export async function findMontereyFiles(dir: string): Promise<string[]> {
    return glob("**/*.monjson", {
        cwd: dir,
        ignore: ["node_modules/**", "dist/**"],
        absolute: true
    });
}