// Generated draft from experiments/issue-703/shard-unit-tests.rs; sha256=fd33cc0cd0e73bc0a5884c7b8fb9732f8a9cb05fe1d4bd5c964c696dc79d2d15
// Carried constructs are data, never runtime parity evidence.
function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

function DEFAULT_SHARDS() {
  return 8n;
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

function ml_make_Sharder_Sharder(file, counts) {
  if (!(typeof file === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(counts, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 18446744073709551615n))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Sharder", ["file"]: file, ["counts"]: counts });
}

export const translated = { ["DEFAULT_SHARDS"]: DEFAULT_SHARDS(), ["Sharder"]: ml_make_Sharder_Sharder };
export const provenance = {"sourcePath":"experiments/issue-703/shard-unit-tests.rs","sourceSha256":"fd33cc0cd0e73bc0a5884c7b8fb9732f8a9cb05fe1d4bd5c964c696dc79d2d15","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":8,"preserved":10,"runtimeParity":false};
