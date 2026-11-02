import type {OrderedTextMap} from './ordered-text-map-20261102-runtime.mjs';
/** Runtime representation only; structural typing issues no Rust ownership. */
export type TextTuple = Readonly<{$:'Tuple';field0:string;field1:string}>;
export declare function router_text_map_from_tuple_pairs(value:readonly TextTuple[]):OrderedTextMap;
export declare function router_text_map_tuple_pairs(value:OrderedTextMap):readonly TextTuple[];
