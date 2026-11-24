import type {JsonValue} from './json-macro-runtime.mjs';
type Maybe<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
type Predicate = (value:JsonValue)=>boolean;
export declare function router_core_json_filter(values:readonly JsonValue[],callback:Predicate): readonly JsonValue[];
export declare function router_core_json_any(values:readonly JsonValue[],callback:Predicate): boolean;
export declare function router_core_json_all(values:readonly JsonValue[],callback:Predicate): boolean;
export declare function router_core_json_find(values:readonly JsonValue[],callback:Predicate): Maybe<JsonValue>;
export declare function router_core_json_fold(values:readonly JsonValue[],initial:JsonValue,callback:(accumulator:JsonValue,value:JsonValue)=>JsonValue): JsonValue;
