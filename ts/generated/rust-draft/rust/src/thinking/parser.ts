type MLData_72705f353236663735373436353732346637303734363936663665356633333566373533333332 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373235323635373337353663373435663333356637353333333235663334333635663665363136643635363435663337333333373334333633343566333636353337333533363634356633353330333633313337333233373333333633353334333933363635333733343334333533373332333733323336363633373332 = Readonly<{ readonly "$": "Ok"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_72705f373337343634326536653735366432653530363137323733363534393665373434353732373236663732 }>;
type MLData_72705f37333734363432653665373536643265343936653734343537323732366637323462363936653634 = Readonly<{ readonly "$": "Empty" }> | Readonly<{ readonly "$": "InvalidDigit" }> | Readonly<{ readonly "$": "PosOverflow" }> | Readonly<{ readonly "$": "NegOverflow" }> | Readonly<{ readonly "$": "Zero" }>;
type MLData_72705f373337343634326536653735366432653530363137323733363534393665373434353732373236663732 = Readonly<{ readonly "$": "ParseIntError"; readonly "kind": MLData_72705f37333734363432653665373536643265343936653734343537323732366637323462363936653634 }>;
// Generated draft from rust/src/thinking/parser.rs; sha256=7107cb1dab7a488d7abcb10fb8eb1de6888978d4faefdaaac0d573aed5e827c4
// Carried constructs are data, never runtime parity evidence.
import { createIntegerRuntime as ml_create_integer_runtime } from "../../../runtime/integer-runtime.mjs";

import { stringBytes as ml_string_bytes } from "../../../runtime/string-bytes-runtime.mjs";

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function ml_router_all<T>(values: Iterable<T>, predicate: (value: T) => boolean) { for (const value of values) if (!predicate(value)) return false; return true; }

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

const ml_host_rust_integer_parse_u32 = ml_create_integer_runtime({"kind":"fixed","bits":32,"signed":false}).rust_integer_parse;

function rp_7468696e6b696e672e7061727365722e70617273655f6e756d657269635f737566666978(raw: string): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> {
  if (!(typeof raw === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(raw))) throw new TypeError('argument outside supported Rust value domain');
  if ((() => {
    const ml_standard_callback_self_3 = (() => {
      const ml_text_1 = raw;
      const ml_text_2 = "-";
      return (ml_text_1.startsWith(ml_text_2)?Object.freeze({ $: 'Some', field0: ml_text_1.slice(ml_text_2.length) }):Object.freeze({ $: 'None' }));
    })() as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
    switch (ml_standard_callback_self_3.$) {
      case "None": {
        return false;
      }
      case "Some": {
        const ml_standard_pattern_4 = ml_standard_callback_self_3.field0;
        const ml_standard_callback_arg_5 = ml_standard_pattern_4;
        const digits = ml_standard_callback_arg_5;
        return (!(digits.length === 0) && ml_router_all(ml_string_bytes(digits), (digit) => { return (digit === 48n); }));
      }
      default: {
        return ml_router_unexpected(ml_standard_callback_self_3);
      }
    }
  })()) {
    return Object.freeze({ $: 'Some', field0: 0n });
  } else {
    return ml_host_result_ok(ml_host_rust_integer_parse_u32(raw));
  }
}

export const translated: { "parse_numeric_suffix": (raw: string) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }> } = { ["parse_numeric_suffix"]: rp_7468696e6b696e672e7061727365722e70617273655f6e756d657269635f737566666978 };
export const provenance = {"sourcePath":"rust/src/thinking/parser.rs","sourceSha256":"7107cb1dab7a488d7abcb10fb8eb1de6888978d4faefdaaac0d573aed5e827c4","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":6,"preserved":7,"runtimeParity":false};
