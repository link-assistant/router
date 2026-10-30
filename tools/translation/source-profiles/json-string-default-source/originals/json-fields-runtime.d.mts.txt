import type {JsonValue} from './json-macro-runtime.mjs';
type Maybe<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function router_field_json_field(value:JsonValue,key:string): Maybe<JsonValue>;
export declare function router_field_json_index(value:JsonValue,key:bigint): Maybe<JsonValue>;
export declare function router_field_json_str_field(value:JsonValue,key:string): Maybe<string>;
export declare function router_field_json_bool_field(value:JsonValue,key:string): Maybe<boolean>;
export declare function router_field_json_u64_field(value:JsonValue,key:string): Maybe<bigint>;
export declare function router_field_json_i64_field(value:JsonValue,key:string): Maybe<bigint>;
