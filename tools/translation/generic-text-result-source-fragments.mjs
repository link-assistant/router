// Source rule fragments, not compiler or runtime permission.
export const GENERIC_TEXT_RESULT_RUST_FRAGMENT="\n/// Preserve a complete generic String-error Result without observing its payload.\npub fn text_result_identity<T>(value: Result<T, String>) -> Result<T, String> {\n    value\n}\n";
export const GENERIC_TEXT_RESULT_JAVASCRIPT_FRAGMENT="\n// The complete Result and both payload alternatives remain opaque here.\nexport function router_text_result_identity(value) { return value; }\n";
export const GENERIC_TEXT_RESULT_TYPESCRIPT_FRAGMENT="\nexport type GenericTextResult<T> = Readonly<{$:\"Ok\";field0:T}> | Readonly<{$:\"Err\";field0:string}>;\nexport declare function router_text_result_identity<T>(value:GenericTextResult<T>):GenericTextResult<T>;\n";
export const GENERIC_TEXT_RESULT_SIGNATURE_CONTRACT=Object.freeze({rustName:'text_result_identity',javascriptName:'router_text_result_identity',rustPath:'crate::translation_owned_results_core::text_result_identity',runtimeModule:'owned-result-runtime.mjs',family:'generic-text-result-signature',args:Object.freeze(['generic-text-result']),ret:'generic-text-result',async:false,release:null,signatureOnly:true,sourceAuthority:false,semanticAuthority:false});

export const GENERIC_TEXT_RESULT_LIBRARY_PIN="866bc4ebac4bdb6cbd5f795702a8235c17b1376f2c0c0e59a626361f2f5a93ac";
