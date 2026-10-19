import type {JsonValue} from './json-macro-runtime.mjs';
type Maybe<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function router_core_json_map(values:ReadonlyArray<JsonValue>,callback:(value:JsonValue)=>JsonValue):ReadonlyArray<JsonValue>;
export declare function router_core_json_filter_map(values:ReadonlyArray<JsonValue>,callback:(value:JsonValue)=>Maybe<JsonValue>):ReadonlyArray<JsonValue>;
