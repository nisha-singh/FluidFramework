/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";

import { MockHandle, validateAssertionError } from "@fluidframework/test-runtime-utils/internal";

import type { ImplicitAllowedTypes } from "../../../dist/index.js";
import { EmptyKey, type FieldKey, type MapTree } from "../../core/index.js";
import { leaf } from "../../domains/index.js";
import { SchemaFactory, SchemaFactoryRecursive } from "../../simple-tree/index.js";
// eslint-disable-next-line import/no-internal-modules
import type { InsertableContent } from "../../simple-tree/proxies.js";
// eslint-disable-next-line import/no-internal-modules
import { normalizeAllowedTypes } from "../../simple-tree/schemaTypes.js";
// eslint-disable-next-line import/no-internal-modules
import { nodeDataToMapTree as nodeDataToMapTreeBase } from "../../simple-tree/toMapTree.js";
import { brand } from "../../util/index.js";

/**
 * Wrapper around {@link nodeDataToMapTreeBase} which handles the normalization of {@link ImplicitAllowedTypes} as a
 * convenience.
 */
function nodeDataToMapTree(tree: InsertableContent, allowedTypes: ImplicitAllowedTypes): MapTree {
	return nodeDataToMapTreeBase(tree, normalizeAllowedTypes(allowedTypes));
}

