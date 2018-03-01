import { asObservableObject, defineObservableProperty } from "../types/observableobject"
import { invariant, assertPropertyConfigurable } from "../utils/utils"
import { createClassPropertyDecorator } from "../utils/decorators"
import { IEnhancer } from "../types/modifiers"

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>) {
    return createClassPropertyDecorator(
        (target, name, baseValue, _, baseDescriptor) => {
            if (process.env.NODE_ENV !== "production") {
                assertPropertyConfigurable(target, name)
                invariant(
                    !baseDescriptor || !baseDescriptor.get,
                    "@observable can not be used on getters, use @computed instead"
                )
            }

            const adm = asObservableObject(target, undefined)
            defineObservableProperty(adm, name, baseValue, enhancer)
        },
        function(name) {
            return this.$mobx.read(name)
        },
        function(name, value) {
            this.$mobx.write(name, value)
        },
        true,
        false
    )
}
