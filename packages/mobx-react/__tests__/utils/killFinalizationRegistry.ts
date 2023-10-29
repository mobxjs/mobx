// We want to be able to test reaction cleanup code that based on FinalizationRegistry & timers on the same run
// For that we import this file on the beginning on the timer based test to the feature detection will pick the timers impl
// @ts-ignore
global.FinalizationRegistry = undefined
