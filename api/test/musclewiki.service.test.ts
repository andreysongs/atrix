import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { MuscleWikiService } from "../src/musclewiki.service.js";

type SeedExercise = {
  id: string;
  name: string;
  nameEn: string;
  equipment: string;
};

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.MUSCLEWIKI_API_KEY;

function restoreGlobals() {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.MUSCLEWIKI_API_KEY;
  else process.env.MUSCLEWIKI_API_KEY = originalApiKey;
}

test("without an API key the resolver is safe, explicit, and never contacts the upstream", async () => {
  delete process.env.MUSCLEWIKI_API_KEY;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("upstream must not be called");
  }) as typeof fetch;

  try {
    const service = new MuscleWikiService();
    assert.equal(service.isConfigured(), false);
    assert.deepEqual(await service.resolve({
      localId: "bench",
      name: "Supino reto com barra",
      nameEn: "Barbell Bench Press",
      equipment: "Barra",
    }), { configured: false, match: null });
    assert.equal(fetchCalls, 0);

    await assert.rejects(
      () => service.exercise(1),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.deepEqual(error.getResponse(), {
          code: "MUSCLEWIKI_NOT_CONFIGURED",
          message: "Defina MUSCLEWIKI_API_KEY no servidor para ativar as demonstrações do MuscleWiki.",
        });
        return true;
      },
    );
    assert.equal(fetchCalls, 0);
  } finally {
    restoreGlobals();
  }
});

test("all 212 local exercises can be resolved through authenticated search", async () => {
  process.env.MUSCLEWIKI_API_KEY = "mw_test_only";
  const catalogPath = resolve(process.cwd(), "..", "src", "data", "exercise-seeds.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as { exercises: SeedExercise[] };
  assert.equal(catalog.exercises.length, 212);

  let current: SeedExercise | undefined;
  let fetchCalls = 0;
  globalThis.fetch = (async (input, init) => {
    fetchCalls += 1;
    assert.ok(current);
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.musclewiki.com");
    assert.equal(url.pathname, "/search");
    assert.ok(url.searchParams.get("q")?.trim());
    assert.equal(url.searchParams.get("gender"), "male");
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "mw_test_only");
    return Response.json({ results: [{ id: fetchCalls, name: current.nameEn }] });
  }) as typeof fetch;

  try {
    const service = new MuscleWikiService();
    for (const exercise of catalog.exercises) {
      current = exercise;
      const result = await service.resolve(exercise);
      assert.equal(result.configured, true, exercise.id);
      assert.ok(result.match, exercise.id);
      assert.equal(result.match.name, exercise.nameEn, exercise.id);
      assert.ok(result.match.query.trim(), exercise.id);
    }
    assert.equal(fetchCalls, 212);
  } finally {
    restoreGlobals();
  }
});

test("resolved searches are cached and exact matches win", async () => {
  process.env.MUSCLEWIKI_API_KEY = "mw_cache_test";
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return Response.json({
      results: [
        { id: 10, name: "Barbell Row" },
        { id: 20, name: "Barbell Bench Press" },
      ],
    });
  }) as typeof fetch;

  try {
    const service = new MuscleWikiService();
    const input = {
      localId: "bench",
      name: "Supino reto com barra",
      nameEn: "Barbell Bench Press",
      equipment: "Barra",
    };
    const first = await service.resolve(input);
    const second = await service.resolve(input);
    assert.equal(first.match?.id, 20);
    assert.deepEqual(second, first);
    assert.equal(fetchCalls, 1);
  } finally {
    restoreGlobals();
  }
});

test("exercise payloads expose only validated proxy video descriptors", async () => {
  process.env.MUSCLEWIKI_API_KEY = "mw_detail_test";
  globalThis.fetch = (async () => Response.json({
    name: "Dumbbell Floor Press",
    steps: ["Lie on the floor.", 123, "Press the weights."],
    videos: [
      "https://api.musclewiki.com/stream/videos/unbranded/floor-press-front.mp4",
      { source: "/stream/videos/branded/floor-press-side.mp4" },
      "/stream/videos/branded/floor-press-side.mp4",
      "/stream/videos/private/not-allowed.mp4",
      "https://example.com/not-a-video.mp4",
    ],
  })) as typeof fetch;

  try {
    const detail = await new MuscleWikiService().exercise(77);
    assert.deepEqual(detail, {
      id: 77,
      name: "Dumbbell Floor Press",
      steps: ["Lie on the floor.", "Press the weights."],
      videos: [
        { stream: "unbranded", filename: "floor-press-front.mp4", label: "Vista frontal" },
        { stream: "branded", filename: "floor-press-side.mp4", label: "Vista lateral" },
      ],
    });
  } finally {
    restoreGlobals();
  }
});

test("the media proxy validates filenames and forwards authentication and byte ranges", async () => {
  process.env.MUSCLEWIKI_API_KEY = "mw_media_test";
  let capturedUrl = "";
  let capturedHeaders = new Headers();
  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    return new Response("video", {
      status: 206,
      headers: { "Content-Type": "video/mp4", "Content-Range": "bytes 0-4/5" },
    });
  }) as typeof fetch;

  try {
    const service = new MuscleWikiService();
    const response = await service.streamVideo("unbranded", "bench-front.mp4", "bytes=0-4");
    assert.equal(response.status, 206);
    assert.equal(capturedUrl, "https://api.musclewiki.com/stream/videos/unbranded/bench-front.mp4");
    assert.equal(capturedHeaders.get("X-API-Key"), "mw_media_test");
    assert.equal(capturedHeaders.get("Range"), "bytes=0-4");

    await assert.rejects(
      () => service.streamVideo("unbranded", "../secret.mp4"),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.equal((error.getResponse() as { code?: string }).code, "MUSCLEWIKI_INVALID_MEDIA");
        return true;
      },
    );
  } finally {
    restoreGlobals();
  }
});
