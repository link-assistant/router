// Generated draft from src/config_defaults.rs; sha256=98df913d7be1cb02a4a5ad82bbdb2f822a22b8c37546257e3bf61f7ec17a77c9
// Carried constructs are data, never runtime parity evidence.
function default_gonka_model() {
  return "";
}

function default_openai_compatible_base_url() {
  return "http://localhost:4000/v1";
}

export const translated: { "default_gonka_model": () => string; "default_openai_compatible_base_url": () => string } = { default_gonka_model, default_openai_compatible_base_url };
export const provenance = {"sourcePath":"src/config_defaults.rs","sourceSha256":"98df913d7be1cb02a4a5ad82bbdb2f822a22b8c37546257e3bf61f7ec17a77c9","executable":2,"executableFunctions":2,"executableConstants":0,"carried":3,"preserved":6,"runtimeParity":false};