describe("toMapTree", () => {
	it("string", () => {
		const schemaFactory = new SchemaFactory("test");
		const tree = "Hello world";

		const actual = nodeDataToMapTree(tree, [schemaFactory.string]);

		const expected: MapTree = {
			type: leaf.string.name,
			value: "Hello world",
			fields: new Map(),
		};

		assert.deepEqual(actual, expected);
	});

	it("null", () => {
		const schemaFactory = new SchemaFactory("test");
		const schema = schemaFactory.null;

		const actual = nodeDataToMapTree(null, [schema]);

		const expected: MapTree = {
			type: leaf.null.name,
			value: null,
			fields: new Map(),
		};

		assert.deepEqual(actual, expected);
	});

	it("handle", () => {
		const schemaFactory = new SchemaFactory("test");
		const schema = schemaFactory.handle;

		const tree = new MockHandle<string>("mock-fluid-handle");

		const actual = nodeDataToMapTree(tree, [schema]);

		const expected: MapTree = {
			type: brand(schemaFactory.handle.identifier),
			value: tree,
			fields: new Map(),
		};

		assert.deepEqual(actual, expected);
	});

	it("recursive", () => {
		const schemaFactory = new SchemaFactoryRecursive("test");
		class Foo extends schemaFactory.objectRecursive("Foo", {
			x: schemaFactory.optionalRecursive(() => Bar),
		}) {}
		class Bar extends schemaFactory.objectRecursive("Bar", {
			y: schemaFactory.optionalRecursive(() => Foo),
		}) {}

		const actual = nodeDataToMapTree(
			{
				x: {
					y: {
						x: undefined,
					},
				},
			},
			Foo,
		);

		const expected: MapTree = {
			type: brand(Foo.identifier),
			fields: new Map<FieldKey, MapTree[]>([
				[
					brand("x"),
					[
						{
							type: brand(Bar.identifier),
							fields: new Map<FieldKey, MapTree[]>([
								[
									brand("y"),
									[
										{
											type: brand(Foo.identifier),
											fields: new Map(),
										},
									],
								],
							]),
						},
					],
				],
			]),
		};

		assert.deepEqual(actual, expected);
	});

	it("Fails when referenced schema has not yet been instantiated", () => {
		const schemaFactory = new SchemaFactoryRecursive("test");

		let Bar: any;
		class Foo extends schemaFactory.objectRecursive("Foo", {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			x: schemaFactory.optionalRecursive(() => Bar),
		}) {}

		const tree = {
			x: {
				y: "Hello world!",
			},
		};

		assert.throws(
			() => nodeDataToMapTree(tree, Foo),
			(error: Error) => validateAssertionError(error, /Encountered an undefined schema/),
		);
	});

	it("Fails when data is incompatible with schema", () => {
		const schemaFactory = new SchemaFactory("test");

		assert.throws(
			() => nodeDataToMapTree("Hello world", [schemaFactory.number]),
			(error: Error) =>
				validateAssertionError(
					error,
					/The provided data is incompatible with all of the types allowed by the schema/,
				),
		);
	});

	describe("array", () => {
		it("Non-empty array", () => {
			const schemaFactory = new SchemaFactory("test");
			const childObjectSchema = schemaFactory.object("child-object", {
				name: schemaFactory.string,
				age: schemaFactory.number,
			});
			const schema = schemaFactory.array("array", [
				schemaFactory.number,
				schemaFactory.handle,
				childObjectSchema,
			]);

			const handle = new MockHandle<boolean>(true);
			const tree = [42, handle, { age: 37, name: "Jack" }];

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.array"),
				fields: new Map<FieldKey, MapTree[]>([
					[
						EmptyKey,
						[
							{
								type: leaf.number.name,
								value: 42,
								fields: new Map(),
							},
							{
								type: leaf.handle.name,
								value: handle,
								fields: new Map(),
							},
							{
								type: brand(childObjectSchema.identifier),
								fields: new Map<FieldKey, MapTree[]>([
									[
										brand("name"),
										[
											{
												type: leaf.string.name,
												value: "Jack",
												fields: new Map(),
											},
										],
									],
									[
										brand("age"),
										[
											{
												type: leaf.number.name,
												value: 37,
												fields: new Map(),
											},
										],
									],
								]),
							},
						],
					],
				]),
			};

			assert.deepEqual(actual, expected);
		});

		it("Empty array", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.array("array", schemaFactory.number);

			const tree: number[] = [];

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.array"),
				fields: new Map<FieldKey, MapTree[]>(),
			};

			assert.deepEqual(actual, expected);
		});
	});

	describe("map", () => {
		it("Non-empty map", () => {
			const schemaFactory = new SchemaFactory("test");
			const childObjectSchema = schemaFactory.object("child-object", {
				name: schemaFactory.string,
				age: schemaFactory.number,
			});
			const schema = schemaFactory.map("map", [
				childObjectSchema,
				schemaFactory.number,
				schemaFactory.string,
				schemaFactory.null,
			]);

			const entries: [string, InsertableContent][] = [
				["a", 42],
				["b", "Hello world"],
				["c", null],
				["d", undefined as unknown as InsertableContent], // Should be skipped in output
				["e", { age: 37, name: "Jill" }],
			];
			const tree = new Map<string, InsertableContent>(entries);

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.map"),
				fields: new Map<FieldKey, MapTree[]>([
					[brand("a"), [{ type: leaf.number.name, value: 42, fields: new Map() }]],
					[
						brand("b"),
						[{ type: leaf.string.name, value: "Hello world", fields: new Map() }],
					],
					[brand("c"), [{ type: brand(leaf.null.name), value: null, fields: new Map() }]],
					[
						brand("e"),
						[
							{
								type: brand(childObjectSchema.identifier),
								fields: new Map([
									[
										brand("name"),
										[
											{
												type: leaf.string.name,
												value: "Jill",
												fields: new Map(),
											},
										],
									],
									[
										brand("age"),
										[
											{
												type: leaf.number.name,
												value: 37,
												fields: new Map(),
											},
										],
									],
								]),
							},
						],
					],
				]),
			};

			assert.deepEqual(actual, expected);
		});

		it("Empty map", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.map("map", [schemaFactory.number]);

			const tree = new Map<string, number>();

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.map"),
				fields: new Map<FieldKey, MapTree[]>(),
			};

			assert.deepEqual(actual, expected);
		});
	});

	describe("object", () => {
		it("Empty object", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.object("object", {
				a: schemaFactory.optional(schemaFactory.number),
			});

			const tree = {};

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.object"),
				fields: new Map<FieldKey, MapTree[]>(),
			};

			assert.deepEqual(actual, expected);
		});

		it("Non-empty object", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.object("object", {
				a: schemaFactory.string,
				b: schemaFactory.optional(schemaFactory.number),
				c: schemaFactory.boolean,
				d: schemaFactory.optional(schemaFactory.number),
			});

			const tree = {
				a: "Hello world",
				b: 42,
				c: false,
				d: undefined, // Should be skipped in output
			};

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.object"),
				fields: new Map<FieldKey, MapTree[]>([
					[
						brand("a"),
						[{ type: leaf.string.name, value: "Hello world", fields: new Map() }],
					],
					[brand("b"), [{ type: leaf.number.name, value: 42, fields: new Map() }]],
					[brand("c"), [{ type: leaf.boolean.name, value: false, fields: new Map() }]],
				]),
			};

			assert.deepEqual(actual, expected);
		});

		it("Object with stored field keys specified", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.object("object", {
				a: schemaFactory.required(schemaFactory.string, { key: "foo" }),
				b: schemaFactory.optional(schemaFactory.number, { key: "bar" }),
				c: schemaFactory.boolean,
				d: schemaFactory.optional(schemaFactory.number),
			});

			const tree = {
				a: "Hello world",
				b: 42,
				c: false,
				d: 37,
			};

			const actual = nodeDataToMapTree(tree, [schema]);

			const expected: MapTree = {
				type: brand("test.object"),
				fields: new Map<FieldKey, MapTree[]>([
					[
						brand("foo"),
						[{ type: leaf.string.name, value: "Hello world", fields: new Map() }],
					],
					[brand("bar"), [{ type: leaf.number.name, value: 42, fields: new Map() }]],
					[brand("c"), [{ type: leaf.boolean.name, value: false, fields: new Map() }]],
					[brand("d"), [{ type: leaf.number.name, value: 37, fields: new Map() }]],
				]),
			};

			assert.deepEqual(actual, expected);
		});
	});

	it("complex", () => {
		const schemaFactory = new SchemaFactory("test");
		const childObjectSchema = schemaFactory.object("child-object", {
			name: schemaFactory.string,
			age: schemaFactory.number,
		});
		const schema = schemaFactory.object("complex-object", {
			a: schemaFactory.string,
			b: schemaFactory.array("array", [
				childObjectSchema,
				schemaFactory.handle,
				schemaFactory.null,
			]),
			c: schemaFactory.map("map", [
				childObjectSchema,
				schemaFactory.string,
				schemaFactory.number,
			]),
		});

		const handle = new MockHandle<boolean>(true);

		const a = "Hello world";
		const b = [{ name: "Jack", age: 37 }, null, { name: "Jill", age: 42 }, handle];
		const cEntries: [string, InsertableContent][] = [
			["foo", { name: "Foo", age: 2 }],
			["bar", "1"],
			["baz", 2],
		];
		const c = new Map<string, InsertableContent>(cEntries);

		const tree = {
			a,
			b,
			c,
		};

		const actual = nodeDataToMapTree(tree, [schema]);

		const expected: MapTree = {
			type: brand("test.complex-object"),
			fields: new Map<FieldKey, MapTree[]>([
				[brand("a"), [{ type: leaf.string.name, value: "Hello world", fields: new Map() }]],
				[
					brand("b"),
					[
						{
							type: brand("test.array"),
							fields: new Map<FieldKey, MapTree[]>([
								[
									EmptyKey,
									[
										{
											type: brand(childObjectSchema.identifier),
											fields: new Map<FieldKey, MapTree[]>([
												[
													brand("name"),
													[
														{
															type: leaf.string.name,
															value: "Jack",
															fields: new Map(),
														},
													],
												],
												[
													brand("age"),
													[
														{
															type: leaf.number.name,
															value: 37,
															fields: new Map(),
														},
													],
												],
											]),
										},
										{
											type: leaf.null.name,
											value: null,
											fields: new Map(),
										},
										{
											type: brand(childObjectSchema.identifier),
											fields: new Map<FieldKey, MapTree[]>([
												[
													brand("name"),
													[
														{
															type: leaf.string.name,
															value: "Jill",
															fields: new Map(),
														},
													],
												],
												[
													brand("age"),
													[
														{
															type: leaf.number.name,
															value: 42,
															fields: new Map(),
														},
													],
												],
											]),
										},
										{
											type: leaf.handle.name,
											value: handle,
											fields: new Map(),
										},
									],
								],
							]),
						},
					],
				],
				[
					brand("c"),
					[
						{
							type: brand("test.map"),
							fields: new Map<FieldKey, MapTree[]>([
								[
									brand("foo"),
									[
										{
											type: brand(childObjectSchema.identifier),
											fields: new Map<FieldKey, MapTree[]>([
												[
													brand("name"),
													[
														{
															type: leaf.string.name,
															value: "Foo",
															fields: new Map(),
														},
													],
												],
												[
													brand("age"),
													[
														{
															type: leaf.number.name,
															value: 2,
															fields: new Map(),
														},
													],
												],
											]),
										},
									],
								],
								[
									brand("bar"),
									[
										{
											type: leaf.string.name,
											value: "1",
											fields: new Map(),
										},
									],
								],
								[
									brand("baz"),
									[{ type: leaf.number.name, value: 2, fields: new Map() }],
								],
							]),
						},
					],
				],
			]),
		};

		assert.deepEqual(actual, expected);
	});

	it("ambagious unions", () => {
		const schemaFactory = new SchemaFactory("test");
		const a = schemaFactory.object("a", { x: schemaFactory.string });
		const b = schemaFactory.object("b", { x: schemaFactory.string });
		const allowedTypes = [a, b];

		assert.throws(() => nodeDataToMapTree({}, allowedTypes), /\["test.a","test.b"]/);
		assert.throws(
			() => nodeDataToMapTree({ x: "hello" }, allowedTypes),
			/\["test.a","test.b"]/,
		);
	});

	it("unambagious unions", () => {
		const schemaFactory = new SchemaFactory("test");
		const a = schemaFactory.object("a", { a: schemaFactory.string, c: schemaFactory.string });
		const b = schemaFactory.object("b", { b: schemaFactory.string, c: schemaFactory.string });
		const allowedTypes = [a, b];

		assert.doesNotThrow(() => nodeDataToMapTree({ a: "hello", c: "world" }, allowedTypes));
		assert.doesNotThrow(() => nodeDataToMapTree({ b: "hello", c: "world" }, allowedTypes));
	});

	// Our data serialization format does not support certain numeric values.
	// These tests are intended to verify the mapping behaviors for those values.
	describe("Incompatible numeric value handling", () => {
		function assertFallback(value: number, expectedFallbackValue: unknown): void {
			const schemaFactory = new SchemaFactory("test");

			// The current fallbacks we generate are `number` and `null`.
			// This set will need to be expanded if that set changes and we wish to test the associated scenarios.
			const schema = [schemaFactory.number, schemaFactory.null];

			const result = nodeDataToMapTree(value, schema);
			assert.equal(result.value, expectedFallbackValue);
		}

		function assertValueThrows(value: number): void {
			const schemaFactory = new SchemaFactory("test");

			// Schema doesn't support null, so numeric values that fall back to null should throw
			const schema = schemaFactory.number;
			assert.throws(() => nodeDataToMapTree(value, [schema]));
		}

		it("NaN (falls back to null if allowed by the schema)", () => {
			assertFallback(Number.NaN, null);
		});

		it("NaN (throws if fallback type is not allowed by the schema)", () => {
			assertValueThrows(Number.NaN);
		});

		it("+∞ (throws if fallback type is not allowed by the schema)", () => {
			assertValueThrows(Number.POSITIVE_INFINITY);
		});

		it("+∞ (falls back to null if allowed by the schema)", () => {
			assertFallback(Number.POSITIVE_INFINITY, null);
		});

		it("-∞ (throws if fallback type is not allowed by the schema)", () => {
			assertValueThrows(Number.NEGATIVE_INFINITY);
		});

		it("-∞ (falls back to null if allowed by the schema)", () => {
			assertFallback(Number.NEGATIVE_INFINITY, null);
		});

		// Fallback for -0 is +0, so it is supported in all cases where a number is supported.
		it("-0", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.number;

			const result = nodeDataToMapTree(-0, [schema]);
			assert.equal(result.value, +0);
		});

		it("Array containing `undefined` (maps values to null when allowed by the schema)", () => {
			const schemaFactory = new SchemaFactory("test");
			const schema = schemaFactory.array([schemaFactory.number, schemaFactory.null]);

			const input: (number | undefined)[] = [42, undefined, 37, undefined];

			const actual = nodeDataToMapTree(input as InsertableContent, [schema]);

			const expected: MapTree = {
				type: brand(schema.identifier),
				fields: new Map([
					[
						EmptyKey,
						[
							{
								value: 42,
								type: leaf.number.name,
								fields: new Map(),
							},
							{
								value: null,
								type: leaf.null.name,
								fields: new Map(),
							},
							{
								value: 37,
								type: leaf.number.name,
								fields: new Map(),
							},
							{
								value: null,
								type: leaf.null.name,
								fields: new Map(),
							},
						],
					],
				]),
			};

			assert.deepEqual(actual, expected);
		});

		it("Array containing `undefined` (throws if fallback type when not allowed by the schema)", () => {
			const schemaFactory = new SchemaFactory("test");
			assert.throws(
				() =>
					nodeDataToMapTree([42, undefined, 37, undefined] as InsertableContent, [
						schemaFactory.array(schemaFactory.number),
					]),
				/Received unsupported array entry value/,
			);
		});
	});
});
