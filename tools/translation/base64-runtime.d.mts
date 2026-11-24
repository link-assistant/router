export type Base64Error =
 | Readonly<{$:'InvalidByte';field0:bigint;field1:bigint}>
 | Readonly<{$:'InvalidLength';field0:bigint}>
 | Readonly<{$:'InvalidLastSymbol';offset:bigint;symbol:bigint;symbol_value:bigint}>
 | Readonly<{$:'InvalidPadding'}>;
export type Base64Result = Readonly<{$:'Ok';field0:readonly bigint[]}>|Readonly<{$:'Err';field0:Base64Error}>;
export declare function router_core_base64_standard_encode_bytes(value:readonly bigint[]):string;
export declare function router_core_base64_standard_encode_text(value:string):string;
export declare function router_core_base64_standard_encode_owned_bytes(value:readonly bigint[]):string;
export declare function router_core_base64_standard_no_pad_encode_text(value:string):string;
export declare function router_core_base64_url_no_pad_encode_bytes(value:readonly bigint[]):string;
export declare function router_core_base64_url_no_pad_encode_owned_bytes(value:readonly bigint[]):string;
export declare function router_core_base64_url_no_pad_encode_owned_text(value:string):string;
export declare function router_core_base64_url_no_pad_encode_array32(value:readonly bigint[]):string;
export declare function router_core_base64_standard_decode_text(value:string):Base64Result;
export declare function router_core_base64_standard_decode_owned_text(value:string):Base64Result;
export declare function router_core_base64_standard_no_pad_decode_text(value:string):Base64Result;
export declare function router_core_base64_url_no_pad_decode_text(value:string):Base64Result;
export declare function router_core_base64_url_no_pad_decode_owned_text(value:string):Base64Result;
/** Native Display and Debug have the same text; no arbitrary formatter dispatch. */
export declare function base64ErrorText(value:Base64Error):string;

/** Snapshot and validate the explicit public owned Base64 Result input ABI. */
export declare function base64ResultInput(value:unknown):Base64Result;
