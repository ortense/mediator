export type Primitive = string | number | boolean | null;

export type Value = Primitive | List | Dictionary

export type List = Value[]

export type Dictionary = { [member: string]: Value }

export type MediatorContext = Dictionary

export type MediatorEventListener<T extends MediatorContext> = (ctx: Readonly<T>) => void
export type MediatorContextModifier<T extends MediatorContext> = (ctx: Readonly<T>) => T

export type Mediator<T extends MediatorContext, EventName extends string> = {
  on(event: EventName, listener: MediatorEventListener<T>): void,
  off(event: EventName, listener: MediatorEventListener<T>): void,
  send(event: EventName, modifier?: MediatorContextModifier<T>): void,
  getContext(): Readonly<T>
}
