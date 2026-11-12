// Hopefully these will be main-lined into Typescipt, but at the moment TS only declares the Contexts

type ClassAccessorDecorator<This = any, Value = any> = (
    value: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<This, Value> | void

export type ClassGetterDecorator<This = any, Value = any> = (
    value: (this: This) => Value,
    context: ClassGetterDecoratorContext
) => ((this: This) => Value) | void

export type ClassMethodDecorator<This = any, Value extends (...p: any[]) => any = any> = (
    value: Value,
    context: ClassMethodDecoratorContext<This, Value>
) => Value | void

type ClassFieldDecorator<This = any, Value extends (...p: any[]) => any = any> = (
    value: Value,
    context: ClassFieldDecoratorContext<This, Value>
) => Value | void

export type ClassMethodAndFieldDecorator = ClassMethodDecorator & ClassFieldDecorator

export type ClassAccessorAndFieldDecorator = ClassAccessorDecorator & ClassFieldDecorator
