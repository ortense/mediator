/** Represents a JSON primitive serializable value that can be a string, number, boolean, or null. */
export type JSONPrimitive = string | number | boolean | null

/** Represents a JSON serializable value that can be a primitive, a array, or a object. */
export type JSONValue = JSONPrimitive | JSONArray | JSONObject

/** Represents a array of of JSON serializable values. */
export type JSONArray = JSONValue[]

/** Represents a dictionary (object) with string keys and values of type JSONValue. */
export type JSONObject = { [member: string]: JSONValue }

/** Represents a context for the Mediator, which is a JSON serializable object. */
export type MediatorContext = JSONObject

/** Represents an event that acts as a wildcard, matching any event. */
export type WildcardEvent = '*'

/** Represents a listener function for Mediator events. */
export type MediatorEventListener<Context extends MediatorContext, EventName extends string> = (ctx: Readonly<Context>, eventName: EventName) => void

/** Represents a context modifier function for Mediator events. */
export type MediatorContextModifier<Context extends MediatorContext> = (ctx: Readonly<Context>) => Context

/**
 * @interface Mediator
 * @description Represents a Mediator instance with specific context and event names.
 * @template Context - The type of the MediatorContext.
 * @template EventName - The type of the event names.
 */
export type Mediator<Context extends MediatorContext, EventName extends string> = {
  /**
   * Adds an event listener to the Mediator.
   * @method
   * @param {WildcardEvent | EventName} event - The event name or a wildcard event.
   * @param {MediatorEventListener<Context, EventName>} listener - The listener function for the event.
   * @returns {void}
   * @example
   * ```
   * // to listen to a specific event
   * myMediator.on('item:add', (ctx: Readonly<MyContext>) =>
   *   console.log(`product added`)
   * )
   * 
   * // to listen to any event 
   * myMediator.on('*', (ctx: Readonly<MyContext>, event: MyEvent) =>
   *   console.log(`${event} modify context to`, ctx))
   * )
   * ```
   */
  on(event: WildcardEvent | EventName, listener: MediatorEventListener<Context, EventName>): void

  /**
   * Removes an event listener from the Mediator.
   * @method
   * @param {WildcardEvent | EventName} event - The event name or a wildcard event.
   * @param {MediatorEventListener<Context, EventName>} listener - The listener function to be removed.
   * @returns {void}
   * @example
   * ```
   * // Use .off  to listen the event once
   * const myListener = (ctx: Readonly<MyContext>) => {
   *   console.log('my listener')
   *   myMediator.off('item:purchase', myListener)
   * }
   * myMediator.on('item:purchase', myListener)
   * ```
   */
  off(event: WildcardEvent | EventName, listener: MediatorEventListener<Context, EventName>): void

  /**
   * Sends an event through the Mediator, optionally modifying the context.
   * @method
   * @param {EventName} event - The specific event name.
   * @param {MediatorContextModifier<Context>} [modifier] - The optional context modifier function.
   * @returns {void}
   * @example
   * ```
   * // Send a specific event with context modification.
   * myMediator.send('item:add', (ctx: Readonly<MyContext>) => ({
   *   ...ctx,
   *    items: [...ctx.items, 123]
   * }))
   * 
   * // Send a specific event without context modification.
   * myMediator.send('item:purchase')
   * ```
   */
  send(event: EventName, modifier?: MediatorContextModifier<Context>): void

  /**
   * Gets the current context in a readonly format.
   * @method
   * @returns {Readonly<Context>} The readonly current context.
   * @example
   * ```
   * // Get and log the current context.
   * const currentContext = myMediator.getContext()
   * console.log('Current context:', currentContext)
   * ```
   */
  getContext(): Readonly<Context>
}
