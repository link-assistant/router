declare const orderedTextMap: unique symbol;
/** Opaque owned ABI. This brand is not a native type or ownership proof. */
export type OrderedTextMap = Readonly<{[orderedTextMap]: true; $: 'OrderedTextMap'; entries: readonly (readonly [string, string])[]}>;
export type BorrowedTextOption = Readonly<{$: 'None'}> | Readonly<{$: 'Some'; field0: string}>;
export declare function router_text_map_new(): OrderedTextMap;
export declare function router_text_map_from_pairs(argument0: readonly (readonly [string, string])[]): OrderedTextMap;
export declare function router_text_map_insert(argument0: OrderedTextMap, argument1: string, argument2: string): OrderedTextMap;
export declare function router_text_map_remove(argument0: OrderedTextMap, argument1: string): OrderedTextMap;
/** Source lowering must tie the Some payload loan to map, never to key. */
export declare function router_text_map_get(argument0: OrderedTextMap, argument1: string): BorrowedTextOption;
export declare function router_text_map_contains(argument0: OrderedTextMap, argument1: string): boolean;
export declare function router_text_map_len(argument0: OrderedTextMap): bigint;
export declare function router_text_map_copy(argument0: OrderedTextMap): OrderedTextMap;
export declare function router_text_map_pairs(argument0: OrderedTextMap): readonly (readonly [string, string])[];
export declare function router_text_map_keys(argument0: OrderedTextMap): readonly string[];
