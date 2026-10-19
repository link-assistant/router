type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function reverseFindCharacterSplit(value: string, delimiter: string, maps: ReadonlyArray<(value:string)=>string>, predicate:(value:string)=>boolean): RustOption<string>;
