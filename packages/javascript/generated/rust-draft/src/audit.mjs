// Generated draft from src/audit.rs; sha256=63e6f5520be013d18bca0ad1580f1e437fd869926b854e1bd1d30b98d35d3ff1
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unexpected(value) {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = {"schemaVersion":1,"types":{"rp_6d6574726963732e53757266616365":{"kind":"data","name":"rp_6d6574726963732e53757266616365","ctors":[{"name":"Anthropic","fields":[]},{"name":"OpenAIChat","fields":[]},{"name":"OpenAIResponses","fields":[]}]}}};

const ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 = new Map([]);

function rp_61756469742e737572666163655f6e616d65(surface) {
  ml_validate_rust_value(surface, {"kind":"data","name":"rp_6d6574726963732e53757266616365"}, ml_host_value_schema_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419, { refinements: ml_host_value_refinements_11ae799e50c019543ce4e21830424c35006aa347be7fb6b70ded49cf31a36419 });
  switch (surface.$) {
    case "Anthropic": {
      return "anthropic";
    }
    case "OpenAIChat": {
      return "openai_chat";
    }
    case "OpenAIResponses": {
      return "openai_responses";
    }
    default: {
      return ml_router_unexpected(surface);
    }
  }
}

export const translated = { ["surface_name"]: rp_61756469742e737572666163655f6e616d65 };
export const provenance = {"sourcePath":"src/audit.rs","sourceSha256":"63e6f5520be013d18bca0ad1580f1e437fd869926b854e1bd1d30b98d35d3ff1","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":20,"preserved":22,"runtimeParity":false};
