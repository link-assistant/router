// Generated draft from src/upstream_client.rs; sha256=ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73
// Carried constructs are data, never runtime parity evidence.
function DEFAULT_UPSTREAM_READ_TIMEOUT_SECS() {
  return 120n;
}

function DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS() {
  return 10n;
}

function DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS() {
  return DEFAULT_UPSTREAM_READ_TIMEOUT_SECS();
}

export const translated: { "DEFAULT_UPSTREAM_READ_TIMEOUT_SECS": bigint; "DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS": bigint; "DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS": bigint } = { "DEFAULT_UPSTREAM_READ_TIMEOUT_SECS": DEFAULT_UPSTREAM_READ_TIMEOUT_SECS(), "DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS": DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS(), "DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS": DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS() };
export const provenance = {"sourcePath":"src/upstream_client.rs","sourceSha256":"ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73","executable":3,"executableFunctions":0,"executableConstants":3,"carried":26,"preserved":30,"runtimeParity":false};
