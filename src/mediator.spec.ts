import { describe, it, mock } from 'node:test'
import assert from 'assert'
import { createMediator } from './factory'

type Context = { done: boolean }

describe('mediator context', () => {
  describe('when mediator is created', () => {
    it('should not use initial context as reference', (test) => {
      const initial = { done: false }
      const mediator = createMediator(initial)
      assert.notEqual(initial, mediator.getContext())
      assert.deepEqual(initial, mediator.getContext())
      assert.notEqual(mediator.getContext(), mediator.getContext())
    })
  })

  describe('dispatch', () => {
    it('it should call event reducer', () => {
      const initial = { done: false }
      const mediator = createMediator(initial)
      const toggle = mock.fn((ctx: Context) => ({ done: !ctx.done }))
      
      mediator.send('toggle', toggle)

      assert.deepEqual(mediator.getContext(), { done: true })
      assert.deepEqual(toggle.mock.calls[0].arguments, [{ done: false }])
      assert.equal(toggle.mock.callCount(), 1)
    })

    it('it should call event handlers', () => {
      const initial = { done: false }
      const mediator = createMediator(initial)
      const toggle = (ctx: Context) => ({ done: !ctx.done })
      const handler1 = mock.fn()
      const handler2 = mock.fn()
      
      mediator.on('toggle', handler1)
      mediator.on('toggle', handler2)
      mediator.send('toggle', toggle)

      assert.equal(handler1.mock.callCount(), 1)
      assert.equal(handler2.mock.callCount(), 1)
      assert.deepEqual(handler1.mock.calls[0].arguments, [{ done: true }])
      assert.deepEqual(handler2.mock.calls[0].arguments, [{ done: true }])
    })

    describe('when remove event handler', () => {
      it('it should call event handlers', () => {
        const initial = { done: false }
        const mediator = createMediator(initial)
        const toggle = (ctx: Context) => ({ done: !ctx.done })
        const handler1 = mock.fn()
        const handler2 = mock.fn()
        
        mediator.on('toggle', handler1)
        mediator.on('toggle', handler2)
        mediator.send('toggle', toggle)
        mediator.off('toggle', handler2)
        mediator.send('toggle', toggle)
  
        assert.equal(handler1.mock.callCount(), 2)
        assert.equal(handler2.mock.callCount(), 1)
      })
    })
  })
})