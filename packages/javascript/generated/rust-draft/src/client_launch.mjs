// Generated draft from src/client_launch.rs; sha256=189a3a84e23c3860d58bf408dec77a1e73b69a15f9688755e7ba6b8d23652f00
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

const ml_host_value_schema_8aa15f1c11a05eb164357bfb2d96eecad4203f3201153e283a7ae3177cbd9023 = {"schemaVersion":1,"types":{"std.ffi.OsString":{"kind":"data","name":"std.ffi.OsString","ctors":[{"name":"OsString","fields":[{"name":"bytes","type":{"kind":"array","element":{"kind":"fixed","bits":8,"signed":false}}}]}]}}};

const ml_host_value_refinements_8aa15f1c11a05eb164357bfb2d96eecad4203f3201153e283a7ae3177cbd9023 = new Map([]);

const ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = {"schemaVersion":1,"types":{"RouterOption_6_string":{"kind":"data","name":"RouterOption_6_string","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 = new Map([]);

function ml_make_Launch_Launch(arguments_, one_shot, note) {
  ml_validate_rust_value(arguments_, {"kind":"array","element":{"kind":"data","name":"std.ffi.OsString"}}, ml_host_value_schema_8aa15f1c11a05eb164357bfb2d96eecad4203f3201153e283a7ae3177cbd9023, { refinements: ml_host_value_refinements_8aa15f1c11a05eb164357bfb2d96eecad4203f3201153e283a7ae3177cbd9023 });
  if (!(typeof one_shot === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  ml_validate_rust_value(note, {"kind":"data","name":"RouterOption_6_string"}, ml_host_value_schema_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52, { refinements: ml_host_value_refinements_5ac5712071749ac1a8e75b837451552936917907b6671722aaec250f96c4cb52 });
  return Object.freeze({ $: "Launch", ["arguments"]: arguments_, ["one_shot"]: one_shot, ["note"]: note });
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

function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e() {
  return "released Claude Code (checked through 2.1.283) has no supported split-auth mechanism: Router inference and /v1/models discovery use only the Router token, while the stored Claude.ai login remains untouched; Claude.ai connectors, Remote Control and /remote-control, /schedule, notification preferences, cloud sessions (--cloud, --environment, --teleport, and ultrareview), remote managed settings, and organization policy are unavailable in this Router-directed process";
}

function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52() {
  return "this Claude.ai operation cannot be routed because released Claude Code (checked through 2.1.283) has no supported split-auth mechanism; run it directly with Claude.ai authentication instead; no Router token was minted and no client was launched";
}

export const translated = { ["Launch"]: ml_make_Launch_Launch, ["CLAUDE_NATIVE_SERVICES_LIMITATION"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e(), ["CLAUDE_NATIVE_SERVICE_REQUEST_ERROR"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52() };
export const provenance = {"sourcePath":"src/client_launch.rs","sourceSha256":"189a3a84e23c3860d58bf408dec77a1e73b69a15f9688755e7ba6b8d23652f00","executable":3,"executableFunctions":0,"executableConstants":2,"executableTypes":1,"executableConstructors":1,"carried":21,"preserved":25,"runtimeParity":false};
