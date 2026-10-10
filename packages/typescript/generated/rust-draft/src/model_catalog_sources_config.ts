// Generated draft from src/model_catalog_sources_config.rs; sha256=c2a422b2353658a5c2fd2e21a87769dcd9ff303a4ad07d047652ee245b95df51
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_REFRESH_SECS() {
  return 10800n;
}

function canonical_provider(provider: string) {
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  if ((provider === "claude")) {
    return "anthropic";
  } else {
    if ((provider === "chatgpt")) {
      return "codex";
    } else {
      if ((provider === "openai-codex")) {
        return "codex";
      } else {
        if ((provider === "google")) {
          return "gemini";
        } else {
          if ((provider === "qwen-code")) {
            return "qwen";
          } else {
            const other = provider;
            return other;
          }
        }
      }
    }
  }
}

export const translated: { "DEFAULT_REFRESH_SECS": bigint; "canonical_provider": (provider: string) => string } = { "DEFAULT_REFRESH_SECS": DEFAULT_REFRESH_SECS(), canonical_provider };
export const provenance = {"sourcePath":"src/model_catalog_sources_config.rs","sourceSha256":"c2a422b2353658a5c2fd2e21a87769dcd9ff303a4ad07d047652ee245b95df51","executable":2,"executableFunctions":1,"executableConstants":1,"carried":7,"preserved":10,"runtimeParity":false};
