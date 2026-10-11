// Generated draft from src/proxy/upstream_headers.rs; sha256=4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function forwarded_client_headers() {
  return Object.freeze(["user-agent", "anthropic-version", "anthropic-beta", "x-stainless-*", "x-claude-code-*", "accept", "content-type"]);
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

function DEFAULT_ANTHROPIC_VERSION() {
  return "2023-06-01";
}

function OAUTH_BETA_FLAG() {
  return "oauth-2025-04-20";
}

function rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_70726f78792e757073747265616d5f686561646572732e4d41585f50524f58595f524551554553545f4259544553() {
  return rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553();
}

function INGRESS_NETWORK_HEADERS() {
  return Object.freeze(["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "x-forwarded-server", "x-original-forwarded-for", "x-real-ip", "x-client-ip", "x-cluster-client-ip", "cf-connecting-ip", "true-client-ip", "fastly-client-ip", "fly-client-ip", "x-envoy-external-address", "x-forwarded-client-cert", "x-azure-clientip", "x-appengine-user-ip", "cloudfront-viewer-address"]);
}

export const translated = { ["forwarded_client_headers"]: forwarded_client_headers, ["DEFAULT_ANTHROPIC_VERSION"]: DEFAULT_ANTHROPIC_VERSION(), ["OAUTH_BETA_FLAG"]: OAUTH_BETA_FLAG(), ["MAX_PROXY_REQUEST_BYTES"]: rp_70726f78792e757073747265616d5f686561646572732e4d41585f50524f58595f524551554553545f4259544553(), ["INGRESS_NETWORK_HEADERS"]: INGRESS_NETWORK_HEADERS() };
export const provenance = {"sourcePath":"src/proxy/upstream_headers.rs","sourceSha256":"4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":15,"runtimeParity":false};
