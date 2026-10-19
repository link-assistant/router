type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
// Generated draft from rust/src/provider_import.rs; sha256=20277b79472978275b615a15b0b8dd99f785cc18a1030337d9f11889d9d045b6
// Carried constructs are data, never runtime parity evidence.
function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

function rp_70726f7669646572732e70726f76696465725f696d706f72742e756e71756f7465(value: string): string {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_standard_body_5 = ml_host_option_bind((() => {
      const ml_text_1 = value;
      const ml_text_2 = "\"";
      return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })(), (v) => { const ml_text_3 = v;
    const ml_text_4 = "\"";
    return (ml_text_3.endsWith(ml_text_4)?Object.freeze({ $: 'Some', field0: ml_text_3.slice(0,ml_text_3.length-ml_text_4.length) }):Object.freeze({ $: 'None' })); }, "and_then") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
    const ml_standard_body_6 = value;
    switch (ml_standard_body_5.$) {
      case "None": {
        return ml_standard_body_6;
      }
      case "Some": {
        const x = ml_standard_body_5.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_5);
      }
    }
  })();
}

export const translated: { "unquote": (value: string) => string } = { ["unquote"]: rp_70726f7669646572732e70726f76696465725f696d706f72742e756e71756f7465 };
export const provenance = {"sourcePath":"rust/src/provider_import.rs","sourceSha256":"20277b79472978275b615a15b0b8dd99f785cc18a1030337d9f11889d9d045b6","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":7,"runtimeParity":false};
