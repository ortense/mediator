import { afterEach, describe, expect, it, vitest } from "vitest";
import { createMediator } from "./factory";
import type { MediatorMiddleware, MediatorMiddlewareInput } from "./types";

type Context = { count: number; message: string };
const initial: Context = { count: 0, message: "hello" } as const;

// Helper function to safely get count from pendingChanges or context
const getCount = (ctx: Context, pendingChanges: unknown): number => {
	if (
		pendingChanges &&
		typeof pendingChanges === "object" &&
		"count" in pendingChanges
	) {
		return (pendingChanges as { count: number }).count;
	}
	return ctx.count;
};

describe("Mediator Middleware", () => {
	afterEach(() => {
		vitest.clearAllMocks();
	});

	describe("execution order", () => {
		let order: string[] = [];
		const middleware1: MediatorMiddleware<Context, "test" | "other"> =
			vitest.fn((ctx, input) => {
				order.push("middleware1");
				return {
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 1,
						message: "middleware1",
					},
				};
			});
		const middleware2: MediatorMiddleware<Context, "test" | "other"> =
			vitest.fn((ctx, input) => {
				order.push("middleware2");
				return {
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 2,
						message: "middleware2",
					},
				};
			});
		const wildcardMiddleware: MediatorMiddleware<Context, "test" | "other"> =
			vitest.fn((ctx, input) => {
				order.push("wildcard");
				return {
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 10,
						message: "wildcard",
					},
				};
			});

		const createExecutionMediator = () =>
			createMediator<Context, "test" | "other">(
				{ count: 0, message: "initial" },
				{
					middlewares: [
						{ event: "test", handler: middleware1 },
						{ event: "test", handler: middleware2 },
						{ event: "*", handler: wildcardMiddleware },
					],
				},
			);

		let executionMediator = createExecutionMediator();

		afterEach(() => {
			order = [];
			executionMediator = createExecutionMediator();
		});

		it("should execute middleware before event listeners", () => {
			const listener = vitest.fn();
			executionMediator.on("test", listener);

			executionMediator.send("test");

			expect(middleware1).toHaveBeenCalledTimes(1);
			expect(middleware2).toHaveBeenCalledTimes(1);
			expect(wildcardMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(order).toEqual(["middleware1", "middleware2", "wildcard"]);
		});

		it("should execute multiple middlewares in registration order", () => {
			executionMediator.send("test");

			expect(middleware1).toHaveBeenCalledTimes(1);
			expect(middleware2).toHaveBeenCalledTimes(1);
			expect(wildcardMiddleware).toHaveBeenCalledTimes(1);
			expect(order).toEqual(["middleware1", "middleware2", "wildcard"]);
			expect(executionMediator.getContext()).toEqual({
				count: 13, // 1 (middleware1) + 2 (middleware2) + 10 (wildcard) - accumulated
				message: "wildcard", // Last middleware wins
			});
		});

		it("should execute wildcard middleware for all events", () => {
			executionMediator.send("test");
			executionMediator.send("other");

			expect(middleware1).toHaveBeenCalledTimes(1); // Only for "test"
			expect(middleware2).toHaveBeenCalledTimes(1); // Only for "test"
			expect(wildcardMiddleware).toHaveBeenCalledTimes(2); // For both events
			expect(order).toEqual([
				"middleware1",
				"middleware2",
				"wildcard",
				"wildcard",
			]);
		});

		it("should execute specific middleware only for matching events", () => {
			executionMediator.send("other");

			expect(middleware1).toHaveBeenCalledTimes(0); // Not for "other"
			expect(middleware2).toHaveBeenCalledTimes(0); // Not for "other"
			expect(wildcardMiddleware).toHaveBeenCalledTimes(1); // Only wildcard for "other"
			expect(order).toEqual(["wildcard"]);
			expect(executionMediator.getContext()).toEqual({
				count: 10, // Only wildcard middleware
				message: "wildcard",
			});
		});
	});

	describe("event cancellation", () => {
		it("should cancel event processing when middleware returns cancel: true", () => {
			const cancelMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					cancel: true,
				}),
			);
			const listener = vitest.fn();

			const cancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: cancelMiddleware }],
			});
			cancelMediator.on("test", listener);

			cancelMediator.send("test", () => ({ count: 5 }));

			expect(cancelMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(0);
			expect(cancelMediator.getContext()).toEqual(initial);
		});

		it("should prevent event listeners from executing when cancelled", () => {
			const cancelMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					cancel: true,
				}),
			);
			const specificListener = vitest.fn();
			const wildcardListener = vitest.fn();

			const cancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: cancelMiddleware }],
			});
			cancelMediator.on("test", specificListener);
			cancelMediator.on("*", wildcardListener);

			cancelMediator.send("test");

			expect(cancelMiddleware).toHaveBeenCalledTimes(1);
			expect(specificListener).toHaveBeenCalledTimes(0);
			expect(wildcardListener).toHaveBeenCalledTimes(0);
		});

		it("should not modify context when event is cancelled", () => {
			const cancelMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					cancel: true,
				}),
			);

			const cancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: cancelMiddleware }],
			});

			cancelMediator.send("test", () => ({ count: 10, message: "modified" }));

			expect(cancelMediator.getContext()).toEqual(initial);
		});

		it("should handle cancel middleware at different positions in chain", () => {
			const modifyMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 1,
					},
				}),
			);
			const cancelMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					cancel: true,
				}),
			);
			const listener = vitest.fn();

			// Cancel as first middleware
			const firstCancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [
					{ event: "test", handler: cancelMiddleware },
					{ event: "test", handler: modifyMiddleware },
				],
			});
			firstCancelMediator.on("test", listener);
			firstCancelMediator.send("test");

			expect(cancelMiddleware).toHaveBeenCalledTimes(1);
			expect(modifyMiddleware).toHaveBeenCalledTimes(0);
			expect(listener).toHaveBeenCalledTimes(0);
			expect(firstCancelMediator.getContext()).toEqual(initial);

			vitest.clearAllMocks();

			// Cancel as last middleware
			const lastCancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [
					{ event: "test", handler: modifyMiddleware },
					{ event: "test", handler: cancelMiddleware },
				],
			});
			lastCancelMediator.on("test", listener);
			lastCancelMediator.send("test");

			expect(modifyMiddleware).toHaveBeenCalledTimes(1);
			expect(cancelMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(0);
			expect(lastCancelMediator.getContext()).toEqual(initial);
		});
	});

	describe("context modification", () => {
		it("should apply middleware context changes incrementally", () => {
			const contextMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 5,
					},
				}),
			);
			const listener = vitest.fn();

			const contextMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: contextMiddleware }],
			});
			contextMediator.on("test", listener);

			contextMediator.send("test", () => ({ count: 10 }));

			expect(contextMiddleware).toHaveBeenCalledWith(
				{ count: 0, message: "hello" },
				{ pendingChanges: { count: 10 } },
				"test",
			);
			expect(listener).toHaveBeenCalledWith(
				{ count: 15, message: "hello" }, // 10 (modifier) + 5 (middleware)
				"test",
			);
		});

		it("should handle incremental context updates between middlewares", () => {
			const firstMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 2,
					},
				}),
			);
			const secondMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 3,
					},
				}),
			);
			const listener = vitest.fn();

			const incrementalMediator = createMediator<Context, "test">(initial, {
				middlewares: [
					{ event: "test", handler: firstMiddleware },
					{ event: "test", handler: secondMiddleware },
				],
			});
			incrementalMediator.on("test", listener);

			incrementalMediator.send("test");

			expect(firstMiddleware).toHaveBeenCalledWith(
				{ count: 0, message: "hello" },
				{ pendingChanges: null },
				"test",
			);
			expect(secondMiddleware).toHaveBeenCalledWith(
				{ count: 0, message: "hello" }, // Same context for all middlewares
				{ pendingChanges: { count: 2 } },
				"test",
			);
			expect(listener).toHaveBeenCalledWith(
				{ count: 5, message: "hello" }, // 2 (first) + 3 (second)
				"test",
			);
		});
	});

	describe("event matching", () => {
		it("should not execute middlewares for non-matching events", () => {
			const nonMatchingMiddleware: MediatorMiddleware<
				Context,
				"test" | "other"
			> = vitest.fn();
			const listener = vitest.fn();

			const matchingMediator = createMediator<Context, "test" | "other">(
				initial,
				{
					middlewares: [{ event: "other", handler: nonMatchingMiddleware }],
				},
			);
			matchingMediator.on("test", listener);

			matchingMediator.send("test");

			expect(nonMatchingMiddleware).toHaveBeenCalledTimes(0);
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it("should execute wildcard middleware for any event", () => {
			const wildcardMiddleware: MediatorMiddleware<Context, "test" | "other"> =
				vitest.fn((ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 1,
					},
				}));

			const wildcardMediator = createMediator<Context, "test" | "other">(
				initial,
				{
					middlewares: [{ event: "*", handler: wildcardMiddleware }],
				},
			);

			wildcardMediator.send("test");
			wildcardMediator.send("other");

			expect(wildcardMiddleware).toHaveBeenCalledTimes(2);
			expect(wildcardMediator.getContext()).toEqual({
				count: 2,
				message: "hello",
			});
		});

		it("should execute specific middleware only for exact event match", () => {
			const specificMiddleware: MediatorMiddleware<Context, "test" | "other"> =
				vitest.fn((ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 5,
					},
				}));

			const specificMediator = createMediator<Context, "test" | "other">(
				initial,
				{
					middlewares: [{ event: "test", handler: specificMiddleware }],
				},
			);

			specificMediator.send("test");
			expect(specificMediator.getContext()).toEqual({
				count: 5,
				message: "hello",
			});

			specificMediator.send("other");
			expect(specificMediator.getContext()).toEqual({
				count: 5,
				message: "hello",
			}); // Unchanged

			expect(specificMiddleware).toHaveBeenCalledTimes(1); // Only for "test"
		});
	});

	describe("middleware return types", () => {
		it("should allow void middleware for pass-through behavior", () => {
			const voidMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(); // Returns undefined
			const listener = vitest.fn();

			const voidMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: voidMiddleware }],
			});
			voidMediator.on("test", listener);

			voidMediator.send("test", () => ({ count: 5 }));

			expect(voidMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				{ count: 5, message: "hello" },
				"test",
			);
		});

		it("should allow middleware to override modifier changes with its own changes", () => {
			// Middleware that defines specific changes, ignoring what the modifier tries to do
			const overrideMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					pendingChanges: { count: 100, message: "overridden by middleware" },
				}),
			);
			const listener = vitest.fn();

			const overrideMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: overrideMiddleware }],
			});
			overrideMediator.on("test", listener);

			// Modifier tries to increment count by 5
			overrideMediator.send("test", ({ count }) => ({ count: count + 5 }));

			expect(overrideMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
			// Middleware changes have precedence over modifier changes
			expect(listener).toHaveBeenCalledWith(
				{ count: 100, message: "overridden by middleware" },
				"test",
			);
		});

		it("should cancel processing when middleware returns cancel: true", () => {
			const cancelMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => ({
					cancel: true,
				}),
			);
			const listener = vitest.fn();

			const cancelMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: cancelMiddleware }],
			});
			cancelMediator.on("test", listener);

			cancelMediator.send("test", () => ({ count: 5 }));

			expect(cancelMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(0);
			expect(cancelMediator.getContext()).toEqual(initial);
		});

		it("should handle mixed void and return middlewares", () => {
			const voidMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(); // Returns undefined
			const returnMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(ctx, input) => ({
					pendingChanges: {
						...(input.pendingChanges ?? {}),
						count: getCount(ctx, input.pendingChanges) + 1,
					},
				}),
			);
			const listener = vitest.fn();

			const mixedMediator = createMediator<Context, "test">(initial, {
				middlewares: [
					{ event: "test", handler: voidMiddleware },
					{ event: "test", handler: returnMiddleware },
				],
			});
			mixedMediator.on("test", listener);

			mixedMediator.send("test");

			expect(voidMiddleware).toHaveBeenCalledTimes(1);
			expect(returnMiddleware).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				{ count: 1, message: "hello" },
				"test",
			);
		});
	});

	describe("error handling", () => {
		it("should handle middleware that throws errors", () => {
			const errorMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) => {
					throw new Error("Middleware error");
				},
			);
			const listener = vitest.fn();

			const errorMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: errorMiddleware }],
			});
			errorMediator.on("test", listener);

			expect(() => errorMediator.send("test")).toThrow("Middleware error");
			expect(listener).toHaveBeenCalledTimes(0);
		});

		it("should handle invalid middleware return values", () => {
			const invalidMiddleware: MediatorMiddleware<Context, "test"> = vitest.fn(
				(_ctx, _input) =>
					"invalid" as unknown as MediatorMiddlewareInput<Context>,
			);
			const listener = vitest.fn();

			const invalidMediator = createMediator<Context, "test">(initial, {
				middlewares: [{ event: "test", handler: invalidMiddleware }],
			});
			invalidMediator.on("test", listener);

			// Should not throw but also not process the invalid return
			expect(() => invalidMediator.send("test")).not.toThrow();
			expect(listener).toHaveBeenCalledTimes(1);
			// When middleware returns invalid value, context remains unchanged
			expect(listener).toHaveBeenCalledWith(
				{ count: 0, message: "hello" },
				"test",
			);
		});
	});

	describe("performance", () => {
		it("should efficiently skip non-matching middleware", () => {
			const matchingMiddleware: MediatorMiddleware<Context, "test" | "other"> =
				vitest.fn();
			const nonMatchingMiddleware: MediatorMiddleware<
				Context,
				"test" | "other"
			> = vitest.fn();
			const listener = vitest.fn();

			const performanceMediator = createMediator<Context, "test" | "other">(
				initial,
				{
					middlewares: [
						{ event: "test", handler: matchingMiddleware },
						{ event: "other", handler: nonMatchingMiddleware },
					],
				},
			);
			performanceMediator.on("test", listener);

			performanceMediator.send("test");

			expect(matchingMiddleware).toHaveBeenCalledTimes(1);
			expect(nonMatchingMiddleware).toHaveBeenCalledTimes(0);
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it("should handle large numbers of middlewares", () => {
			const middlewares: Array<{
				event: "test";
				handler: MediatorMiddleware<Context, "test">;
			}> = [];
			const listener = vitest.fn();

			// Create 10 middlewares
			for (let i = 0; i < 10; i++) {
				middlewares.push({
					event: "test",
					handler: vitest.fn((ctx, input) => ({
						pendingChanges: {
							...(input.pendingChanges ?? {}),
							count: getCount(ctx, input.pendingChanges) + 1,
						},
					})),
				});
			}

			const largeMediator = createMediator<Context, "test">(initial, {
				middlewares,
			});
			largeMediator.on("test", listener);

			largeMediator.send("test");

			// All middlewares should be called
			middlewares.forEach(({ handler }) => {
				expect(handler).toHaveBeenCalledTimes(1);
			});
			expect(listener).toHaveBeenCalledWith(
				{ count: 10, message: "hello" },
				"test",
			);
		});
	});
});
