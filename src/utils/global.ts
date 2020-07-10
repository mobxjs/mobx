export function getGlobal(): any {
    // @ts-ignore
    return typeof global !== "undefined" ? global : window
}
