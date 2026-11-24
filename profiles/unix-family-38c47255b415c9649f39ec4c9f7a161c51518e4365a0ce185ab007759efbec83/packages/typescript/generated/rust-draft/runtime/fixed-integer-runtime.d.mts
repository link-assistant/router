type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;
export declare function createFixedIntegerRuntime(type: Readonly<{kind:'fixed';bits:8|16|32|64|128;signed:boolean}>): Readonly<{
rust_fixed_checked_add(left:bigint,right:bigint): RustOption<bigint>;
rust_fixed_checked_sub(left:bigint,right:bigint): RustOption<bigint>;
rust_fixed_checked_mul(left:bigint,right:bigint): RustOption<bigint>;
rust_fixed_wrapping_add(left:bigint,right:bigint): bigint;
rust_fixed_wrapping_sub(left:bigint,right:bigint): bigint;
rust_fixed_saturating_add(left:bigint,right:bigint): bigint;
rust_fixed_saturating_sub(left:bigint,right:bigint): bigint;
rust_fixed_saturating_mul(left:bigint,right:bigint): bigint;
rust_fixed_min(left:bigint,right:bigint): bigint;
rust_fixed_max(left:bigint,right:bigint): bigint;
rust_fixed_clamp(left:bigint,right:bigint,upper:bigint): bigint;
}>;
