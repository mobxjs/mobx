export function getGlobal(): any {
    // @ts-ignore
    return typeof self !== "undefined" ? self : global
}
