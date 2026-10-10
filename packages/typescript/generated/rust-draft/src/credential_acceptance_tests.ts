// Generated draft from src/credential_acceptance_tests.rs; sha256=366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16
// Carried constructs are data, never runtime parity evidence.
function is_inference_path(path: string) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  return ((path.includes("messages") || path.includes("responses")) || path.includes("chat/completions"));
}

export const translated: { "is_inference_path": (path: string) => boolean } = { is_inference_path };
export const provenance = {"sourcePath":"src/credential_acceptance_tests.rs","sourceSha256":"366cf13d87f47e43da00ba3b538d17db1add12518f97f95f1def15d430809b16","executable":1,"executableFunctions":1,"executableConstants":0,"carried":19,"preserved":20,"runtimeParity":false};
