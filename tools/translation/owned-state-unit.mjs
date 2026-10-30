// Adapter DATA is never a source permit. Actual native libraries, runtimes and
// the authoritative whole caller re-enter the original private source checker.
import {posix} from 'node:path';
import {createOwnedStateContext,ownedStateRuntimeSources,translateOwnedStateJavaScript,translateOwnedStateTypeScript} from './js-to-rust/owned-state.mjs';
import {ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './js-to-rust/owned-state-source.mjs';
import {translateOwnedStateRust} from './js-to-rust/owned-rust.mjs';
import {projectOwnedStateUnitJavaScript} from './js-to-rust/owned-state-unit-inputs.mjs';
export const OWNED_STATE_NATIVE_INPUTS=Object.freeze([
 'src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/json_collections.rs','src/translation_collections_core.rs','src/translation_state_core.rs','Cargo.toml','Cargo.lock',
]);
const fail=message=>{throw new TypeError('Owned state source unit: '+message);};
/** Complete declared runtime closure, including byte-equal physical mirrors. */
export function ownedStateUnitRuntimeSources(unit){
 const javascript=unit.runtimes.JavaScript,typescript=unit.runtimes.TypeScript;if(javascript!==typescript&&(javascript.startsWith(typescript+'/')||typescript.startsWith(javascript+'/')))fail('owned runtime roots must not contain each other');
 const rows=appendSourceUnitPrimitiveRuntimeSources(unit,ownedStateRuntimeSources(javascript,typescript)),sources=new Map(rows.map(row=>[row.path,row.source]));
 if(javascript!==typescript)for(const row of rows){const root=row.path.startsWith(javascript+'/')?javascript:typescript,other=root===javascript?typescript:javascript;sources.set(other+row.path.slice(root.length),row.source);}
 return [...sources].map(([path,source])=>({path,source}));
}
export function ownedStateUnitContext({unit,current,nativeSources,runtimeSources}={}){
 if(!Array.isArray(nativeSources)||!Array.isArray(runtimeSources))fail('complete current native/runtime source arrays required');
 const names=new Set(nativeSources.map(row=>row.path));if(OWNED_STATE_NATIVE_INPUTS.some(path=>!names.has(path)))fail('every actual native boundary and locked dependency input is required');
 const sourceRoot=posix.dirname(unit.runtimes.JavaScript),typedRoot=posix.dirname(unit.runtimes.TypeScript),suffix=(path,root)=>root==='.'?path:path.startsWith(root+'/')?path.slice(root.length+1):null;
 if(posix.basename(unit.runtimes.JavaScript)!==posix.basename(unit.runtimes.TypeScript)||suffix(unit.paths.JavaScript,sourceRoot)?.replace(/\.mjs$/u,'.ts')!==suffix(unit.paths.TypeScript,typedRoot))fail('owned state currently requires mirrored JS/TS source and runtime paths');
 const actual=new Map(runtimeSources.map(row=>[row.path,row.source]));for(const row of ownedStateUnitRuntimeSources(unit))if(actual.get(row.path)!==row.source)fail('complete actual current runtime mirror differs: '+row.path);
 const files=[...nativeSources,...runtimeSources];for(const language of ['Rust','JavaScript','TypeScript'])if(current[language]!==null)files.push({path:unit.paths[language],source:current[language]});
 return createOwnedStateContext({runtimeRoot:unit.runtimes.JavaScript,declarationRoot:unit.runtimes.TypeScript,files,...(sourceUnitPrimitiveOperators(unit)?{primitiveOperators:true}:{})});
}
export function translateOwnedStateUnit({unit,language,current,nativeSources,runtimeSources}={}){
 const context=ownedStateUnitContext({unit,current,nativeSources,runtimeSources}),options={context,sourcePath:unit.paths[language],...(sourceUnitPrimitiveOperators(unit)?{typescriptOutputPath:unit.paths.TypeScript}:{})};let result,history=null;
 if(language==='Rust')result=translateOwnedStateRust(current.Rust,{...options,javascriptPath:unit.paths.JavaScript});
 else if(language==='TypeScript'){
  const data=ownedCoreSourceData(context),derived=createOwnedStateContext({...data,files:data.files.filter(row=>row.path!==unit.paths.JavaScript)});
  result=translateOwnedStateTypeScript(current.TypeScript,{...options,context:derived});
 }else if(language==='JavaScript'){
  const projected=projectOwnedStateUnitJavaScript(current.JavaScript,{context,sourcePath:unit.paths.JavaScript,pairedTypeScriptPath:unit.paths.TypeScript});history=projected.history;
  // Even an explicitly annotated JS body is checked without stale target code.
  const data=ownedCoreSourceData(projected.context),derived=createOwnedStateContext({...data,files:data.files.filter(row=>row.path!==unit.paths.TypeScript)});
  result=translateOwnedStateJavaScript(projected.source,{...options,context:derived});
 }else fail('one actual source language required');
 requireOwnedCoreSourceCurrent(context);
 return {Rust:language==='Rust'?current.Rust:result.rust,JavaScript:language==='JavaScript'?current.JavaScript:result.javascript,TypeScript:language==='TypeScript'?current.TypeScript:result.typescript,meta:{semanticMeta:result.meta,ownedRustSourceHistory:result.ownedRustSourceHistory??null,signatureProposalHistory:history,typeScriptSourceHistory:result.ownedCollectionTypeScriptHistory??null},...(sourceUnitPrimitiveOperators(unit)?{primitiveOperators:true,targetOrigins:{JavaScript:unit.paths.JavaScript,TypeScript:unit.paths.TypeScript}}:{}),generatedFrom:unit.paths.JavaScript,runtimeBefore:unit.runtimes.JavaScript,profile:'router-owned-json-state-v1',runtimeParity:false,rustExecuted:false};
}

import {sourceUnitPrimitiveOperators,appendSourceUnitPrimitiveRuntimeSources} from './primitive-source-unit-options.mjs';
