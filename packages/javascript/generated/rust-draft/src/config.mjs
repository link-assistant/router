// Generated draft from src/config.rs; sha256=9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a
// Carried constructs are data, never runtime parity evidence.
function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function DEFAULT_MAX_PROXY_REQUEST_BYTES() {
  return ml_fixed((ml_fixed((64n * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow") * 1024n), 0n, 18446744073709551615n, "attempt to multiply with overflow");
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

function ml_make_ApiFormat_Anthropic() {
  return Object.freeze({ $: 'Anthropic' });
}

function ml_make_ApiFormat_Bedrock() {
  return Object.freeze({ $: 'Bedrock' });
}

function ml_make_ApiFormat_Vertex() {
  return Object.freeze({ $: 'Vertex' });
}

function rp_636f6e6669672e64656661756c745f6d70705f636f6e666967() {
  const ml_record1 = false;
  const ml_record2 = "0.00";
  const ml_record3 = "USD";
  const ml_record4 = "";
  const ml_record5 = Object.freeze({ $: 'None' });
  return Object.freeze({ $: "MppConfig", ["enabled"]: ml_record1, ["amount"]: ml_record2, ["currency"]: ml_record3, ["recipient"]: ml_record4, ["method"]: ml_record5 });
}

function default_activitypub_public_key_pem() {
  return "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----";
}

export const translated = { ["DEFAULT_MAX_PROXY_REQUEST_BYTES"]: DEFAULT_MAX_PROXY_REQUEST_BYTES(), ["ApiFormat"]: Object.freeze({ ["Anthropic"]: ml_make_ApiFormat_Anthropic, ["Bedrock"]: ml_make_ApiFormat_Bedrock, ["Vertex"]: ml_make_ApiFormat_Vertex }), ["default_mpp_config"]: rp_636f6e6669672e64656661756c745f6d70705f636f6e666967, ["default_activitypub_public_key_pem"]: default_activitypub_public_key_pem };
export const provenance = {"sourcePath":"src/config.rs","sourceSha256":"9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a","executable":4,"executableFunctions":2,"executableConstants":1,"executableTypes":1,"executableConstructors":3,"carried":29,"preserved":34,"runtimeParity":false};
