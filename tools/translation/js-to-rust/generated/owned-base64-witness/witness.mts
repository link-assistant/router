import type {JsonValue} from "./runtime/json-macro-runtime.mjs";
import type {Base64Error,Base64Result} from "./runtime/base64-runtime.mjs";
import { router_core_base64_standard_encode_bytes as __ro_router_core_base64_standard_encode_bytes, router_core_base64_standard_encode_text as __ro_router_core_base64_standard_encode_text, router_core_base64_standard_encode_owned_bytes as __ro_router_core_base64_standard_encode_owned_bytes, router_core_base64_standard_no_pad_encode_text as __ro_router_core_base64_standard_no_pad_encode_text, router_core_base64_url_no_pad_encode_bytes as __ro_router_core_base64_url_no_pad_encode_bytes, router_core_base64_url_no_pad_encode_owned_bytes as __ro_router_core_base64_url_no_pad_encode_owned_bytes, router_core_base64_url_no_pad_encode_owned_text as __ro_router_core_base64_url_no_pad_encode_owned_text, router_core_base64_url_no_pad_encode_array32 as __ro_router_core_base64_url_no_pad_encode_array32, router_core_base64_standard_decode_text as __ro_router_core_base64_standard_decode_text, router_core_base64_standard_decode_owned_text as __ro_router_core_base64_standard_decode_owned_text, router_core_base64_standard_no_pad_decode_text as __ro_router_core_base64_standard_no_pad_decode_text, router_core_base64_url_no_pad_decode_text as __ro_router_core_base64_url_no_pad_decode_text, router_core_base64_url_no_pad_decode_owned_text as __ro_router_core_base64_url_no_pad_decode_owned_text, base64ErrorText as __ro_base64ErrorText } from "./runtime/base64-runtime.mjs";

export function standard_encode_bytes(value: readonly bigint[]): string {
    return __ro_router_core_base64_standard_encode_bytes(value);
}

export function standard_encode_text(value: string): string {
    return __ro_router_core_base64_standard_encode_text(value);
}

export function standard_encode_owned_bytes(value: readonly bigint[]): string {
    return __ro_router_core_base64_standard_encode_owned_bytes(value);
}

export function standard_no_pad_encode_text(value: string): string {
    return __ro_router_core_base64_standard_no_pad_encode_text(value);
}

export function url_no_pad_encode_bytes(value: readonly bigint[]): string {
    return __ro_router_core_base64_url_no_pad_encode_bytes(value);
}

export function url_no_pad_encode_owned_bytes(value: readonly bigint[]): string {
    return __ro_router_core_base64_url_no_pad_encode_owned_bytes(value);
}

export function url_no_pad_encode_owned_text(value: string): string {
    return __ro_router_core_base64_url_no_pad_encode_owned_text(value);
}

export function url_no_pad_encode_array32(value: readonly bigint[]): string {
    return __ro_router_core_base64_url_no_pad_encode_array32(value);
}

export function standard_decode_text(value: string): Base64Result {
    return __ro_router_core_base64_standard_decode_text(value);
}

export function standard_decode_owned_text(value: string): Base64Result {
    return __ro_router_core_base64_standard_decode_owned_text(value);
}

export function standard_no_pad_decode_text(value: string): Base64Result {
    return __ro_router_core_base64_standard_no_pad_decode_text(value);
}

export function url_no_pad_decode_text(value: string): Base64Result {
    return __ro_router_core_base64_url_no_pad_decode_text(value);
}

export function url_no_pad_decode_owned_text(value: string): Base64Result {
    return __ro_router_core_base64_url_no_pad_decode_owned_text(value);
}

export function error_text(error: Base64Error): string {
    return __ro_base64ErrorText(error);
}
