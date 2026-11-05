import type {RustU64} from './primitive-operator-runtime.mjs';
// Type spelling is DATA. The source checker must prove native linear ownership.
export type OwnedTextVector = readonly string[];
export type OwnedTextVectorOption = Readonly<{$:'None'}> | Readonly<{$:'Some';field0:string}>;
export declare function router_owned_text_vec_new(): OwnedTextVector;
export declare function router_owned_text_vec_from_slice(values: readonly string[]): OwnedTextVector;
export declare function router_owned_text_vec_push(values: OwnedTextVector, value: string): OwnedTextVector;
export declare function router_owned_text_vec_append(left: OwnedTextVector, right: OwnedTextVector): OwnedTextVector;
export declare function router_owned_text_vec_truncate(values: OwnedTextVector, length: RustU64): OwnedTextVector;
export declare function router_owned_text_vec_replace(values: OwnedTextVector, index: RustU64, value: string): OwnedTextVector;
export declare function router_owned_text_vec_len(values: OwnedTextVector): RustU64;
export declare function router_owned_text_vec_get(values: OwnedTextVector, index: RustU64): OwnedTextVectorOption;
