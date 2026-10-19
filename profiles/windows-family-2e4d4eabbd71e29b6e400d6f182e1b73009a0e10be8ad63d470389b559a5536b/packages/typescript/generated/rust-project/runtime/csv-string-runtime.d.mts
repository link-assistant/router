type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function stringSplitCharacter(value: string, delimiter: string): IterableIterator<string>;
export declare function stringSplitNext(value: IterableIterator<string>): RustOption<string>;
export declare function allocateStringItem(value: string): string;
