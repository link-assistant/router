// Generated draft from rust/src/client_lifecycle/maintenance.rs; sha256=3bcbcaee67d7f3c957baf43dabdd393639ce96250d5afdc112b2492deb1f16bf
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../../../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_e1e2327d5073fd58ed1bd0eef7f685140f0661f551424a77e7a95d35c2996e87 = {"schemaVersion":1,"types":{"rp_636c69656e74732e436c69656e744b696e64":{"kind":"data","name":"rp_636c69656e74732e436c69656e744b696e64","ctors":[{"name":"Codex","fields":[]},{"name":"ClaudeCode","fields":[]},{"name":"Cursor","fields":[]},{"name":"GeminiCli","fields":[]},{"name":"GrokCli","fields":[]},{"name":"Opencode","fields":[]},{"name":"QwenCode","fields":[]},{"name":"Agent","fields":[]}]}}};

const ml_host_value_refinements_e1e2327d5073fd58ed1bd0eef7f685140f0661f551424a77e7a95d35c2996e87 = new Map([]);

function rp_636c69656e745f6c6966656379636c652e6d61696e74656e616e63652e7061636b616765(client) {
  ml_validate_rust_value(client, {"kind":"data","name":"rp_636c69656e74732e436c69656e744b696e64"}, ml_host_value_schema_e1e2327d5073fd58ed1bd0eef7f685140f0661f551424a77e7a95d35c2996e87, { refinements: ml_host_value_refinements_e1e2327d5073fd58ed1bd0eef7f685140f0661f551424a77e7a95d35c2996e87 });
  switch (client.$) {
    case "Codex": {
      return Object.freeze({ $: 'Some', field0: "@openai/codex" });
    }
    case "ClaudeCode": {
      return Object.freeze({ $: 'Some', field0: "@anthropic-ai/claude-code" });
    }
    case "Cursor": {
      return Object.freeze({ $: 'None' });
    }
    case "GeminiCli": {
      return Object.freeze({ $: 'Some', field0: "@google/gemini-cli" });
    }
    case "GrokCli": {
      return Object.freeze({ $: 'None' });
    }
    case "Opencode": {
      return Object.freeze({ $: 'Some', field0: "opencode-ai" });
    }
    case "QwenCode": {
      return Object.freeze({ $: 'Some', field0: "@qwen-code/qwen-code" });
    }
    case "Agent": {
      return Object.freeze({ $: 'None' });
    }
    default: {
      return ml_router_unexpected(client);
    }
  }
}

export const translated = { ["package"]: rp_636c69656e745f6c6966656379636c652e6d61696e74656e616e63652e7061636b616765 };
export const provenance = {"sourcePath":"rust/src/client_lifecycle/maintenance.rs","sourceSha256":"3bcbcaee67d7f3c957baf43dabdd393639ce96250d5afdc112b2492deb1f16bf","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":18,"preserved":20,"runtimeParity":false};
