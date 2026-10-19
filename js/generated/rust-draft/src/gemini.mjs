// Generated draft from src/gemini.rs; sha256=45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76
// Carried constructs are data, never runtime parity evidence.
function rp_67656d696e692e50524f4a4543545f454e56() {
  return "GEMINI_PROJECT";
}

function rp_67656d696e692e4d4f44454c5f4f574e4552() {
  return "google";
}

function rp_67656d696e692e6d61705f66696e6973685f726561736f6e(gemini) {
  if (!(typeof gemini === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(gemini))) throw new TypeError('argument outside supported Rust value domain');
  if ((gemini === "STOP")) {
    return "stop";
  } else {
    if ((gemini === "MAX_TOKENS")) {
      return "length";
    } else {
      return "content_filter";
    }
  }
}

function ml_make_ShapeIn_Chat() {
  return Object.freeze({ $: 'Chat' });
}

function ml_make_ShapeIn_Responses() {
  return Object.freeze({ $: 'Responses' });
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

export const translated = { ["PROJECT_ENV"]: rp_67656d696e692e50524f4a4543545f454e56(), ["MODEL_OWNER"]: rp_67656d696e692e4d4f44454c5f4f574e4552(), ["map_finish_reason"]: rp_67656d696e692e6d61705f66696e6973685f726561736f6e, ["ShapeIn"]: Object.freeze({ ["Chat"]: ml_make_ShapeIn_Chat, ["Responses"]: ml_make_ShapeIn_Responses }) };
export const provenance = {"sourcePath":"src/gemini.rs","sourceSha256":"45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76","executable":4,"executableFunctions":1,"executableConstants":2,"executableTypes":1,"executableConstructors":2,"carried":32,"preserved":37,"runtimeParity":false};
