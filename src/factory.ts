import type {
	Mediator,
	MediatorContext,
	MediatorEventListener,
	MediatorOptions,
} from "./types.ts";

const isCancel = (value: unknown): value is { cancel: true } =>
	(value as { cancel?: unknown })?.cancel === true;

const copy = <T>(value: T) => structuredClone(value) as T;

/**
 * Creates a Mediator instance with a specific initial context and optional middleware configuration.
 * @function createMediator
 * @param {Context} initialContext - The initial context for the Mediator.
 * @param {MediatorOptions<Context, EventName>} [options] - Optional configuration including middlewares.
 * @returns {Mediator<Context, EventName>} A Mediator instance with the specified context type and event names.
 * @template {@extends MediatorContext} Context - The type of the MediatorContext.
 * @template {@extends string} [EventName] - The type of the event names. @defaultValue string
 * @example
 * ```
 * type MyEvents = 'item:added' | 'item:removed'
 *
 * interface MyContext extends MediatorContext {
 *   items: number[]
 * }
 *
 * // Basic usage
 * const myMediator = createMediator<MyContext, MyEvents>(initialContext)
 *
 * // With middlewares
 * const myMediator = createMediator<MyContext, MyEvents>(initialContext, {
 *   middlewares: [
 *     { event: '*', handler: logger },
 *     { event: 'item:added', handler: validator }
 *   ]
 * })
 * ```
 */
export function createMediator<
	Context extends MediatorContext,
	EventName extends string = string,
>(
	initialContext: Context,
	options?: MediatorOptions<Context, EventName>,
): Mediator<Context, EventName> {
	const handlers = new Map<
		string,
		Array<MediatorEventListener<Context, EventName>>
	>();

	const middlewares = options?.middlewares ?? [];
	let context = copy(initialContext);

	return {
		on: (event, listener) => {
			handlers.set(event, [...(handlers.get(event) ?? []), listener]);
		},

		off: (event, listener) => {
			const filtered = handlers.get(event)?.filter((fn) => fn !== listener);
			if (filtered) handlers.set(event, filtered);
		},

		send: (event, modifier) => {
			// snapshot readonly for modifier/middlewares
			const snapshot = Object.freeze(copy(context)) as Readonly<Context>;

			// initial pendingChanges calculated from snapshot
			let pendingChanges = modifier?.(snapshot as Context) ?? null;

			// execute middlewares in registration order - ALL receive the SAME immutable snapshot
			for (const { event: evt, handler } of middlewares) {
				if (evt === "*" || evt === event) {
					const result = handler(snapshot, { pendingChanges }, event);
					if (!result) continue;
					if (isCancel(result)) return; // stop without applying anything
					pendingChanges = result.pendingChanges ?? null;
				}
			}

			// apply shallow merge and promote to new state
			if (pendingChanges) {
				context = { ...copy(snapshot), ...pendingChanges };
			}

			handlers.get(event)?.forEach((listener) => {
				listener(context, event);
			});
			// wildcard listeners
			handlers.get("*")?.forEach((listener) => {
				listener(context, event);
			});
		},

		getContext: () => copy(context),
	};
}
