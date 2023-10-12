import { Mediator, MediatorContext, MediatorEventListener } from './types'

const freezeCopy = <T>(ctx: T): T => Object.freeze(JSON.parse(JSON.stringify(ctx)))

export function createMediator <
  Context extends MediatorContext, 
  EventName extends string = string,
>(initialContext: Context): Mediator<Context, EventName> {
  const handlers = new Map<string, Array<MediatorEventListener<Context>>>()
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
        context = freezeCopy(modifier(context))
      }

      const eventHandlers = handlers.get(event)

      if(eventHandlers !== undefined) {
        eventHandlers.forEach(fn => fn(context))
      }
    },

    getContext: () => freezeCopy(context),
  }
}
