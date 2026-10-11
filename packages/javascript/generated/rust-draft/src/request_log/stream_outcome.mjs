// Generated draft from src/request_log/stream_outcome.rs; sha256=92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

const ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65":{"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65","ctors":[{"name":"StreamOutcome","fields":[{"name":"streamed","type":{"kind":"bool"}},{"name":"terminated","type":{"kind":"bool"}},{"name":"inspectable","type":{"kind":"bool"}},{"name":"detail","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}},{"name":"frames","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"bytes","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"duration_ms","type":{"kind":"fixed","bits":128,"signed":false}}]}]}}};

const ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb = new Map([]);

function ml_make_StreamOutcome_StreamOutcome(streamed, terminated, inspectable, detail, frames, bytes, duration_ms) {
  if (!(typeof streamed === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof terminated === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof inspectable === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(detail, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  ml_fixed(frames, 0n, 18446744073709551615n, "u64 argument frames out of range");
  if (!(typeof frames === 'bigint' && frames >= 0n && frames <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(bytes, 0n, 18446744073709551615n, "u64 argument bytes out of range");
  if (!(typeof bytes === 'bigint' && bytes >= 0n && bytes <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  ml_fixed(duration_ms, 0n, 340282366920938463463374607431768211455n, "u128 argument duration_ms out of range");
  if (!(typeof duration_ms === 'bigint' && duration_ms >= 0n && duration_ms <= 340282366920938463463374607431768211455n)) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "StreamOutcome", ["streamed"]: streamed, ["terminated"]: terminated, ["inspectable"]: inspectable, ["detail"]: detail, ["frames"]: frames, ["bytes"]: bytes, ["duration_ms"]: duration_ms });
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

function STREAM_END_MARKER() {
  return "stream-end marker";
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67(outcome) {
  ml_validate_rust_value(outcome, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  return rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(outcome);
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb, { refinements: ml_host_value_refinements_6c7ef5e1c2e4745d0fa540599f956e9125cb91c8e1b7ba9204a21a9b7a5a1ceb });
  if (((router_self).detail.$ === 'Some')) {
    return true;
  } else {
  }
  return (((router_self).streamed && (router_self).inspectable) && !(router_self).terminated);
}

function text_terminates_stream(text) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  return (((text.includes("message_stop") || text.includes("[DONE]")) || text.includes("response.completed")) || text.includes("finishReason"));
}

export const translated = { ["StreamOutcome"]: ml_make_StreamOutcome_StreamOutcome, ["STREAM_END_MARKER"]: STREAM_END_MARKER(), ["stream_warrants_a_warning"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67, ["text_terminates_stream"]: text_terminates_stream };
export const provenance = {"sourcePath":"src/request_log/stream_outcome.rs","sourceSha256":"92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29","executable":4,"executableFunctions":2,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":7,"preserved":12,"runtimeParity":false};
