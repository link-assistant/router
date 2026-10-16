// Lossless source transport only. Existing native grammar and semantic issuers
// independently decide admission after this serialized/reparsed CST boundary.
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,parseConcreteSyntaxMeta,reconstructConcreteSyntax,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from '../original-json-intrinsics.mjs';
const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())throwOriginalCapturedTypeError('Reverse concrete source host operations changed');}
function language(value){if(value!=='JavaScript'&&value!=='TypeScript')throwOriginalCapturedTypeError('Reverse concrete source requires JavaScript or TypeScript');return value;}

/** Consume a canonical concrete document; its status grants no grammar facts. */
export function parseReverseConcreteSource(text){
 guard();const parsed=parseConcreteSyntaxMeta(text);guard();language(parsed.language);
 // These fixed, explicitly separate source-rule sequences are identity rules.
 // Public callers cannot inject a callback, an owner claim or a skip marker.
 const applied=applyConcreteSyntaxSubstitutions(parsed,{languageRules:[],repositoryRules:[]});guard();
 const meta=serializeConcreteSyntaxMeta(applied.value),document=parseConcreteSyntaxMeta(meta);guard();
 const source=reconstructConcreteSyntax(document);guard();
 return {source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace:applied.trace}};
}

/** The ordinary entry must reconstruct every original UTF16 code unit. */
export function prepareReverseConcreteSource(source,sourceLanguage='JavaScript'){
 guard();language(sourceLanguage);const document=createConcreteSyntaxMeta(source,{language:sourceLanguage});guard();
 const stage=parseReverseConcreteSource(serializeConcreteSyntaxMeta(document));guard();
 if(stage.source!==source)throwOriginalCapturedTypeError('Reverse concrete source reconstruction differs');
 return stage;
}
