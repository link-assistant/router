import type {JsonValue} from "./runtime/json-macro-runtime.mjs";
import { router_core_ascii_chars_in as __ro_router_core_ascii_chars_in, router_core_unicode_scalar_count as __ro_router_core_unicode_scalar_count } from "./runtime/string-iterator-runtime.mjs";

export function accepted(value: string, alphabet: string): boolean {
    return __ro_router_core_ascii_chars_in(value, alphabet);
}

export function hexadecimal(value: string): boolean {
    const alphabet = "0123456789ABCDEFabcdef";
    return __ro_router_core_ascii_chars_in(value, alphabet);
}

export function lazy(value: string, alphabet: string, yes: boolean): boolean {
    return (yes && __ro_router_core_ascii_chars_in(value, alphabet));
}

export function guard(value: string, alphabet: string): string {
    if (__ro_router_core_ascii_chars_in(value, alphabet)) {
        return value;
    } else {
        return "";
    }
}

export function scalar_length(value: string): bigint {
    return __ro_router_core_unicode_scalar_count(value);
}

export function scalar_limit(value: string): boolean {
    return (__ro_router_core_unicode_scalar_count(value) <= 64n);
}

export function selected_count(value: string, yes: boolean): bigint {
    return (yes ? __ro_router_core_unicode_scalar_count(value) : 0n);
}
