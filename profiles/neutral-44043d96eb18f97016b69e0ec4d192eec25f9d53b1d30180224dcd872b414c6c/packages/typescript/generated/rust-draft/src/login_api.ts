type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373234663730373436393666366535663338333235663665363136643635363435663337333333373335333633323337333333363333333733323336333933373330333733343336333933363636333636353566333733343337333933373330333633353337333335663335333333373335333633323337333333363333333733323336333933373330333733343336333933363636333636353335333033373332333636363337333633363339333633343336333533373332 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f373337353632373336333732363937303734363936663665326537343739373036353733326535333735363237333633373236393730373436393666366535303732366637363639363436353732 }>;
type MLData_72705f373337353632373336333732363937303734363936663665326537343739373036353733326535333735363237333633373236393730373436393666366535303732366637363639363436353732 = Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }>;
// Generated draft from src/login_api.rs; sha256=b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

function ml_router_unwrap<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>|Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:unknown}>, fallback: T, option: boolean): T {
  if (option) {
    if (value.$ === 'Some') return value.field0;
  } else if (value.$ === 'Ok') return value.field0;
  return fallback;
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }> }> {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  const ml_s1 = ((ml_router_unwrap(value, "claude", true)).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '')).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
  if ((ml_s1 === "claude")) {
    return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Claude' }) });
  } else {
    if ((ml_s1 === "codex")) {
      return Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Codex' }) });
    } else {
      return Object.freeze({ $: 'None' });
    }
  }
}

export const translated: { "requested_provider": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Claude" }> | Readonly<{ readonly "$": "Codex" }> | Readonly<{ readonly "$": "Gemini" }> | Readonly<{ readonly "$": "Qwen" }> }> } = { ["requested_provider"]: rp_6c6f67696e5f6170692e7265717565737465645f70726f7669646572 };
export const provenance = {"sourcePath":"src/login_api.rs","sourceSha256":"b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":17,"preserved":19,"runtimeParity":false};
