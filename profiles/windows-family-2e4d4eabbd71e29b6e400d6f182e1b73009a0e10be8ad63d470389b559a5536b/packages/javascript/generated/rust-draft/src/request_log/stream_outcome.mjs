// Generated draft from src/request_log/stream_outcome.rs; sha256=92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

import { snapshotConstructorValue as ml_snapshot_constructor_value, assertConstructorInput as ml_assert_constructor_input } from "../../runtime/constructor-value-runtime.mjs";

const ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_constructor_value_schema_d5dd52df7599fa6bfbed0dd930960d9bd72f0e341c3f85dda77dba2602209ca6 = {"schemaVersion":1,"types":{"StreamOutcome":{"kind":"data","name":"StreamOutcome","ctors":[{"name":"StreamOutcome","fields":[{"name":"streamed","type":{"kind":"bool"}},{"name":"terminated","type":{"kind":"bool"}},{"name":"inspectable","type":{"kind":"bool"}},{"name":"detail","type":{"kind":"data","name":"RouterOption_17_rust_owned_string"}},{"name":"frames","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"bytes","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"duration_ms","type":{"kind":"fixed","bits":128,"signed":false}}]}]},"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

const ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = {"schemaVersion":1,"types":{"RouterOption_17_rust_owned_string":{"kind":"data","name":"RouterOption_17_rust_owned_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e = new Map([]);

const ml_host_value_schema_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]},"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65":{"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65","ctors":[{"name":"StreamOutcome","fields":[{"name":"streamed","type":{"kind":"bool"}},{"name":"terminated","type":{"kind":"bool"}},{"name":"inspectable","type":{"kind":"bool"}},{"name":"detail","type":{"kind":"data","name":"rp_526f757465724f7074696f6e5f31375f727573745f6f776e65645f737472696e67"}},{"name":"frames","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"bytes","type":{"kind":"fixed","bits":64,"signed":false}},{"name":"duration_ms","type":{"kind":"fixed","bits":128,"signed":false}}]}]}}};

const ml_host_value_refinements_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106 = new Map([]);

import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from "../../runtime/csv-string-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function ml_make_StreamOutcome_StreamOutcome(streamed, terminated, inspectable, detail, frames, bytes, duration_ms) {
  if (!(typeof streamed === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof terminated === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof inspectable === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_assert_constructor_input(detail, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_constructor_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e);
  ml_validate_rust_value(detail, {"kind":"data","name":"RouterOption_17_rust_owned_string"}, ml_host_value_schema_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e, { refinements: ml_host_value_refinements_03a1d5eee9bc456aef10a174b0d622b72c95af177d20511e912057751ffdcd7e });
  if (typeof frames !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(frames, 0n, 18446744073709551615n, "u64 argument frames out of range");
  if (!(typeof frames === 'bigint' && frames >= 0n && frames <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof bytes !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(bytes, 0n, 18446744073709551615n, "u64 argument bytes out of range");
  if (!(typeof bytes === 'bigint' && bytes >= 0n && bytes <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  if (typeof duration_ms !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(duration_ms, 0n, 340282366920938463463374607431768211455n, "u128 argument duration_ms out of range");
  if (!(typeof duration_ms === 'bigint' && duration_ms >= 0n && duration_ms <= 340282366920938463463374607431768211455n)) throw new TypeError('argument outside supported Rust value domain');
  return ml_snapshot_constructor_value(Object.freeze({ $: "StreamOutcome", ["streamed"]: streamed, ["terminated"]: terminated, ["inspectable"]: inspectable, ["detail"]: detail, ["frames"]: frames, ["bytes"]: bytes, ["duration_ms"]: duration_ms }), {"kind":"data","name":"StreamOutcome"}, ml_constructor_value_schema_d5dd52df7599fa6bfbed0dd930960d9bd72f0e341c3f85dda77dba2602209ca6);
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

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53545245414d5f454e445f4d41524b4552() {
  return "stream-end marker";
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67(outcome) {
  ml_validate_rust_value(outcome, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106, { refinements: ml_host_value_refinements_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106 });
  return rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(outcome);
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e6d6c5f696d706c5f36333732363137343635326537323635373137353635373337343566366336663637326537333734373236353631366435663666373537343633366636643635326535333734373236353631366434663735373436333666366436355f3639373335663634363536643666366537333734373236313632366337393566363337353734(router_self) {
  ml_validate_rust_value(router_self, {"kind":"data","name":"rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53747265616d4f7574636f6d65"}, ml_host_value_schema_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106, { refinements: ml_host_value_refinements_766d6723e004a4c15a13d337c2127a6016abfe2e2e3b3108dc42bd5cc363c106 });
  if (((router_self).detail.$ === 'Some')) {
    return true;
  } else {
  }
  return (((router_self).streamed && (router_self).inspectable) && !(router_self).terminated);
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e69735f73747265616d696e675f6d656469615f74797065(content_type) {
  ml_validate_rust_value(content_type, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  return (() => {
    const ml_standard_callback_self_1 = content_type;
    switch (ml_standard_callback_self_1.$) {
      case "None": {
        return true;
      }
      case "Some": {
        const ml_standard_pattern_2 = ml_standard_callback_self_1.field0;
        const ml_standard_callback_arg_1 = ml_standard_pattern_2;
        const value = ml_standard_callback_arg_1;
        return ((((() => {
          const ml_standard_body_1 = ml_csv_split_next(ml_csv_split(value, ";"));
          switch (ml_standard_body_1.$) {
            case "None": {
              return "";
            }
            case "Some": {
              const x = ml_standard_body_1.field0;
              return x;
            }
            default: {
              return ml_router_unexpected(ml_standard_body_1);
            }
          }
        })()).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '')).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)) === ("text/event-stream").replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)));
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_1);
      }
    }
  })();
}

function rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e746578745f7465726d696e617465735f73747265616d(text) {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  return ((((() => {
    const ml_text_1 = text;
    const ml_text_2 = "message_stop";
    return ml_text_1.includes(ml_text_2);
  })() || (() => {
    const ml_text_3 = text;
    const ml_text_4 = "[DONE]";
    return ml_text_3.includes(ml_text_4);
  })()) || (() => {
    const ml_text_5 = text;
    const ml_text_6 = "response.completed";
    return ml_text_5.includes(ml_text_6);
  })()) || (() => {
    const ml_text_7 = text;
    const ml_text_8 = "finishReason";
    return ml_text_7.includes(ml_text_8);
  })());
}

export const translated = { ["StreamOutcome"]: ml_make_StreamOutcome_StreamOutcome, ["STREAM_END_MARKER"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e53545245414d5f454e445f4d41524b4552(), ["stream_warrants_a_warning"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e73747265616d5f77617272616e74735f615f7761726e696e67, ["is_streaming_media_type"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e69735f73747265616d696e675f6d656469615f74797065, ["text_terminates_stream"]: rp_726571756573745f6c6f672e73747265616d5f6f7574636f6d652e746578745f7465726d696e617465735f73747265616d };
export const provenance = {"sourcePath":"src/request_log/stream_outcome.rs","sourceSha256":"92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29","executable":5,"executableFunctions":3,"executableConstants":1,"executableTypes":1,"executableConstructors":1,"carried":6,"preserved":12,"runtimeParity":false};
