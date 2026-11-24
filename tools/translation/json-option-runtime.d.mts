import type {JsonValue} from './json-macro-runtime.mjs';
/** Structural spelling grants no validity: the actual operation checks the
 * complete carrier and immutable canonical Json before it reads a payload. */
export declare function router_core_json_option_as_str(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):Readonly<{$:'None'}>|Readonly<{$:'Some';field0:string}>;

import type {serde_json_value_as_bool,serde_json_value_as_u64,serde_json_value_as_i64,serde_json_value_as_f64,serde_json_value_as_null,serde_json_value_as_number,serde_json_value_as_array,serde_json_value_as_object} from './json-runtime.mjs';
export declare function router_core_json_option_as_bool(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_bool>;
export declare function router_core_json_option_as_u64(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_u64>;
export declare function router_core_json_option_as_i64(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_i64>;
export declare function router_core_json_option_as_f64(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_f64>;
export declare function router_core_json_option_as_null(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_null>;
export declare function router_core_json_option_as_number(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_number>;
export declare function router_core_json_option_as_array(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_array>;
export declare function router_core_json_option_as_object(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):ReturnType<typeof serde_json_value_as_object>;
