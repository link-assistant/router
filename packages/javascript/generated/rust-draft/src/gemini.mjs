// Generated draft from src/gemini.rs; sha256=45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76
// Carried constructs are data, never runtime parity evidence.
function PROJECT_ENV() {
  return "GEMINI_PROJECT";
}

function MODEL_OWNER() {
  return "google";
}

function map_finish_reason(gemini) {
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

export const translated = { "PROJECT_ENV": PROJECT_ENV(), "MODEL_OWNER": MODEL_OWNER(), map_finish_reason };
export const provenance = {"sourcePath":"src/gemini.rs","sourceSha256":"45fab87a764fdb42974ea14f93bdeaef1c911eb24a825b6507bb429baa186e76","executable":3,"executableFunctions":1,"executableConstants":2,"carried":33,"preserved":37,"runtimeParity":false};
