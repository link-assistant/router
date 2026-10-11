// Generated draft from src/deploy_config.rs; sha256=3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c
// Carried constructs are data, never runtime parity evidence.
function RESERVED_ENV() {
  return Object.freeze(["TOKEN_SECRET", "DATA_DIR", "STORAGE_POLICY", "HOME", "PATH", "USER", "SHELL", "PWD", "IFS", "CLAUDE_CODE_HOME", "CLAUDE_CONFIG_DIR", "LISTENERS", "ROUTER_HOST", "ROUTER_PORT", "NODE_EXTRA_CA_CERTS"]);
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
};

const serde_json = {
  error: {

  },
};

function RESERVED_ENV_PREFIXES() {
  return Object.freeze(["ROUTER_DEPLOY_", "TLS_", "VERIFY_", "PRESERVATION_"]);
}

function VERIFIABLE_CLIENTS() {
  return Object.freeze(["claude", "codex", "qwen-code", "gemini", "opencode"]);
}

export const translated = { ["RESERVED_ENV"]: RESERVED_ENV(), ["RESERVED_ENV_PREFIXES"]: RESERVED_ENV_PREFIXES(), ["VERIFIABLE_CLIENTS"]: VERIFIABLE_CLIENTS() };
export const provenance = {"sourcePath":"src/deploy_config.rs","sourceSha256":"3ae8cf1934d158188b5685421eb38e9b39adab01a0d89873ce91ba663ae4483c","executable":3,"executableFunctions":0,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":51,"preserved":55,"runtimeParity":false};
