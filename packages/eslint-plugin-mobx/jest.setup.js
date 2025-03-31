/** @see https://github.com/jsdom/jsdom/issues/3363 */
global.structuredClone = val => {
    return JSON.parse(JSON.stringify(val))
}
