import { Mediator, MediatorContext, MediatorEventListener } from './types'

const freezeCopy = <T>(ctx: T): T => Object.freeze(JSON.parse(JSON.stringify(ctx)))

export function createMediator <T extends MediatorContext>(initialContext: T): Mediator<T> {
  const handlers = new Map<string, Array<MediatorEventListener<T>>>()
  let context = freezeCopy(initialContext)

  return {
    on: (event, handler) => {
      const eventHandlers = handlers.get(event) || []
      handlers.set(event, [...eventHandlers, handler])
    },

    off: (event, handler) => {
      const eventHandlers = handlers.get(event)
      if(eventHandlers === undefined) {
        return
      }

      handlers.set(event, eventHandlers.filter((fn) => fn !== handler))
    },

    send: (event, reducer) => {
      if(reducer) {
        context = freezeCopy(reducer(context))
      }

      const eventHandlers = handlers.get(event)

      if(eventHandlers !== undefined) {
        eventHandlers.forEach(fn => fn(context))
      }
    },

    getContext: () => freezeCopy(context),
  }
}
