import { onBecomeUnobserved, configure, computed, _resetGlobalState } from "../../../src/mobx"

describe("Configuring warning severity", () => {
    let consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

    beforeEach(() => _resetGlobalState())

    it("Should default to console.warn when not configured", () => {
        const a = computed(() => console.log("b"), { requiresReaction: true })
        onBecomeUnobserved(a, () => console.log("c"))
        a.get()

        expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it("Should throw an exception when configured with 'throw'", () => {
        configure({ warningSeverity: { computedRequiresReaction: "throw" } })

        const a = computed(() => console.log("b"), { requiresReaction: true })
        onBecomeUnobserved(a, () => console.log("c"))

        expect(() => a.get()).toThrow(
            `[mobx] Computed value 'ComputedValue@2' is being read outside a reactive context. Doing a full recompute.`
        )
    })
})
