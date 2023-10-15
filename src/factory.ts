import { Mediator, MediatorContext, MediatorEventListener } from './types'

const freezeCopy = <T>(ctx: T): T => Object.freeze(JSON.parse(JSON.stringify(ctx)))

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
