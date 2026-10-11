// Generated draft from scripts/check-terminology.rs; sha256=5c6013eb135246b6bda2abea188896930a5bc76df350b2cf09db7fed85559c4c
// Carried constructs are data, never runtime parity evidence.
function SCANNED_EXTENSIONS() {
  return Object.freeze(Object.freeze([".rs", ".md", ".toml", ".yml", ".yaml", ".json", ".sh", ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".txt"]));
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const serde_json = {
  error: {

  },
};

function EXCLUDED_PATHS() {
  return Object.freeze(Object.freeze(["CONTRIBUTING.md", "CHANGELOG.md", "changelog.d/", "scripts/check-terminology.rs", "target", ".git/", "node_modules", "dev/log", "/raw/", "ui/dist"]));
}

function ALLOWED_PHRASES() {
  return Object.freeze(Object.freeze(["graphql", "graphiql", "graphviz", "graphite", "langgraph", "object graph", "dependency graph", "workflow graph", "module graph", "call graph", "paragraph", "lexicographic", "lexicographical", "geographic", "geographical", "geography", "cryptographic", "cryptographically", "cryptography", "typographic", "orthographic", "digraph", "telegraph", "autograph", "photograph", "graphic", "graphite", "/graphs/"]));
}

export const translated = { ["SCANNED_EXTENSIONS"]: SCANNED_EXTENSIONS(), ["EXCLUDED_PATHS"]: EXCLUDED_PATHS(), ["ALLOWED_PHRASES"]: ALLOWED_PHRASES() };
export const provenance = {"sourcePath":"scripts/check-terminology.rs","sourceSha256":"5c6013eb135246b6bda2abea188896930a5bc76df350b2cf09db7fed85559c4c","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":12,"preserved":15,"runtimeParity":false};
