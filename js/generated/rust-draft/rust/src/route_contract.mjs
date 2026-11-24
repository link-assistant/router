// Generated draft from rust/src/route_contract.rs; sha256=a4a58d9a6054aada46879b16dbf9593c3a1c939e5602cc503dd1c327c5795ec1
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 = {"schemaVersion":1,"types":{"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64":{"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAi","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Bedrock","fields":[]},{"name":"GitHub","fields":[]},{"name":"Git","fields":[]},{"name":"ActivityPub","fields":[]}]}}};

const ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 = new Map([]);

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' }), Object.freeze({ $: 'InferenceOnly' })]));
}

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f41444d494e() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' }), Object.freeze({ $: 'Admin' })]));
}

function rp_726f7574655f636f6e74726163742e434f4d42494e45445f4f4e4c59() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'Combined' })]));
}

function rp_726f7574655f636f6e74726163742e4749544855425f414441505445525f4f4e4c59() {
  return Object.freeze(Object.freeze([Object.freeze({ $: 'GitHubAdapter' })]));
}

function rp_726f7574655f636f6e74726163742e736572766963655f626173655f70617468(service) {
  ml_validate_rust_value(service, {"kind":"data","name":"rp_726f7574655f636f6e74726163742e74797065732e536572766963654b696e64"}, ml_host_value_schema_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0, { refinements: ml_host_value_refinements_982f1054220c602571873e9386559c249904ba3065441f28d20404db5a66c5f0 });
  switch (service.$) {
    case "Anthropic": {
      return "/api/services/anthropic";
    }
    case "OpenAi": {
      return "/api/services/openai/v1";
    }
    case "Codex": {
      return "/api/services/codex/v1";
    }
    case "Qwen": {
      return "/api/services/qwen/v1";
    }
    case "Gemini": {
      return "/api/services/gemini";
    }
    case "Vertex": {
      return "/api/services/vertex/v1";
    }
    case "Bedrock": {
      return "/api/services/bedrock";
    }
    case "GitHub": {
      return "/api/services/github/api/v3";
    }
    case "Git": {
      return "/api/services/github/git";
    }
    case "ActivityPub": {
      return "/api/services/activitypub";
    }
    default: {
      return ml_router_unexpected(service);
    }
  }
}

export const translated = { ["COMBINED_AND_INFERENCE"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f494e464552454e4345(), ["COMBINED_AND_ADMIN"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f414e445f41444d494e(), ["COMBINED_ONLY"]: rp_726f7574655f636f6e74726163742e434f4d42494e45445f4f4e4c59(), ["GITHUB_ADAPTER_ONLY"]: rp_726f7574655f636f6e74726163742e4749544855425f414441505445525f4f4e4c59(), ["service_base_path"]: rp_726f7574655f636f6e74726163742e736572766963655f626173655f70617468 };
export const provenance = {"sourcePath":"rust/src/route_contract.rs","sourceSha256":"a4a58d9a6054aada46879b16dbf9593c3a1c939e5602cc503dd1c327c5795ec1","executable":5,"executableFunctions":1,"executableConstants":4,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":30,"runtimeParity":false};
