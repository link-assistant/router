// Generated draft from src/model_routing_stored.rs; sha256=fca8ad6c7d0954034226f46c1203105e102707a951ba20cab09cc2065cac7291
// Carried constructs are data, never runtime parity evidence.
function bare_model_id(model: string) {
  if (!(typeof model === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(model))) throw new TypeError('argument outside supported Rust value domain');
  return model;
}

export const translated: { "bare_model_id": (model: string) => string } = { bare_model_id };
export const provenance = {"sourcePath":"src/model_routing_stored.rs","sourceSha256":"fca8ad6c7d0954034226f46c1203105e102707a951ba20cab09cc2065cac7291","executable":1,"executableFunctions":1,"executableConstants":0,"carried":8,"preserved":9,"runtimeParity":false};
