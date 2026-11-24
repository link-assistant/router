// Adapter DATA is never a source permit. Actual native libraries, runtimes and
// the authoritative whole caller re-enter the original private source checker.
import {posix} from 'node:path';
import {httpDeadlineResultRuntimeSources as ownedStateRuntimeSources} from './http-deadline-result-runtime-sources.mjs';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from './js-to-rust/http-resource-callers.mjs';

import {translateHttpResourceCallerRust as translateOwnedStateRust} from './js-to-rust/http-resource-rust.mjs';
import {projectHttpResourceUnitJavaScript} from './http-resource-unit-signatures.mjs';
export const OWNED_STATE_NATIVE_INPUTS=Object.freeze([
 'src/translation_http_deadline_results_core.rs','src/translation_text_core.rs','src/translation_owned_results_core.rs','src/translation_http_protocol_core.rs','src/translation_http_transport_core.rs','src/translation_http_deadline_core.rs','src/upstream_guard.rs','src/translation_async_control_core.rs','src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/json_collections.rs','src/translation_collections_core.rs','src/translation_state_core.rs','src/translation_carriers_core.rs','Cargo.toml','Cargo.lock',
]);
const fail=message=>{throw new TypeError('Owned state source unit: '+message);};
/** Complete declared runtime closure, including byte-equal physical mirrors. */
export function ownedStateUnitRuntimeSources(unit){
 const javascript=unit.runtimes.JavaScript,typescript=unit.runtimes.TypeScript;if(javascript!==typescript&&(javascript.startsWith(typescript+'/')||typescript.startsWith(javascript+'/')))fail('owned runtime roots must not contain each other');
 const rows=ownedStateRuntimeSources(javascript,typescript),sources=new Map(rows.map(row=>[row.path,row.source]));
 if(javascript!==typescript)for(const row of rows){const root=row.path.startsWith(javascript+'/')?javascript:typescript,other=root===javascript?typescript:javascript;sources.set(other+row.path.slice(root.length),row.source);}
 return [...sources].map(([path,source])=>({path,source}));
}
export function ownedStateUnitContext({unit,current,nativeSources,runtimeSources}={}){
 if(!Array.isArray(nativeSources)||!Array.isArray(runtimeSources))fail('complete current native/runtime sources required');const native=new Map(),runtime=new Map();
 for(const row of nativeSources){if(typeof row.path!=='string'||typeof row.source!=='string'||native.has(row.path))fail('complete unique native source mapping required');native.set(row.path,row.source);}
 if(OWNED_STATE_NATIVE_INPUTS.some(path=>!native.has(path)))fail('every actual native boundary and locked Cargo input required');
 const sourceRoot=posix.dirname(unit.runtimes.JavaScript),typedRoot=posix.dirname(unit.runtimes.TypeScript),suffix=(path,root)=>root==='.'?path:path.startsWith(root+'/')?path.slice(root.length+1):null;
 if(posix.basename(unit.runtimes.JavaScript)!==posix.basename(unit.runtimes.TypeScript)||suffix(unit.paths.JavaScript,sourceRoot)?.replace(/\.mjs$/u,'.ts')!==suffix(unit.paths.TypeScript,typedRoot))fail('mirrored actual JS/TS source/runtime paths required');
 for(const row of runtimeSources){if(typeof row.path!=='string'||typeof row.source!=='string'||runtime.has(row.path))fail('unique complete actual runtime mapping required');runtime.set(row.path,row.source);}
 for(const row of ownedStateUnitRuntimeSources(unit))if(runtime.get(row.path)!==row.source)fail('complete actual runtime mirror differs: '+row.path);
 return {native,runtime,unit,current,sourceAuthority:false,semanticAuthority:false};
}
export function translateOwnedStateUnit({unit,language,current,nativeSources,runtimeSources}={}){
 const context=ownedStateUnitContext({unit,current,nativeSources,runtimeSources}),runtimeRoot=language==='Rust'?unit.runtimes.JavaScript:unit.runtimes[language],sourcePath=language==='Rust'?unit.paths.Rust:unit.paths[language],files=new Map([...context.native,...context.runtime]);
 for(const target of ['Rust','JavaScript','TypeScript'])if(typeof current[target]==='string'){const previous=files.get(unit.paths[target]);if(previous!==undefined&&previous!==current[target])fail('competing native/runtime/application source');files.set(unit.paths[target],current[target]);}
 const options={sourcePath,runtimeRoot,declarationRoot:runtimeRoot,files:[...files].map(([path,source])=>({path,source}))};let result,history=null;
 if(language==='Rust')result=translateOwnedStateRust(current.Rust,{...options,javascriptPath:unit.paths.JavaScript});
 else if(language==='TypeScript')result=translateHttpResourceCallerTypeScript(current.TypeScript,options);
 else if(language==='JavaScript'){
  const proposal=projectHttpResourceUnitJavaScript(current.JavaScript,{unit,current,options});history=proposal.history;const proposed={...options,files:options.files.map(row=>row.path===sourcePath?{path:row.path,source:proposal.source}:row)};result=translateHttpResourceCallerJavaScript(proposal.source,proposed);
 }else fail('one actual source language required');
 return {Rust:language==='Rust'?current.Rust:result.rust,JavaScript:language==='JavaScript'?current.JavaScript:result.javascript,TypeScript:language==='TypeScript'?current.TypeScript:result.typescript,meta:{semanticMeta:result.meta,httpResourceRustSourceHistory:result.httpResourceRustSourceHistory??null,signatureProposalHistory:history,nativeSourceInputs:result.nativeSourceInputs,flowSourceInput:result.flowSourceInput},generatedFrom:language==='Rust'?unit.paths.JavaScript:unit.paths[language],runtimeBefore:runtimeRoot,profile:'router-http-resource-unit-v1',sourceAuthority:false,semanticAuthority:false,nativeRustGrammarChecked:false,runtimeParity:false,rustExecuted:false,receivingExecuted:false};
}

export {OWNED_STATE_NATIVE_INPUTS as OWNED_OUTCOME_NATIVE_INPUTS,ownedStateUnitRuntimeSources as ownedOutcomeUnitRuntimeSources,ownedStateUnitContext as ownedOutcomeUnitContext,translateOwnedStateUnit as translateOwnedOutcomeUnit};

export {OWNED_STATE_NATIVE_INPUTS as OWNED_CANCELLATION_NATIVE_INPUTS,ownedStateUnitRuntimeSources as ownedCancellationUnitRuntimeSources,ownedStateUnitContext as ownedCancellationUnitContext,translateOwnedStateUnit as translateOwnedCancellationUnit};

export {OWNED_STATE_NATIVE_INPUTS as ASYNC_CONTROL_NATIVE_INPUTS,ownedStateUnitRuntimeSources as asyncControlUnitRuntimeSources,ownedStateUnitContext as asyncControlUnitContext,translateOwnedStateUnit as translateAsyncControlUnit};

export {OWNED_STATE_NATIVE_INPUTS as HTTP_RESOURCE_NATIVE_INPUTS,ownedStateUnitRuntimeSources as httpResourceUnitRuntimeSources,ownedStateUnitContext as httpResourceUnitContext,translateOwnedStateUnit as translateHttpResourceUnit};
