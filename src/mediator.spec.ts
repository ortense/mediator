import { vitest, describe, it, expect } from 'vitest'
import { createMediator } from './factory'

type Context = { done: boolean }
const initial = { done: false }

describe('mediator context', () => {
  describe('when mediator is created', () => {
    it('should not use initial context as reference', () => {
      const mediator = createMediator(initial)
      expect(initial).toEqual(mediator.getContext())
      expect(initial).not.toBe(mediator.getContext())
      expect(mediator.getContext()).not.toBe(mediator.getContext())
    })
  })

  describe('dispatch', () => {
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
      const mediator = createMediator(initial)
      const toggle = (ctx: Context) => ({ done: !ctx.done })
      const listenerOne = vitest.fn()
      const listenerTwo = vitest.fn()
      
      mediator.on('toggle', listenerOne)
      mediator.on('toggle', listenerTwo)
      mediator.send('toggle', toggle)

      expect(listenerOne).toHaveBeenCalledTimes(1)
      expect(listenerOne).toHaveBeenCalledTimes(1)
      expect(listenerOne).toBeCalledWith({ done: true })
      expect(listenerTwo).toBeCalledWith({ done: true })
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
    })

    describe('when try remove an invalid listener', () => {
      it('should return undefined', () => {
        const mediator = createMediator(initial)
        expect(mediator.off('test', () => {})).toBeUndefined()
      })
    })
  })
})
