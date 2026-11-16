import type {JsonValue} from './json-macro-runtime.mjs';
export declare function router_core_json_copy(value: JsonValue): JsonValue;
export declare function router_core_json_with_field(base: JsonValue,key: string,value: JsonValue): JsonValue;
export declare function router_core_json_index_str(value: JsonValue,key: string): JsonValue;
export declare function router_core_json_index_usize(value: JsonValue,index: bigint): JsonValue;
export declare function router_core_json_map_index(value: Extract<JsonValue,{readonly $:'Object'}>['field0'],key: string): JsonValue;
type MaybeJson=Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>;
export declare function router_core_json_parse(value:string):MaybeJson;
export declare function router_core_json_parse_bytes(value:readonly bigint[]):MaybeJson;

export declare function router_vector_json_copy(value: JsonValue): JsonValue;
export declare function router_vector_json_validate(value: JsonValue): void;
export declare function router_vector_json_with_field(base: JsonValue,key: string,value: JsonValue): JsonValue;
