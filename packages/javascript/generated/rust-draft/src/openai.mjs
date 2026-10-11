// Generated draft from src/openai.rs; sha256=9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373(reason) {
  ml_validate_rust_value(reason, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = ml_router_unwrap(reason, "end_turn", true);
  if ((ml_s1 === "end_turn")) {
    return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
  } else {
    if ((ml_s1 === "stop_sequence")) {
      return rp_6272696467655f726573706f6e73652e636f6d706c657465("stop");
    } else {
      if ((ml_s1 === "tool_use")) {
        return rp_6272696467655f726573706f6e73652e636f6d706c657465("tool_calls");
      } else {
        if ((ml_s1 === "refusal")) {
          return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("content_filter", "content_filter", true);
        } else {
          if ((ml_s1 === "max_tokens")) {
            return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
          } else {
            if ((ml_s1 === "pause_turn")) {
              return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
            } else {
              if ((ml_s1 === "model_context_window_exceeded")) {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              } else {
                return rp_6272696467655f726573706f6e73652e696e636f6d706c657465("length", "max_output_tokens", false);
              }
            }
          }
        }
      }
    }
  }
}

function rp_6272696467655f726573706f6e73652e636f6d706c657465(chat_finish_reason) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "completed";
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6272696467655f726573706f6e73652e696e636f6d706c657465(chat_finish_reason, reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "incomplete";
  const ml_record3 = Object.freeze({ $: 'Some', field0: reason });
  const ml_record4 = refusal;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function rp_6f70656e61692e6d61705f66696e6973685f726561736f6e(reason) {
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  return (rp_6272696467655f726573706f6e73652e73746f705f73656d616e74696373(Object.freeze({ $: 'Some', field0: reason }))).chat_finish_reason;
}

export const translated = { ["map_finish_reason"]: rp_6f70656e61692e6d61705f66696e6973685f726561736f6e };
export const provenance = {"sourcePath":"src/openai.rs","sourceSha256":"9c7d6a2c5a25987042a54b98f96b2688a9d1ee2204cf670efa62e220ca15a87d","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":28,"runtimeParity":false};
