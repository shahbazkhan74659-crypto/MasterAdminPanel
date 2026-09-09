import type { EngineName } from "../sqlConsole/connections.js";

export type BaseType = "text" | "integer" | "float" | "boolean" | "date" | "other";
export type SpecialType = "richtext" | "image" | "video" | "relation" | null;

export function mapNativeType(engine: EngineName, nativeType: string, columnType?: string): BaseType {
  const type = nativeType.toLowerCase();

  if (engine === "postgres") {
    if (["character varying", "text", "char", "character", "uuid"].some((t) => type.includes(t))) return "text";
    if (["integer", "bigint", "smallint", "serial", "bigserial"].some((t) => type.includes(t))) return "integer";
    if (["numeric", "decimal", "real", "double precision"].some((t) => type.includes(t))) return "float";
    if (type === "boolean") return "boolean";
    if (["timestamp", "date", "time"].some((t) => type.includes(t))) return "date";
    return "other";
  }

  if (engine === "mysql") {
    if (["varchar", "char", "text", "tinytext", "mediumtext", "longtext"].some((t) => type.includes(t))) return "text";
    if (type === "tinyint") {
      return columnType?.toLowerCase() === "tinyint(1)" ? "boolean" : "integer";
    }
    if (["int", "bigint", "smallint", "mediumint"].some((t) => type.includes(t))) return "integer";
    if (["decimal", "numeric", "float", "double"].some((t) => type.includes(t))) return "float";
    if (["datetime", "timestamp", "date", "time", "year"].some((t) => type.includes(t))) return "date";
    return "other";
  }

  // sqlite: declared type is free-text, matched by substring
  if (["text", "varchar", "char", "clob"].some((t) => type.includes(t))) return "text";
  if (type.includes("bool")) return "boolean";
  if (["int"].some((t) => type.includes(t))) return "integer";
  if (["real", "float", "double", "numeric", "decimal"].some((t) => type.includes(t))) return "float";
  return "other";
}

const SUFFIX_MAP: Array<{ suffix: string; specialType: Exclude<SpecialType, null>; baseTypes: BaseType[] }> = [
  { suffix: "_richtext", specialType: "richtext", baseTypes: ["text"] },
  { suffix: "_image", specialType: "image", baseTypes: ["text"] },
  { suffix: "_video", specialType: "video", baseTypes: ["text"] },
  { suffix: "_id_relation", specialType: "relation", baseTypes: ["integer", "text"] },
];

export interface SpecialTypeResult {
  specialType: SpecialType;
  relationTarget?: string;
}

export function applySpecialType(columnName: string, baseType: BaseType, knownCollections: string[]): SpecialTypeResult {
  const lower = columnName.toLowerCase();

  for (const rule of SUFFIX_MAP) {
    if (!lower.endsWith(rule.suffix)) continue;
    if (!rule.baseTypes.includes(baseType)) {
      console.warn(
        `[dataManagement] Column "${columnName}" matches suffix "${rule.suffix}" but has incompatible base type "${baseType}" — ignoring special type.`
      );
      continue;
    }

    if (rule.specialType === "relation") {
      const stem = columnName.slice(0, -rule.suffix.length);
      const candidates = [stem, `${stem}s`, `${stem}es`];
      const target = candidates.find((c) => knownCollections.includes(c));
      if (!target) {
        console.warn(
          `[dataManagement] Column "${columnName}" matches relation suffix but no matching collection found among: ${candidates.join(", ")} — ignoring special type.`
        );
        continue;
      }
      return { specialType: "relation", relationTarget: target };
    }

    return { specialType: rule.specialType };
  }

  return { specialType: null };
}
