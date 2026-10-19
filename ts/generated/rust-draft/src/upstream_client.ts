type MLData_72705f353236663735373436353732346637303734363936663665356633333338356636653631366436353634356633373333333733343336333435663337333433363339333636343336333535663334333433373335333733323336333133373334333633393336363633363635 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633333566373533363334 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f35323666373537343635373235323635373337353663373435663333356637353336333435663334333635663665363136643635363435663337333333373334333633343566333636353337333533363634356633353330333633313337333233373333333633353334333933363635333733343334333533373332333733323336363633373332 = Readonly<{ readonly "$": "Ok"; readonly "field0": bigint }> | Readonly<{ readonly "$": "Err"; readonly "field0": MLData_72705f373337343634326536653735366432653530363137323733363534393665373434353732373236663732 }>;
type MLData_72705f37333734363432653665373536643265343936653734343537323732366637323462363936653634 = Readonly<{ readonly "$": "Empty" }> | Readonly<{ readonly "$": "InvalidDigit" }> | Readonly<{ readonly "$": "PosOverflow" }> | Readonly<{ readonly "$": "NegOverflow" }> | Readonly<{ readonly "$": "Zero" }>;
type MLData_72705f373337343634326536653735366432653530363137323733363534393665373434353732373236663732 = Readonly<{ readonly "$": "ParseIntError"; readonly "kind": MLData_72705f37333734363432653665373536643265343936653734343537323732366637323462363936653634 }>;
type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/upstream_client.rs; sha256=ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73
// Carried constructs are data, never runtime parity evidence.
import { validateRustValue as ml_validate_rust_value } from "../runtime/type-layout-runtime.mjs";

import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { createIntegerRuntime as ml_create_integer_runtime } from "../runtime/integer-runtime.mjs";

function ml_fixed(value: bigint, min: bigint, max: bigint, message: string) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

const ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = {"schemaVersion":1,"types":{"rp_526f757465724f7074696f6e5f365f737472696e67":{"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67","ctors":[{"name":"None","fields":[]},{"name":"Some","fields":[{"name":"field0","type":{"kind":"string"}}]}]}}};

const ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 = new Map([]);

function ml_host_bool_then_some<T>(value: boolean, argument: T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }

function ml_host_bool_then<T>(value: boolean, callback: () => T): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok<T>(value: Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}> { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, callback: (value: T) => U): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}> { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or<T, U>(value: Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>, defaultValue: U, callback: (value: T) => U): U { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;
function ml_host_option_bind(value: { $: string; field0?: any }, operation: (...values: any[]) => any, mode: string) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }

const ml_host_rust_integer_parse_u64 = ml_create_integer_runtime({"kind":"fixed","bits":64,"signed":false}).rust_integer_parse;

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353(): bigint {
  return 120n;
}

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f434f4e4e4543545f54494d454f55545f53454353(): bigint {
  return 10n;
}

function rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f46495253545f425954455f54494d454f55545f53454353(): bigint {
  return rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353();
}

function rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>, default_: bigint): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> }> {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  if (typeof default_ !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');
  ml_fixed(default_, 0n, 18446744073709551615n, "u64 argument default_ out of range");
  if (!(typeof default_ === 'bigint' && default_ >= 0n && default_ <= 18446744073709551615n)) throw new TypeError('argument outside supported Rust value domain');
  const seconds = (() => {
    const ml_standard_body_1 = ml_host_option_bind(value, (value_2) => { return ml_host_result_ok(ml_host_rust_integer_parse_u64((value_2).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, ''))); }, "and_then") as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": bigint }>;
    const ml_standard_body_2 = default_;
    switch (ml_standard_body_1.$) {
      case "None": {
        return ml_standard_body_2;
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })();
  return ml_host_bool_then((seconds > 0n), () => { return ml_host_std_time_duration_from_secs(seconds); });
}

function rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574(value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>): Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> }> {
  ml_validate_rust_value(value, {"kind":"data","name":"rp_526f757465724f7074696f6e5f365f737472696e67"}, ml_host_value_schema_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0, { refinements: ml_host_value_refinements_0d401b33cd6c621a6940d2ce41455df809addfafd24d55809a2c1e9d0d6391a0 });
  return rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373(value, rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353());
}

export const translated: { "DEFAULT_UPSTREAM_READ_TIMEOUT_SECS": bigint; "DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS": bigint; "DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS": bigint; "parse_timeout_secs": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>, arg1: bigint) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> }>; "parse_upstream_read_timeout": (value: Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>) => Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> }> } = { ["DEFAULT_UPSTREAM_READ_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f524541445f54494d454f55545f53454353(), ["DEFAULT_UPSTREAM_CONNECT_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f434f4e4e4543545f54494d454f55545f53454353(), ["DEFAULT_UPSTREAM_FIRST_BYTE_TIMEOUT_SECS"]: rp_757073747265616d5f636c69656e742e44454641554c545f555053545245414d5f46495253545f425954455f54494d454f55545f53454353(), ["parse_timeout_secs"]: rp_757073747265616d5f636c69656e742e70617273655f74696d656f75745f73656373, ["parse_upstream_read_timeout"]: rp_757073747265616d5f636c69656e742e70617273655f757073747265616d5f726561645f74696d656f7574 };
export const provenance = {"sourcePath":"src/upstream_client.rs","sourceSha256":"ef45ff192c7fe3750f641a3e8ecb530518b482ca649676748d233703bf91cc73","executable":5,"executableFunctions":2,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":24,"preserved":30,"runtimeParity":false};
