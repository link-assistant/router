// Fresh variadic argument carriers compose the existing bounded paired core.
import { router_vec_bool_from_slice as copied_bool, router_vec_u8_from_slice as copied_u8, router_vec_i8_from_slice as copied_i8, router_vec_u16_from_slice as copied_u16, router_vec_i16_from_slice as copied_i16, router_vec_u32_from_slice as copied_u32, router_vec_i32_from_slice as copied_i32, router_vec_u64_from_slice as copied_u64, router_vec_i64_from_slice as copied_i64, router_vec_u128_from_slice as copied_u128, router_vec_i128_from_slice as copied_i128 } from './primitive-owned-vector-runtime.mjs';
const freeze=Object.freeze;
export function router_vec_bool_literal(...values){return copied_bool(freeze(values));}
export function router_vec_u8_literal(...values){return copied_u8(freeze(values));}
export function router_vec_i8_literal(...values){return copied_i8(freeze(values));}
export function router_vec_u16_literal(...values){return copied_u16(freeze(values));}
export function router_vec_i16_literal(...values){return copied_i16(freeze(values));}
export function router_vec_u32_literal(...values){return copied_u32(freeze(values));}
export function router_vec_i32_literal(...values){return copied_i32(freeze(values));}
export function router_vec_u64_literal(...values){return copied_u64(freeze(values));}
export function router_vec_i64_literal(...values){return copied_i64(freeze(values));}
export function router_vec_u128_literal(...values){return copied_u128(freeze(values));}
export function router_vec_i128_literal(...values){return copied_i128(freeze(values));}
