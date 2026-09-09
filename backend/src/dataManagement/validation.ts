import type { BaseType } from "./fieldTypes.js";
import type { CollectionSchema } from "./introspection.js";

export class ValidationError extends Error {}

function coerceValue(fieldName: string, value: unknown, baseType: BaseType): unknown {
  if (value === null) return null;

  switch (baseType) {
    case "text":
      if (typeof value !== "string") throw new ValidationError(`Field "${fieldName}" must be a string`);
      return value;
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new ValidationError(`Field "${fieldName}" must be a boolean`);
    case "integer": {
      const n = typeof value === "number" ? value : Number(value);
      if (typeof value === "string" && value.trim() === "") throw new ValidationError(`Field "${fieldName}" must be an integer`);
      if (!Number.isInteger(n)) throw new ValidationError(`Field "${fieldName}" must be an integer`);
      return n;
    }
    case "float": {
      const n = typeof value === "number" ? value : Number(value);
      if (typeof value === "string" && value.trim() === "") throw new ValidationError(`Field "${fieldName}" must be a number`);
      if (Number.isNaN(n)) throw new ValidationError(`Field "${fieldName}" must be a number`);
      return n;
    }
    case "date": {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        throw new ValidationError(`Field "${fieldName}" must be an ISO-8601 date string`);
      }
      return value;
    }
    case "other":
    default:
      return value;
  }
}

/**
 * Validates a create/update `values` body against a collection's introspected
 * schema: rejects unknown field names, the primary key column, and values that
 * don't coerce to their column's base type. On create, also requires every
 * non-nullable non-PK field to be present.
 */
export function validateValues(
  schema: CollectionSchema,
  values: Record<string, unknown>,
  mode: "create" | "update"
): Record<string, unknown> {
  const fieldsByName = new Map(schema.fields.map((f) => [f.name, f]));
  const unknown = Object.keys(values).filter((name) => !fieldsByName.has(name));
  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}`);
  }

  if (schema.primaryKey && Object.prototype.hasOwnProperty.call(values, schema.primaryKey)) {
    throw new ValidationError(`Cannot set primary key column "${schema.primaryKey}" via body`);
  }

  if (mode === "create") {
    const missing = schema.fields.filter((f) => f.required && !Object.prototype.hasOwnProperty.call(values, f.name));
    if (missing.length > 0) {
      throw new ValidationError(`Missing required field(s): ${missing.map((f) => f.name).join(", ")}`);
    }
  }

  const coerced: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    const field = fieldsByName.get(name)!;
    if (value === null && !field.nullable) {
      throw new ValidationError(`Field "${name}" is not nullable`);
    }
    coerced[name] = coerceValue(name, value, field.baseType);
  }
  return coerced;
}
