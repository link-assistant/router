import type {JsonValue} from './json-macro-runtime.mjs';
/** Structural spelling grants no validity: the actual operation checks the
 * complete carrier and immutable canonical Json before it reads a payload. */
export declare function router_core_json_option_as_str(value:Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>):Readonly<{$:'None'}>|Readonly<{$:'Some';field0:string}>;
