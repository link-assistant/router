type MLData_72705f3734363836393665366236393665363732653534363836393665366236393665363735303732366637343666363336663663 = Readonly<{ readonly "$": "Anthropic" }> | Readonly<{ readonly "$": "OpenAIChat" }> | Readonly<{ readonly "$": "OpenAIResponses" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Vertex" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Qwen" }> | Readonly<{ readonly "$": "Interactions" }> | Readonly<{ readonly "$": "Antigravity" }> | Readonly<{ readonly "$": "Kimi" }> | Readonly<{ readonly "$": "Xai" }>;
// Generated draft from src/thinking/policy.rs; sha256=aa7e338d9caed32d5c9345465bcc2cd86981ce5409ec61d8569007c1721332fc
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe = {"schemaVersion":1,"types":{"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c":{"kind":"data","name":"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAIChat","fields":[]},{"name":"OpenAIResponses","fields":[]},{"name":"Gemini","fields":[]},{"name":"Vertex","fields":[]},{"name":"Codex","fields":[]},{"name":"Qwen","fields":[]},{"name":"Interactions","fields":[]},{"name":"Antigravity","fields":[]},{"name":"Kimi","fields":[]},{"name":"Xai","fields":[]}]}}};

const ml_host_value_refinements_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe = new Map([]);

function rp_7468696e6b696e672e706f6c6963792e6b657973(protocol: Readonly<{ readonly "$": "Anthropic" }> | Readonly<{ readonly "$": "OpenAIChat" }> | Readonly<{ readonly "$": "OpenAIResponses" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Vertex" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Qwen" }> | Readonly<{ readonly "$": "Interactions" }> | Readonly<{ readonly "$": "Antigravity" }> | Readonly<{ readonly "$": "Kimi" }> | Readonly<{ readonly "$": "Xai" }>): ReadonlyArray<string> {
  ml_validate_rust_value(protocol, {"kind":"data","name":"rp_7468696e6b696e672e5468696e6b696e6750726f746f636f6c"}, ml_host_value_schema_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe, { refinements: ml_host_value_refinements_1c499caf4dae6d3d3340ae46e10ab5a1268e3757bf0a7c6ea7cebbc94f754bbe });
  switch (protocol.$) {
    case "Anthropic": {
      return Object.freeze(["thinking", "output_config"]);
    }
    case "OpenAIChat": {
      return Object.freeze(["reasoning_effort", "reasoning", "enable_thinking", "thinking_budget"]);
    }
    case "OpenAIResponses": {
      return Object.freeze(["reasoning"]);
    }
    case "Gemini": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Vertex": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Codex": {
      return Object.freeze(["reasoning"]);
    }
    case "Qwen": {
      return Object.freeze(["reasoning_effort", "reasoning", "enable_thinking", "thinking_budget"]);
    }
    case "Interactions": {
      return Object.freeze(["thinking_level", "thinking_budget"]);
    }
    case "Antigravity": {
      return Object.freeze(["generationConfig", "generation_config"]);
    }
    case "Kimi": {
      return Object.freeze(["thinking", "output_config"]);
    }
    case "Xai": {
      return Object.freeze(["reasoning"]);
    }
    default: {
      return ml_router_unexpected(protocol);
    }
  }
}

export const translated: { "keys": (protocol: Readonly<{ readonly "$": "Anthropic" }> | Readonly<{ readonly "$": "OpenAIChat" }> | Readonly<{ readonly "$": "OpenAIResponses" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Vertex" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Qwen" }> | Readonly<{ readonly "$": "Interactions" }> | Readonly<{ readonly "$": "Antigravity" }> | Readonly<{ readonly "$": "Kimi" }> | Readonly<{ readonly "$": "Xai" }>) => ReadonlyArray<string> } = { ["keys"]: rp_7468696e6b696e672e706f6c6963792e6b657973 };
export const provenance = {"sourcePath":"src/thinking/policy.rs","sourceSha256":"aa7e338d9caed32d5c9345465bcc2cd86981ce5409ec61d8569007c1721332fc","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":5,"preserved":7,"runtimeParity":false};
