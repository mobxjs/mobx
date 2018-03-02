import { asObservableObject, defineObservableProperty } from "../types/observableobject"
import { invariant, assertPropertyConfigurable } from "../utils/utils"
import { createClassPropertyDecorator } from "../utils/decorators"
import { IEnhancer } from "../types/modifiers"
import { createPropDecorator } from "../utils/decorators2"

export function createDecoratorForEnhancer(enhancer: IEnhancer<any>) {
    return createPropDecorator((target: any, propertyName: string, initialValue: string) => {
        defineObservableProperty(target, propertyName, initialValue, enhancer)
    })
}
