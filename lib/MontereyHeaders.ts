import pkgJSON from "../package.json";

export function getMontereyJavaScriptHeader() {
    return `/*
 *
 * Built with Monterey Transpiler
 * 
 * Monterey @ 2025 Monterey Team
 * 
*/`;
}

export function getMontereyExtension() {
    return ".monjson";
}

export function getMontereyVersion() {
    return pkgJSON.version;
}