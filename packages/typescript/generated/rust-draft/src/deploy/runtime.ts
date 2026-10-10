// Generated draft from src/deploy/runtime.rs; sha256=f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04
// Carried constructs are data, never runtime parity evidence.
function explain_unavailable(error: string) {
  if (!(typeof error === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error))) throw new TypeError('argument outside supported Rust value domain');
  const lowered = (error).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if (lowered.includes("permission denied")) {
    return "permission denied while connecting to Docker; add this user to the Docker group";
  } else {
    if (lowered.includes("not installed")) {
      return error;
    } else {
      return ("the Docker daemon is not running or unreachable: " + error);
    }
  }
}

function is_absent(error: string) {
  if (!(typeof error === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(error))) throw new TypeError('argument outside supported Rust value domain');
  const lowered = (error).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  return ((lowered.includes("no such object") || lowered.includes("no such container")) || lowered.includes("no such image"));
}

export const translated: { "explain_unavailable": (error: string) => string; "is_absent": (error: string) => boolean } = { explain_unavailable, is_absent };
export const provenance = {"sourcePath":"src/deploy/runtime.rs","sourceSha256":"f532645841e7f32dc2d9f01cdeb9b75eae721f593e29b1a866065269bd09ad04","executable":2,"executableFunctions":2,"executableConstants":0,"carried":13,"preserved":16,"runtimeParity":false};
