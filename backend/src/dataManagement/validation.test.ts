import { describe, it, expect } from "vitest";
import { validateValues, ValidationError } from "./validation.js";
import type { CollectionSchema } from "./introspection.js";

const schema: CollectionSchema = {
  engine: "postgres",
  collection: "widgets",
  primaryKey: "id",
  primaryKeyColumns: ["id"],
  supportsRecordOperations: true,
  fields: [
    { name: "id", nativeType: "integer", baseType: "integer", specialType: null, nullable: false, isPrimaryKey: true, required: false },
    { name: "name", nativeType: "text", baseType: "text", specialType: null, nullable: false, isPrimaryKey: false, required: true },
    { name: "description", nativeType: "text", baseType: "text", specialType: null, nullable: true, isPrimaryKey: false, required: false },
    { name: "price", nativeType: "numeric", baseType: "float", specialType: null, nullable: false, isPrimaryKey: false, required: true },
    { name: "stock", nativeType: "integer", baseType: "integer", specialType: null, nullable: false, isPrimaryKey: false, required: true },
    { name: "active", nativeType: "boolean", baseType: "boolean", specialType: null, nullable: false, isPrimaryKey: false, required: true },
    { name: "created_at", nativeType: "date", baseType: "date", specialType: null, nullable: true, isPrimaryKey: false, required: false },
    { name: "metadata", nativeType: "jsonb", baseType: "other", specialType: null, nullable: true, isPrimaryKey: false, required: false },
  ],
};

const validCreate = {
  name: "Widget",
  price: 19.99,
  stock: 5,
  active: true,
};

describe("dataManagement/validation", () => {
  it("accepts a full valid create payload", () => {
    expect(validateValues(schema, validCreate, "create")).toEqual(validCreate);
  });

  it("rejects an unknown field", () => {
    expect(() => validateValues(schema, { ...validCreate, bogus: 1 }, "create")).toThrow(ValidationError);
    expect(() => validateValues(schema, { ...validCreate, bogus: 1 }, "create")).toThrow(/bogus/);
  });

  it("rejects setting the primary key via the body", () => {
    expect(() => validateValues(schema, { ...validCreate, id: 5 }, "create")).toThrow(/id/);
  });

  it("rejects a create missing required fields", () => {
    expect(() => validateValues(schema, { name: "Widget" }, "create")).toThrow(/price|stock|active/);
  });

  it("allows a partial payload on update (no required-field check)", () => {
    expect(validateValues(schema, { name: "Widget" }, "update")).toEqual({ name: "Widget" });
  });

  describe("text", () => {
    it("accepts a string", () => {
      expect(validateValues(schema, { name: "Widget" }, "update")).toEqual({ name: "Widget" });
    });
    it("rejects a non-string", () => {
      expect(() => validateValues(schema, { name: 123 }, "update")).toThrow(/name/);
    });
  });

  describe("integer", () => {
    it("accepts a number", () => {
      expect(validateValues(schema, { stock: 5 }, "update")).toEqual({ stock: 5 });
    });
    it("coerces a numeric string", () => {
      expect(validateValues(schema, { stock: "5" }, "update")).toEqual({ stock: 5 });
    });
    it("rejects a non-numeric string", () => {
      expect(() => validateValues(schema, { stock: "abc" }, "update")).toThrow(/stock/);
    });
    it("rejects an empty string", () => {
      expect(() => validateValues(schema, { stock: "" }, "update")).toThrow(/stock/);
    });
    it("rejects a non-integer float", () => {
      expect(() => validateValues(schema, { stock: 4.5 }, "update")).toThrow(/stock/);
    });
  });

  describe("float", () => {
    it("coerces a numeric string", () => {
      expect(validateValues(schema, { price: "19.99" }, "update")).toEqual({ price: 19.99 });
    });
    it("rejects a non-numeric string", () => {
      expect(() => validateValues(schema, { price: "abc" }, "update")).toThrow(/price/);
    });
    it("rejects an empty string", () => {
      expect(() => validateValues(schema, { price: "" }, "update")).toThrow(/price/);
    });
  });

  describe("boolean", () => {
    it.each([true, false, "true", "false"])("accepts %s", (value) => {
      expect(() => validateValues(schema, { active: value }, "update")).not.toThrow();
    });
    it("rejects an arbitrary string", () => {
      expect(() => validateValues(schema, { active: "yes" }, "update")).toThrow(/active/);
    });
    it("rejects a number", () => {
      expect(() => validateValues(schema, { active: 1 }, "update")).toThrow(/active/);
    });
  });

  describe("date", () => {
    it("accepts a valid ISO date string", () => {
      expect(validateValues(schema, { created_at: "2026-09-09T00:00:00.000Z" }, "update")).toEqual({
        created_at: "2026-09-09T00:00:00.000Z",
      });
    });
    it("rejects an unparsable string", () => {
      expect(() => validateValues(schema, { created_at: "not-a-date" }, "update")).toThrow(/created_at/);
    });
    it("rejects a non-string", () => {
      expect(() => validateValues(schema, { created_at: 12345 }, "update")).toThrow(/created_at/);
    });
  });

  describe("other", () => {
    it("passes the value through unchanged", () => {
      const metadata = { nested: true };
      expect(validateValues(schema, { metadata }, "update")).toEqual({ metadata });
    });
  });

  describe("nullable handling", () => {
    it("accepts null for a nullable field", () => {
      expect(validateValues(schema, { description: null }, "update")).toEqual({ description: null });
    });
    it("rejects null for a non-nullable field", () => {
      expect(() => validateValues(schema, { name: null }, "update")).toThrow(/not nullable/);
    });
  });
});
