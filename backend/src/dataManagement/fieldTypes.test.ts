import { describe, it, expect, vi } from "vitest";
import { mapNativeType, applySpecialType } from "./fieldTypes.js";

describe("dataManagement/fieldTypes", () => {
  describe("mapNativeType", () => {
    describe("postgres", () => {
      it.each([
        ["character varying", "text"],
        ["text", "text"],
        ["uuid", "text"],
        ["integer", "integer"],
        ["bigint", "integer"],
        ["serial", "integer"],
        ["numeric", "float"],
        ["double precision", "float"],
        ["boolean", "boolean"],
        ["timestamp without time zone", "date"],
        ["date", "date"],
        ["jsonb", "other"],
      ])("%s -> %s", (nativeType, expected) => {
        expect(mapNativeType("postgres", nativeType)).toBe(expected);
      });
    });

    describe("mysql", () => {
      it("tinyint(1) maps to boolean", () => {
        expect(mapNativeType("mysql", "tinyint", "tinyint(1)")).toBe("boolean");
      });
      it("tinyint(4) maps to integer", () => {
        expect(mapNativeType("mysql", "tinyint", "tinyint(4)")).toBe("integer");
      });
      it("tinyint with undefined columnType maps to integer", () => {
        expect(mapNativeType("mysql", "tinyint", undefined)).toBe("integer");
      });
      it.each([
        ["varchar", "text"],
        ["int", "integer"],
        ["decimal", "float"],
        ["datetime", "date"],
        ["json", "other"],
      ])("%s -> %s", (nativeType, expected) => {
        expect(mapNativeType("mysql", nativeType)).toBe(expected);
      });
    });

    describe("sqlite", () => {
      it.each([
        ["TEXT", "text"],
        ["VARCHAR(255)", "text"],
        ["INTEGER", "integer"],
        ["BOOLEAN", "boolean"],
        ["REAL", "float"],
        ["BLOB", "other"],
        ["", "other"],
      ])("%s -> %s", (nativeType, expected) => {
        expect(mapNativeType("sqlite", nativeType)).toBe(expected);
      });
    });
  });

  describe("applySpecialType", () => {
    it("tags a _richtext column with a compatible text base type", () => {
      expect(applySpecialType("body_richtext", "text", [])).toEqual({ specialType: "richtext" });
    });

    it("tags a _image column", () => {
      expect(applySpecialType("cover_image", "text", [])).toEqual({ specialType: "image" });
    });

    it("tags a _video column", () => {
      expect(applySpecialType("trailer_video", "text", [])).toEqual({ specialType: "video" });
    });

    it("resolves an _id_relation target via exact stem match", () => {
      expect(applySpecialType("category_id_relation", "integer", ["category"])).toEqual({
        specialType: "relation",
        relationTarget: "category",
      });
    });

    it("resolves an _id_relation target via 's' pluralization", () => {
      expect(applySpecialType("author_id_relation", "integer", ["authors"])).toEqual({
        specialType: "relation",
        relationTarget: "authors",
      });
    });

    it("resolves an _id_relation target via 'es' pluralization", () => {
      expect(applySpecialType("class_id_relation", "integer", ["classes"])).toEqual({
        specialType: "relation",
        relationTarget: "classes",
      });
    });

    it("falls back to null on an incompatible base type", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(applySpecialType("cover_image", "integer", [])).toEqual({ specialType: null });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("falls back to null when a relation target can't be resolved", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(applySpecialType("author_id_relation", "integer", [])).toEqual({ specialType: null });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("returns null specialType when no suffix matches", () => {
      expect(applySpecialType("title", "text", [])).toEqual({ specialType: null });
    });

    it("matches suffixes case-insensitively", () => {
      expect(applySpecialType("Cover_Image", "text", [])).toEqual({ specialType: "image" });
    });
  });
});
