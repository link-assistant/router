// Generated draft from src/bridge_response.rs; sha256=5dc06a1b9326f20e357391fc3aae75ef06ec8c151835b4b257011c3cf0136340
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_router_unwrap(value, fallback, option) {
  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;
}

function ml_make_StopSemantics_StopSemantics(chat_finish_reason, response_status, incomplete_reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof response_status === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(response_status))) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(incomplete_reason, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: chat_finish_reason, ["response_status"]: response_status, ["incomplete_reason"]: incomplete_reason, ["refusal"]: refusal });
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

function stop_semantics(reason) {
  ml_validate_rust_value(reason, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  const ml_s1 = ml_router_unwrap(reason, "end_turn", true);
  if ((ml_s1 === "end_turn")) {
    return complete("stop");
  } else {
    if ((ml_s1 === "stop_sequence")) {
      return complete("stop");
    } else {
      if ((ml_s1 === "tool_use")) {
        return complete("tool_calls");
      } else {
        if ((ml_s1 === "refusal")) {
          return incomplete("content_filter", "content_filter", true);
        } else {
          if ((ml_s1 === "max_tokens")) {
            return incomplete("length", "max_output_tokens", false);
          } else {
            if ((ml_s1 === "pause_turn")) {
              return incomplete("length", "max_output_tokens", false);
            } else {
              if ((ml_s1 === "model_context_window_exceeded")) {
                return incomplete("length", "max_output_tokens", false);
              } else {
                return incomplete("length", "max_output_tokens", false);
              }
            }
          }
        }
      }
    }
  }
}

function complete(chat_finish_reason) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "completed";
  const ml_record3 = Object.freeze({ $: 'None' });
  const ml_record4 = false;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

function incomplete(chat_finish_reason, reason, refusal) {
  if (!(typeof chat_finish_reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(chat_finish_reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof reason === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(reason))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof refusal === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  const ml_record1 = chat_finish_reason;
  const ml_record2 = "incomplete";
  const ml_record3 = Object.freeze({ $: 'Some', field0: reason });
  const ml_record4 = refusal;
  return Object.freeze({ $: "StopSemantics", ["chat_finish_reason"]: ml_record1, ["response_status"]: ml_record2, ["incomplete_reason"]: ml_record3, ["refusal"]: ml_record4 });
}

export const translated = { ["StopSemantics"]: ml_make_StopSemantics_StopSemantics, ["stop_semantics"]: stop_semantics, ["complete"]: complete, ["incomplete"]: incomplete };
export const provenance = {"sourcePath":"src/bridge_response.rs","sourceSha256":"5dc06a1b9326f20e357391fc3aae75ef06ec8c151835b4b257011c3cf0136340","executable":4,"executableFunctions":3,"executableConstants":0,"executableTypes":1,"executableConstructors":1,"carried":16,"preserved":21,"runtimeParity":false};
