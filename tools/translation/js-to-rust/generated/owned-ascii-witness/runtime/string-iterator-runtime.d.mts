type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function stringLines(value: string): IterableIterator<string>;
export declare function stringWhitespace(value: string): IterableIterator<string>;
export declare function stringNext(value: IterableIterator<string>): RustOption<string>;
export declare function stringJoin(values: readonly string[], separator: string): string;
export declare function router_core_unicode_scalar_count(value: string): bigint;
export declare function router_core_ascii_chars_in(value: string, alphabet: string): boolean;
