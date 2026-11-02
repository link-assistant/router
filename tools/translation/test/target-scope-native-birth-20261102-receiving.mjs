// Fresh child receiving case SOURCE only. Never import a caller compiler/AST.
import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const root=resolve(process.argv[2]),mode=process.argv[3];
process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=resolve(process.argv[4]);
const loader=await import(pathToFileURL(join(root,'tools/translation/js-to-rust/vendor/module-syntax.mjs')).href);
const {collectDraftScopeTargetObservations:collect}=await import(pathToFileURL(join(root,'tools/translation/draft-scope-20261102-target-collector.mjs')).href);
const ts=loader.ownershipCompiler();
const source='export function outer(value) { const nested = x => x; return nested(value); }\n',bytes=Buffer.byteLength(source),blob=createHash('sha1').update('blob '+bytes+'\0').update(source).digest('hex');
const files=[{source,origin:{revision:'a'.repeat(40),path:'js/src/native-birth-case.mjs',blob,mode:'100644',bytes}}];
assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent(ts),true);
if(mode==='baseline'){
 const {requireTranslationProvenanceBytes}=await import(pathToFileURL(join(root,'tools/translation/translation-provenance-20261102.mjs')).href);const declared=JSON.parse(readFileSync(join(root,'tools/translation/translation-provenance-20261102.json'),'utf8'));const copy=requireTranslationProvenanceBytes(declared,'tools/translation/js-to-rust/vendor/module-syntax.mjs',readFileSync(join(root,'tools/translation/js-to-rust/vendor/module-syntax.mjs')));assert.equal(copy.semanticAuthority,false);
 const result=collect({files});assert.equal(result.nativeExportClosure,'original-private-source-scope-birth');assert.ok(result.observations.some(row=>row.name==='outer'));assert.ok(result.observations.some(row=>row.name==='nested'));assert.equal(result.productionFunctionDenominator,null);assert.equal(result.authority.executable,false);
}else if(mode==='foreign'){
 assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent({...ts}),false);assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent(ts),true);assert.equal(collect({files}).nativeExportClosure,'original-private-source-scope-birth');
}else if(mode==='enum'||mode==='sys'||mode==='factory'){
 const owner=mode==='enum'?ts.SyntaxKind:mode==='factory'?ts.factory:ts.sys,key=mode==='enum'?'FunctionDeclaration':mode==='factory'?'createIdentifier':'readFile',before=Object.getOwnPropertyDescriptor(owner,key);assert.ok(before&&Object.hasOwn(before,'value')&&before.configurable);
 Object.defineProperty(owner,key,{...before,value:mode==='enum'?-123456:()=>undefined});assert.equal(loader.ownershipCompilerRuntimeNativeCurrent(ts),true);assert.throws(()=>collect({files}),/native|compiler|birth|original/);Object.defineProperty(owner,key,before);
 // Restoration cannot revive an observed failed private source-scope frame.
 assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent(ts),false);assert.throws(()=>collect({files}),/native|compiler|birth|original/);
}else if(mode==='subclass'){
 let calls=0;class SourceRows extends Array{*[Symbol.iterator](){calls++;throw Error('custom source iterator must not execute');}}const rows=new SourceRows();rows.push(files[0]);const result=collect({files:rows});assert.equal(calls,0);assert.ok(result.observations.some(row=>row.name==='outer'));
}else if(mode==='accessor'){
 let calls=0;const rows=[];Object.defineProperty(rows,'0',{get(){calls++;throw Error('source row getter must not execute');},enumerable:true});rows.length=1;assert.throws(()=>collect({files:rows}),/own.data/);assert.equal(calls,0);assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent(ts),true);
}else if(mode==='proxy'){
 let calls=0;const rows=new Proxy(files,{get(){calls++;throw Error('source proxy must not execute');},ownKeys(){calls++;throw Error('source proxy must not execute');}});assert.throws(()=>collect({files:rows}),/own.data|ordinary/);assert.equal(calls,0);assert.equal(loader.ownershipCompilerRuntimeSourceScopeCurrent(ts),true);
}else throw TypeError('Unknown independent native birth receiving case');
console.log(JSON.stringify({schema:'target-scope-native-birth-case-20261102-v1',mode,completeCompilerImported:true,originalPrivateBirthJoined:true,semanticAuthority:false,executableAuthority:false,productionFunctionDenominator:null}));
