
// Generated draft from src/proxy/upstream_headers.rs; sha256=4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function rp_70726f78792e757073747265616d5f686561646572732e44454641554c545f414e5448524f5049435f56455253494f4e(): string {
  return "2023-06-01";
}

function rp_70726f78792e757073747265616d5f686561646572732e4f415554485f424554415f464c4147(): string {
  return "oauth-2025-04-20";
}

function rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553(): bigint {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
}

function rp_70726f78792e757073747265616d5f686561646572732e4d41585f50524f58595f524551554553545f4259544553(): bigint {
  return rp_636f6e6669672e44454641554c545f4d41585f50524f58595f524551554553545f4259544553();
}

function rp_70726f78792e757073747265616d5f686561646572732e494e47524553535f4e4554574f524b5f48454144455253(): ReadonlyArray<string> {
  return Object.freeze(Object.freeze(["forwarded", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "x-forwarded-server", "x-original-forwarded-for", "x-real-ip", "x-client-ip", "x-cluster-client-ip", "cf-connecting-ip", "true-client-ip", "fastly-client-ip", "fly-client-ip", "x-envoy-external-address", "x-forwarded-client-cert", "x-azure-clientip", "x-appengine-user-ip", "cloudfront-viewer-address"]));
}

export const translated: { "DEFAULT_ANTHROPIC_VERSION": string; "OAUTH_BETA_FLAG": string; "MAX_PROXY_REQUEST_BYTES": bigint; "INGRESS_NETWORK_HEADERS": ReadonlyArray<string> } = { ["DEFAULT_ANTHROPIC_VERSION"]: rp_70726f78792e757073747265616d5f686561646572732e44454641554c545f414e5448524f5049435f56455253494f4e(), ["OAUTH_BETA_FLAG"]: rp_70726f78792e757073747265616d5f686561646572732e4f415554485f424554415f464c4147(), ["MAX_PROXY_REQUEST_BYTES"]: rp_70726f78792e757073747265616d5f686561646572732e4d41585f50524f58595f524551554553545f4259544553(), ["INGRESS_NETWORK_HEADERS"]: rp_70726f78792e757073747265616d5f686561646572732e494e47524553535f4e4554574f524b5f48454144455253() };
export const provenance = {"sourcePath":"src/proxy/upstream_headers.rs","sourceSha256":"4ff0d415248394ab0f70ceb7a26702a11988cdcd8be1441587a59dac5f8daa48","executable":4,"executableFunctions":0,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":10,"preserved":15,"runtimeParity":false};
