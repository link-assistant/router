// Opaque move-only runtime carrier. Static source eligibility is checked upstream.
declare const literalArgumentsBrand: unique symbol;
export interface LiteralArguments { readonly $: 'ml_LiteralArgumentsCoreStatic'; readonly [literalArgumentsBrand]: true; }
export declare function literal_arguments_empty(): LiteralArguments;
export declare function literal_arguments_literal(value: string): LiteralArguments;
export declare function literal_arguments_piece_count(value: LiteralArguments): bigint;
export declare function literal_arguments_byte_len(value: LiteralArguments): bigint;
export declare function literal_arguments_is_empty(value: LiteralArguments): boolean;
