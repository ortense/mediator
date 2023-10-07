export type Primitive = string | number | boolean | null;

export type Value = Primitive | List | Dictionary

export type List = Value[]

export type Dictionary = { [member: string]: Value }

export type MediatorContext = Dictionary

export type MediatorEventListener<T extends MediatorContext> = (ctx: Readonly<T>) => void
export type MediatorContextModifier<T extends MediatorContext> = (ctx: Readonly<T>) => T

export type Mediator<T extends MediatorContext> = {
  on(event: string, handler: MediatorEventListener<T>): void,
  off(event: string, handler: MediatorEventListener<T>): void,
  send(event: string, modifier?: MediatorContextModifier<T>): void,
  getContext(): Readonly<T>
}
