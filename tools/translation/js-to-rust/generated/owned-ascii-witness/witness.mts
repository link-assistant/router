import type {JsonValue} from "./runtime/json-macro-runtime.mjs";
import { router_core_ascii_chars_in as __ro_router_core_ascii_chars_in } from "./runtime/string-iterator-runtime.mjs";

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
