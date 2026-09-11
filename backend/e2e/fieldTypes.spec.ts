import { test, expect } from "./fixtures.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

// Phase 24c: the frontend's new per-field-type dispatch (relation dropdown,
// richtext textarea, baseType-'other' Monaco/JSON field, read-only image/video
// display) needs real backend coverage beyond staging.spec.ts's plain
// text/integer fields. Postgres-only -- this proves the CRUD/staging contract
// accepts these field shapes end-to-end; per-engine baseType-mapping parity is
// already covered at the unit level by fieldTypes.test.ts/validation.test.ts.
const AUTHORS_TABLE = "e2e_field_types_authors";
const TABLE = "e2e_field_types_demo";

test.describe("field-type dispatch (Phase 24c) - relation/richtext/other/image/video", () => {
  test("postgres: stages and diffs a draft touching every new special/base type", async ({ request, fixtureTable }) => {
    // No real FK constraint between the two tables -- relation targeting is a
    // naming convention resolved by table name (confirmed in
    // fieldTypes.ts's applySpecialType), not a DB-level foreign key -- so the
    // two fixture tables can be created/torn down independently, in any order.
    await fixtureTable.create(
      "postgres",
      AUTHORS_TABLE,
      `CREATE TABLE ${AUTHORS_TABLE} (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`
    );
    const authorRes = await request.post(`/data-api/postgres/${AUTHORS_TABLE}/records`, {
      data: { values: { name: "Jane Doe" } },
    });
    expect(authorRes.status()).toBe(201);
    const authorId = (await authorRes.json()).record.id as number;

    await fixtureTable.create(
      "postgres",
      TABLE,
      `CREATE TABLE ${TABLE} (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body_richtext TEXT,
        e2e_field_types_author_id_relation INTEGER,
        cover_image TEXT,
        clip_video TEXT,
        metadata JSONB
      )`
    );

    let recordId: string;
    await test.step("seed a live record via the ordinary CRUD path", async () => {
      const res = await request.post(`/data-api/postgres/${TABLE}/records`, {
        data: {
          values: {
            title: "Original",
            body_richtext: "<p>orig</p>",
            e2e_field_types_author_id_relation: authorId,
            metadata: { a: 1 },
          },
        },
      });
      expect(res.status()).toBe(201);
      recordId = String((await res.json()).record.id);
    });

    await test.step("schema reports the expected special/base types", async () => {
      const res = await request.get(`/data-api/postgres/${TABLE}/schema`);
      const body = await res.json();
      const byName = Object.fromEntries(body.fields.map((f: { name: string }) => [f.name, f]));
      expect(byName.body_richtext.specialType).toBe("richtext");
      expect(byName.e2e_field_types_author_id_relation.specialType).toBe("relation");
      expect(byName.e2e_field_types_author_id_relation.relationTarget).toBe(AUTHORS_TABLE);
      expect(byName.cover_image.specialType).toBe("image");
      expect(byName.clip_video.specialType).toBe("video");
      expect(byName.metadata.baseType).toBe("other");
    });

    await test.step("stages a partial draft touching the JSON and image fields only", async () => {
      const res = await request.post(`/data-api/postgres/${TABLE}/records/${recordId}/draft`, {
        data: { values: { metadata: { a: 2, b: ["x", "y"] }, cover_image: "/media/postgres/x/cover_image/demo.jpg" } },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      // full shadow copy -- untouched fields (title, relation) carry over from live
      expect(body.draft.values.title).toBe("Original");
      expect(Number(body.draft.values.e2e_field_types_author_id_relation)).toBe(authorId);
      expect(body.draft.values.metadata).toEqual({ a: 2, b: ["x", "y"] });
    });

    await test.step("GET draft reports a correct diff, and deploy applies it live", async () => {
      const diffRes = await request.get(`/data-api/postgres/${TABLE}/records/${recordId}/draft`);
      const diffBody = await diffRes.json();
      expect(diffBody.hasDraft).toBe(true);
      expect(diffBody.diff.metadata.changed).toBe(true);
      expect(diffBody.diff.cover_image.changed).toBe(true);
      expect(diffBody.diff.title.changed).toBe(false);

      const deployRes = await request.post(`/data-api/postgres/${TABLE}/records/${recordId}/deploy`, {
        data: { confirm: true },
      });
      expect(deployRes.status()).toBe(200);
      const deployBody = await deployRes.json();
      expect(deployBody.record.metadata).toEqual({ a: 2, b: ["x", "y"] });
      expect(deployBody.record.cover_image).toBe("/media/postgres/x/cover_image/demo.jpg");
    });
  });
});
