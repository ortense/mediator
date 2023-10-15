import { vitest, describe, it, expect } from 'vitest'
import { createMediator } from './factory'

type Context = { done: boolean }
const initial = { done: false }

describe('Mediator', () => {
  describe('when mediator is created', () => {
    it('should not use initial context as reference', () => {
      const mediator = createMediator(initial)
      expect(initial).toEqual(mediator.getContext())
      expect(initial).not.toBe(mediator.getContext())
      expect(mediator.getContext()).not.toBe(mediator.getContext())
    })
  })

  describe('when send and envent', () => {
    it('it should call event modifier', () => {
      type EventName = 'toggle'
      const mediator = createMediator<Context, EventName>(initial)
      const toggle = vitest.fn((ctx: Context) => ({ done: !ctx.done }))
      
      mediator.send('toggle', toggle)

      expect(mediator.getContext()).toEqual({ done: true })
      expect(toggle).toHaveBeenCalledWith({ done: false })
      expect(toggle).toHaveBeenCalledTimes(1)
    })

    it('it should call event listeners', () => {
      const mediator = createMediator<Context, 'toggle' | 'done'>({ done: true })

      const listenerOne = vitest.fn()
      const listenerTwo = vitest.fn()
      const listenerDone = vitest.fn()
      
      mediator.on('toggle', listenerOne)
      mediator.on('toggle', listenerTwo)
      mediator.on('done', listenerDone)

      mediator.send('toggle', (ctx: Context) => ({ done: !ctx.done }))
      mediator.send('done', () => ({ done: true }))

      expect(listenerOne).toHaveBeenCalledTimes(1)
      expect(listenerOne).toHaveBeenCalledTimes(1)
      expect(listenerOne).toBeCalledWith({ done: false }, 'toggle')
      expect(listenerTwo).toBeCalledWith({ done: false }, 'toggle')
      expect(listenerDone).toBeCalledWith({ done: true }, 'done')
    })
  })

  describe('when remove event listener', () => {
    it('it should call event listeners', () => {
      const mediator = createMediator(initial)
      const toggle = (ctx: Context) => ({ done: !ctx.done })
      const listenerOne = vitest.fn()
      const listenerTwo = vitest.fn()
      
      mediator.on('toggle', listenerOne)
      mediator.on('toggle', listenerTwo)
      mediator.send('toggle', toggle)
      mediator.off('toggle', listenerTwo)
      mediator.send('toggle', toggle)

      expect(listenerOne).toHaveBeenCalledTimes(2)
      expect(listenerTwo).toHaveBeenCalledTimes(1)
    })

    describe('when try remove an invalid listener', () => {
      it('should return undefined', () => {
        const mediator = createMediator(initial)
        expect(mediator.off('test', () => {})).toBeUndefined()
      })
    })
  })

  describe('when context is overwrited', () => {
    it('should preserve the original context', () => {
      const mediator = createMediator(initial)
      const expected = { done: true }
      mediator.send('toggle', (ctx) => ({ done: !ctx.done }))
      mediator.send('overwrite', () => ({}) as Context)
      expect(mediator.getContext()).toEqual(expected)
    })
  })

  describe('when using wildcard', () => {
    it('should execute the wildcard listener for any event', () => {
      const mediator = createMediator<Context, 'one' | 'two'>(initial)
      const listener = vitest.fn()

      mediator.on('*', listener)
      mediator.send('one')
      mediator.send('two')

      expect(listener).toBeCalledTimes(2)
      expect(listener).toHaveBeenNthCalledWith(1, initial, 'one')
      expect(listener).toHaveBeenNthCalledWith(2, initial, 'two')
    })

    describe('when remove wildcard listener', () => {
      it('should stop execute listener', () => {
        const mediator = createMediator<Context, 'one' | 'two'>(initial)
        const listener = vitest.fn()

        mediator.on('*', listener)
        mediator.send('one')
        mediator.off('*', listener)
        mediator.send('two')

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenNthCalledWith(1, initial, 'one')
      })
    })
  })
})
