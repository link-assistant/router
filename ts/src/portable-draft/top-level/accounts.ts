// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/accounts.mjs; source sha256=0042f4f7cf2a4e246864146a6eeb624d54fc287b26e0cdad7cd398b341b120cf; IR sha256=9f52c6808194dc4572c79be43de1d71e382e1ca6685446d762df5af99299652e.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
const strategyAliases: ReadonlyMap<unknown, string> = new Map<unknown, string>([["rr", "round-robin"], ["roundrobin", "round-robin"], ["weighted_round_robin", "weighted-round-robin"], ["prio", "priority"], ["fill-first", "priority"], ["leastused", "least-used"], ["quota-first", "least-used"], ["lru", "least-used"]]);

export function retryableStatus(status?: unknown): boolean {
    return ([401, 429, 529, 500, 502, 503, 504] as readonly unknown[]).includes(status);
}

const subscriptionKinds: ReadonlySet<unknown> = new Set<unknown>(["anthropic", "claude", "codex", "gemini", "qwen", "vertex", "vertex-ai", "bedrock"]);

const storedKinds: ReadonlySet<unknown> = new Set<unknown>(["openai-compatible", "openai", "litellm", "lefine", "z.ai-coding-plan"]);
