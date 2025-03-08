export function throwError(err: Error): never {
    console.log(err);
    process.exit(1);
}