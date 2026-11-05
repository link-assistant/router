// Shared operation description DATA. Not a type, native owner or caller permit.
export const BORROWED_STANDARD_MAP_LITERAL_PREDICATE=Object.freeze({
 id:'borrowed-standard-map:literal-predicate',javascriptName:'router_borrowed_text_map_matches_literals',
 rustPath:'crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals',
 parameters:Object.freeze(['shared-standard-text-map','shared-str','literal-str-slice']),returns:'bool',
 nativeParameterCount:3,maximumLiteralCount:64,containerEntryLimit:null,valueByteLimit:null,
 evaluationOrder:'map-then-key-then-literals-left-to-right-once',returnedLoan:false,
 nativeInternalsUntranslated:true,runtimeModule:'borrowed-standard-map-20261102-runtime.mjs',
 declarationModule:'borrowed-standard-map-20261102-runtime.d.mts',
 sourceAuthority:false,semanticAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false,
});
export const BORROWED_STANDARD_MAP_RULE_SEQUENCES=Object.freeze([
 Object.freeze({phase:'language',rules:Object.freeze(['actual-shared-standard-map-and-string-owner','pure-bounded-literal-slice','bool-result-with-no-returned-loan','left-to-right-once'])}),
 Object.freeze({phase:'repository',rules:Object.freeze(['actual-qualified-native-helper-binding','fixed-runtime-and-strict-declaration-imports','whole-source-CST-and-checked-meta-reissue'])}),
]);
