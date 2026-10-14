// Generated draft from src/log_analysis.rs; sha256=1de6eb76c0cfc42d2b3f47097461a60e0014894514278937f44addd765ccc313
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_array(values, validate) {
  if (!Array.isArray(values)) return false;
  for (let index = 0; index < values.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (!descriptor || !('value' in descriptor) || !validate(descriptor.value)) return false;
  }
  return true;
}

const ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = {"schemaVersion":1,"types":{"RouterOption_3_u64":{"kind":"data","name":"RouterOption_3_u64","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]}]}}};

const ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 = new Map([]);

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

const ml_host_value_schema_2ef90fdf8e74c81463fa719948a2a6c8c1e7dd05cb373659ce28ee92a64ea821 = {"schemaVersion":1,"types":{"RouterOption_4_bool":{"kind":"data","name":"RouterOption_4_bool","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"bool"}}]}]}}};

const ml_host_value_refinements_2ef90fdf8e74c81463fa719948a2a6c8c1e7dd05cb373659ce28ee92a64ea821 = new Map([]);

import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from "../runtime/json-values.mjs";

import { serde_json_value_get_string as ml_host_serde_json_value_get_string, serde_json_value_as_str as ml_host_serde_json_value_as_str, serde_json_value_as_bool as ml_host_serde_json_value_as_bool } from "../runtime/json-runtime.mjs";

const ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = {"schemaVersion":1,"types":{"rp_73657264655f6a736f6e2e4d6170456e747279":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279","ctors":[{"name":"MapEntry","fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}]}]},"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565","ctors":[{"name":"Map","fields":[{"name":"entries","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d6170456e747279"}}}]}]},"rp_73657264655f6a736f6e2e4e756d626572":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572","ctors":[{"name":"PosInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":false}}]},{"name":"NegInt","fields":[{"name":"field0","type":{"kind":"fixed","bits":64,"signed":true}}]},{"name":"Float","fields":[{"name":"field0","type":{"kind":"float"}}]}]},"rp_73657264655f6a736f6e2e56616c7565":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565","ctors":[{"name":"Null","fields":[]},{"name":"Bool","fields":[{"name":"field0","type":{"kind":"bool"}}]},{"name":"Number","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4e756d626572"}}]},{"name":"String","fields":[{"name":"field0","type":{"kind":"string"}}]},{"name":"Array","fields":[{"name":"field0","type":{"kind":"array","element":{"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}}}]},{"name":"Object","fields":[{"name":"field0","type":{"kind":"data","name":"rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565"}}]}]}}};

const ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 = new Map([["rp_73657264655f6a736f6e2e4e756d626572", ml_validate_json_number], ["rp_73657264655f6a736f6e2e4d61705f537472696e675f56616c7565", ml_validate_json_map]]);

function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_make_Exchange_Exchange(correlation_id, status, upstream_status, uri, streamed, stream_evidence, response_media_type, stream_requested, body_terminated, inspectable, stream_outcome, stream_complete, frames, undecodable_bodies, records, stream_error, encoded_frames, content_encoding) {
  if (!(typeof correlation_id === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(correlation_id))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(status, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(upstream_status, {"kind":"data","name":"RouterOption_3_u64"}, ml_host_value_schema_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3, { refinements: ml_host_value_refinements_0f463a09cb9641ad0e733a363d149d0149dcdd1579ef09ae0bcca8c2d5ade9c3 });
  ml_validate_rust_value(uri, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (!(typeof streamed === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof stream_evidence === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(response_media_type, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (!(typeof stream_requested === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof body_terminated === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof inspectable === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(stream_outcome, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  ml_validate_rust_value(stream_complete, {"kind":"data","name":"RouterOption_4_bool"}, ml_host_value_schema_2ef90fdf8e74c81463fa719948a2a6c8c1e7dd05cb373659ce28ee92a64ea821, { refinements: ml_host_value_refinements_2ef90fdf8e74c81463fa719948a2a6c8c1e7dd05cb373659ce28ee92a64ea821 });
  if (typeof frames !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(frames, 0n, 18446744073709551615n, "u64 argument frames out of range");
  if (!(typeof frames === 'bigint' && frames >= 0n && frames <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof undecodable_bodies !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(undecodable_bodies, 0n, 18446744073709551615n, "u64 argument undecodable_bodies out of range");
  if (!(typeof undecodable_bodies === 'bigint' && undecodable_bodies >= 0n && undecodable_bodies <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof records !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(records, 0n, 18446744073709551615n, "u64 argument records out of range");
  if (!(typeof records === 'bigint' && records >= 0n && records <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof stream_error === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(encoded_frames, (element0) => (typeof element0 === 'bigint' && element0 >= 0n && element0 <= 255n))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(content_encoding, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  return Object.freeze({ $: "Exchange", ["correlation_id"]: correlation_id, ["status"]: status, ["upstream_status"]: upstream_status, ["uri"]: uri, ["streamed"]: streamed, ["stream_evidence"]: stream_evidence, ["response_media_type"]: response_media_type, ["stream_requested"]: stream_requested, ["body_terminated"]: body_terminated, ["inspectable"]: inspectable, ["stream_outcome"]: stream_outcome, ["stream_complete"]: stream_complete, ["frames"]: frames, ["undecodable_bodies"]: undecodable_bodies, ["records"]: records, ["stream_error"]: stream_error, ["encoded_frames"]: encoded_frames, ["content_encoding"]: content_encoding });
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

function ml_make_Anomaly_Anomaly(kind, detail, correlation_ids) {
  if (!(typeof kind === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(kind))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof detail === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(detail))) throw new TypeError('argument outside supported Rust value domain');
  if (!ml_router_array(correlation_ids, (element0) => (typeof element0 === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(element0)))) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "Anomaly", ["kind"]: kind, ["detail"]: detail, ["correlation_ids"]: correlation_ids });
}

function rp_6c6f675f616e616c797369732e73746f7265645f6279746573(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(record, "body"), (body) => { return ml_host_serde_json_value_get_string(body, rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559()); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_str(ml_host_callback_0_0); }, "and_then");
}

function rp_726571756573745f6c6f672e726564616374696f6e2e42494e4152595f424f44595f4b4559() {
  return "base64";
}

function rp_6c6f675f616e616c797369732e726571756573745f61736b735f666f725f615f73747265616d(record) {
  ml_validate_rust_value(record, {"kind":"data","name":"rp_73657264655f6a736f6e2e56616c7565"}, ml_host_value_schema_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32, { refinements: ml_host_value_refinements_b06bcea6d2cad40d73e818122a7dbed699c3b1b782df0777263a5df8e71e6a32 });
  return (() => {
    const ml_standard_body_2 = ml_host_option_bind(ml_host_option_bind(ml_host_option_bind(ml_host_serde_json_value_get_string(record, "body"), (body) => { return ml_host_serde_json_value_get_string(body, "json"); }, "and_then"), (body_2) => { return ml_host_serde_json_value_get_string(body_2, "stream"); }, "and_then"), (ml_host_callback_0_0) => { return ml_host_serde_json_value_as_bool(ml_host_callback_0_0); }, "and_then");
    const ml_standard_body_3 = false;
    switch (ml_standard_body_2.$) {
      case "None": {
        return ml_standard_body_3;
      }
      case "Some": {
        const x = ml_standard_body_2.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_2);
      }
    }
  })();
}

export const translated = { ["Exchange"]: ml_make_Exchange_Exchange, ["Anomaly"]: ml_make_Anomaly_Anomaly, ["stored_bytes"]: rp_6c6f675f616e616c797369732e73746f7265645f6279746573, ["request_asks_for_a_stream"]: rp_6c6f675f616e616c797369732e726571756573745f61736b735f666f725f615f73747265616d };
export const provenance = {"sourcePath":"src/log_analysis.rs","sourceSha256":"1de6eb76c0cfc42d2b3f47097461a60e0014894514278937f44addd765ccc313","executable":4,"executableFunctions":2,"executableConstants":0,"executableTypes":2,"executableConstructors":2,"carried":23,"preserved":28,"runtimeParity":false};
