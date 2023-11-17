import { Mediator, MediatorContext, MediatorEventListener } from './types.ts'

const freezeCopy = <T>(ctx: T): T => Object.freeze(JSON.parse(JSON.stringify(ctx)))

/**
 * Creates a Mediator instance with a specific initial context.
 * @function createMediator
 * @param {Context} initialContext - The initial context for the Mediator.
 * @returns {Mediator<Context, EventName>} A Mediator instance with the specified context type and event names.
 * @template {@extends MediatorContext} Context - The type of the MediatorContext.
 * @template {@extends string} [EventName] - The type of the event names. @defaultValue string
 * @example
 * ```
 * type MyEvents =  'item:added' | 'item:removed'
 * 
 * interface MyContext extends MediatorContext {
 *   items: number[]
 * }
 * 
 * const myMediator = createMediator<MyContext, MyEvents>(initialContext)
 * ```
 */
export function createMediator <
  Context extends MediatorContext, 
  EventName extends string = string,
>(initialContext: Context): Mediator<Context, EventName> {
  const handlers = new Map<string, Array<MediatorEventListener<Context, EventName>>>()
  let context = freezeCopy(initialContext)

  return {
    on: (event, listener) => {
      const listeners = handlers.get(event) || []
      handlers.set(event, [...listeners, listener])
    },

    off: (event, listener) => {
      const listeners = handlers.get(event)
      if(listeners === undefined) {
        return
      }

      handlers.set(event, listeners.filter((fn) => fn !== listener))
    },

    send: (event, modifier) => {
      if(modifier) {
        context = freezeCopy({ ...context, ...modifier(context) })
      }

      handlers.get(event)?.forEach(fn => fn(context, event))
      handlers.get('*')?.forEach(fn => fn(context, event))
    },

    getContext: () => freezeCopy(context),
  }
}
