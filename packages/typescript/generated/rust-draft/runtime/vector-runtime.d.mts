type RustOption<T> = Readonly<{ $: 'None' }> | Readonly<{ $: 'Some'; field0: T }>;
export declare function createVectorRuntime(validate: (value: unknown) => true): Readonly<{
  rust_vec_get<T>(value: readonly T[], index: bigint): RustOption<T>;
  rust_vec_first<T>(value: readonly T[]): RustOption<T>;
  rust_vec_last<T>(value: readonly T[]): RustOption<T>;
}>;
