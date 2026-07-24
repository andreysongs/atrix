import { Injectable, ServiceUnavailableException } from "@nestjs/common";

const DEFAULT_MUSCLEWIKI_ORIGIN = "https://api.musclewiki.com";
const RESOLUTION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type SearchResult = { id?: number; name?: string };
type SearchResponse = SearchResult[] | { results?: SearchResult[] };

export type MuscleWikiMatch = {
  id: number;
  name: string;
  query: string;
};

export type MuscleWikiVideo = {
  filename: string;
  stream: "branded" | "unbranded";
  label: string;
};

type ResolutionCacheItem = { expiresAt: number; value: MuscleWikiMatch | null };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function muscleWikiOrigin() {
  const configured = process.env.MUSCLEWIKI_BASE_URL?.trim() || DEFAULT_MUSCLEWIKI_ORIGIN;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ServiceUnavailableException({
      code: "MUSCLEWIKI_INVALID_CONFIGURATION",
      message: "MUSCLEWIKI_BASE_URL possui um endereço inválido no servidor.",
    });
  }
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length >= 2))];
}

/**
 * The local catalog already stores a maintained English exercise name. These
 * candidates make every local entry resolvable without creating a copied
 * MuscleWiki database or bulk-exporting its media URLs.
 */
function searchCandidates(name: string, nameEn: string, equipment: string) {
  const translated = nameEn
    .replace(/\bSmith Machine\b/gi, "Smith")
    .replace(/\bMachine\b/gi, "")
    .replace(/\bPulley\b/gi, "Cable")
    .replace(/\bBand\b/gi, "Resistance Band")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = translated
    .replace(/\bwith\b/gi, "")
    .replace(/\bbarbell\b/gi, "")
    .replace(/\bdumbbell\b/gi, "")
    .replace(/\bcable\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return unique([translated, nameEn, stripped, `${equipment} ${stripped}`]);
}

function scoreMatch(candidate: SearchResult, expected: string) {
  const expectedName = normalize(expected);
  const candidateName = normalize(candidate.name || "");
  if (!candidateName) return -Infinity;
  if (candidateName === expectedName) return 1000;
  if (candidateName.includes(expectedName) || expectedName.includes(candidateName)) return 700;
  const ignored = new Set(["a", "an", "the", "with", "on", "in", "barbell", "dumbbell", "cable", "machine", "bodyweight"]);
  const expectedWords = [...new Set(expectedName.split(" ").filter((word) => word.length > 2 && !ignored.has(word)))];
  if (expectedWords.length === 0) return 0;
  const matches = expectedWords.filter((word) => candidateName.split(" ").includes(word)).length;
  return Math.round(matches / expectedWords.length * 600);
}

function findVideoValues(value: unknown, found: string[] = []) {
  if (typeof value === "string") {
    if (/\/(?:stream|media)\/videos\/(?:branded|unbranded)\//.test(value)) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => findVideoValues(item, found));
    return found;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => findVideoValues(item, found));
  }
  return found;
}

function videosFromPayload(payload: unknown): MuscleWikiVideo[] {
  return unique(findVideoValues(payload)).flatMap((source) => {
    try {
      const url = new URL(source, DEFAULT_MUSCLEWIKI_ORIGIN);
      // Current API responses use /stream/videos. The OpenAPI examples still
      // contain the backwards-compatible /media/videos shape, so accept both
      // and always proxy through the authenticated /stream endpoint.
      const match = url.pathname.match(/^\/(?:stream|media)\/videos\/(branded|unbranded)\/([^/]+)$/);
      if (!match) return [];
      const [, stream, filename] = match;
      const decodedFilename = decodeURIComponent(filename);
      if (!/^[a-zA-Z0-9._-]+\.mp4$/i.test(decodedFilename)) return [];
      return [{
        stream: stream as MuscleWikiVideo["stream"],
        filename: decodedFilename,
        label: /side/i.test(decodedFilename) ? "Vista lateral" : /front/i.test(decodedFilename) ? "Vista frontal" : "Demonstração",
      }];
    } catch {
      return [];
    }
  }).filter((video, index, list) => list.findIndex((item) => item.stream === video.stream && item.filename === video.filename) === index);
}

@Injectable()
export class MuscleWikiService {
  private readonly resolutionCache = new Map<string, ResolutionCacheItem>();
  private readonly origin = muscleWikiOrigin();

  isConfigured() {
    return Boolean(process.env.MUSCLEWIKI_API_KEY?.trim());
  }

  private apiKey() {
    const key = process.env.MUSCLEWIKI_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException({
        code: "MUSCLEWIKI_NOT_CONFIGURED",
        message: "Defina MUSCLEWIKI_API_KEY no servidor para ativar as demonstrações do MuscleWiki.",
      });
    }
    return key;
  }

  private async request(pathname: string, init: RequestInit = {}) {
    // Resolve the credential before the network error boundary so the
    // intentional NOT_CONFIGURED response is not rewritten as an upstream
    // connectivity failure.
    const apiKey = this.apiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(`${this.origin}${pathname}`, {
        ...init,
        signal: controller.signal,
        headers: { "X-API-Key": apiKey, ...(init.headers || {}) },
      });
    } catch {
      throw new ServiceUnavailableException({
        code: "MUSCLEWIKI_UNAVAILABLE",
        message: "A demonstração está temporariamente indisponível. Tente novamente em instantes.",
      });
    } finally {
      // fetch resolves as soon as the response headers arrive; clearing this
      // timer here keeps long video streams alive while still bounding setup.
      clearTimeout(timeout);
    }
  }

  private async upstreamError(response: Response) {
    let upstreamMessage = "";
    try {
      const payload = await response.json() as { detail?: unknown; message?: unknown };
      const candidate = typeof payload.message === "string" ? payload.message : payload.detail;
      if (typeof candidate === "string") upstreamMessage = candidate;
    } catch {
      // Upstream error bodies are not guaranteed to be JSON.
    }
    const message = response.status === 401 || response.status === 403
      ? "A credencial MuscleWiki não foi aceita. Verifique a chave configurada no servidor."
      : response.status === 429
        ? "O limite mensal da MuscleWiki foi atingido."
        : upstreamMessage || "A MuscleWiki não conseguiu atender à solicitação.";
    throw new ServiceUnavailableException({
      code: "MUSCLEWIKI_UPSTREAM_ERROR",
      upstreamStatus: response.status,
      message,
    });
  }

  async resolve(input: { localId: string; name: string; nameEn: string; equipment: string }) {
    if (!this.isConfigured()) return { configured: false, match: null as MuscleWikiMatch | null };
    const cacheKey = `${input.localId}:${input.nameEn}`;
    const cached = this.resolutionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { configured: true, match: cached.value };

    let match: MuscleWikiMatch | null = null;
    for (const query of searchCandidates(input.name, input.nameEn, input.equipment)) {
      const response = await this.request(`/search?q=${encodeURIComponent(query)}&limit=12&gender=male`);
      if (!response.ok) await this.upstreamError(response);
      const payload = await response.json() as SearchResponse;
      const results = Array.isArray(payload) ? payload : payload.results || [];
      const candidate = results
        .filter((item): item is Required<SearchResult> => Number.isInteger(item.id) && Boolean(item.name))
        .sort((left, right) => scoreMatch(right, input.nameEn) - scoreMatch(left, input.nameEn))[0];
      if (candidate && scoreMatch(candidate, input.nameEn) >= 300) {
        match = { id: candidate.id, name: candidate.name, query };
        break;
      }
    }
    this.resolutionCache.set(cacheKey, { value: match, expiresAt: Date.now() + RESOLUTION_TTL_MS });
    return { configured: true, match };
  }

  async exercise(id: number) {
    const response = await this.request(`/exercises/${id}?gender=male`);
    if (!response.ok) await this.upstreamError(response);
    const payload = await response.json() as Record<string, unknown>;
    return {
      id,
      name: typeof payload.name === "string" ? payload.name : "Exercício MuscleWiki",
      steps: Array.isArray(payload.steps) ? payload.steps.filter((step): step is string => typeof step === "string") : [],
      videos: videosFromPayload(payload),
    };
  }

  async streamVideo(stream: MuscleWikiVideo["stream"], filename: string, range?: string) {
    if (!/^[a-zA-Z0-9._-]+\.mp4$/i.test(filename)) {
      throw new ServiceUnavailableException({ code: "MUSCLEWIKI_INVALID_MEDIA", message: "Arquivo de mídia inválido." });
    }
    const safeRange = range && /^bytes=\d*-\d*$/.test(range) ? range : undefined;
    const response = await this.request(`/stream/videos/${stream}/${encodeURIComponent(filename)}`, {
      headers: safeRange ? { Range: safeRange } : {},
    });
    if (!response.ok && response.status !== 416) await this.upstreamError(response);
    return response;
  }
}
