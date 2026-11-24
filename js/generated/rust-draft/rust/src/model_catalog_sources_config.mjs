// Generated draft from rust/src/model_catalog_sources_config.rs; sha256=c2a422b2353658a5c2fd2e21a87769dcd9ff303a4ad07d047652ee245b95df51
// Carried constructs are data, never runtime parity evidence.
function rp_6d6f64656c5f636174616c6f675f736f75726365732e636f6e6669672e44454641554c545f524546524553485f53454353() {
  return 10800n;
}

function rp_6d6f64656c5f636174616c6f675f736f75726365732e636f6e6669672e63616e6f6e6963616c5f70726f7669646572(provider) {
  if (!(typeof provider === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(provider))) throw new TypeError('argument outside supported Rust value domain');
  return ((provider === "claude") ? "anthropic" : ((provider === "chatgpt") ? "codex" : ((provider === "openai-codex") ? "codex" : ((provider === "google") ? "gemini" : ((provider === "qwen-code") ? "qwen" : (() => {
    const other = provider;
    return other;
  })())))));
}

export const translated = { ["DEFAULT_REFRESH_SECS"]: rp_6d6f64656c5f636174616c6f675f736f75726365732e636f6e6669672e44454641554c545f524546524553485f53454353(), ["canonical_provider"]: rp_6d6f64656c5f636174616c6f675f736f75726365732e636f6e6669672e63616e6f6e6963616c5f70726f7669646572 };
export const provenance = {"sourcePath":"rust/src/model_catalog_sources_config.rs","sourceSha256":"c2a422b2353658a5c2fd2e21a87769dcd9ff303a4ad07d047652ee245b95df51","executable":2,"executableFunctions":1,"executableConstants":1,"executableTypes":0,"executableConstructors":0,"carried":7,"preserved":10,"runtimeParity":false};
