type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function optionStringAsDeref(value: RustOption<string>): RustOption<string>;
