// Independent paired owned String Vec case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import * as vec from '../extensions/owned-text-vector-runtime.mjs';
import {withFreshOwnedTextVectorInputs as fresh} from '../fresh-owned-text-vector-inputs.mjs';
import {ownedTextVectorRuntimeSources as assets} from '../owned-text-vector-runtime-sources.mjs';
import {OWNED_TEXT_VECTOR_CONTRACTS as contracts,OWNED_TEXT_VECTOR_RULE_SEQUENCES as rules} from '../owned-text-vector-contracts.mjs';
import {prepareOwnedTextVectorCoreSources} from '../prepare-owned-text-vector-core-sources.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const limits={timeout:60000},frozen=values=>Object.freeze(values);

test('owned text construction copy append push and replacement preserve ordering Unicode and caller input bytes',limits,()=>{
 const empty=vec.router_owned_text_vec_new();assert.deepEqual(empty,[]);assert.ok(Object.isFrozen(empty));assert.notStrictEqual(empty,vec.router_owned_text_vec_new());
 const original=frozen(['','λ😀','a\u0000b','e\u0301']),copy=vec.router_owned_text_vec_from_slice(original);assert.deepEqual(copy,original);assert.notStrictEqual(copy,original);assert.ok(Object.isFrozen(copy));
 const pushed=vec.router_owned_text_vec_push(copy,'tail');assert.deepEqual(pushed,['','λ😀','a\u0000b','e\u0301','tail']);assert.deepEqual(copy,original);
 assert.deepEqual(vec.router_owned_text_vec_append(pushed,frozen(['end',''])),['','λ😀','a\u0000b','e\u0301','tail','end','']);
 const replaced=vec.router_owned_text_vec_replace(copy,1n,'changed');assert.deepEqual(replaced,['','changed','a\u0000b','e\u0301']);assert.deepEqual(original,['','λ😀','a\u0000b','e\u0301']);
 assert.equal(vec.router_owned_text_vec_len(copy),4n);assert.deepEqual(vec.router_owned_text_vec_get(copy,1n),{$:'Some',field0:'λ😀'});assert.deepEqual(vec.router_owned_text_vec_get(copy,0n),{$:'Some',field0:''});
 const option=vec.router_owned_text_vec_get(copy,1n);assert.ok(Object.isFrozen(option));assert.deepEqual(option,{$:'Some',field0:'λ😀'});assert.deepEqual(vec.router_owned_text_vec_get(copy,18446744073709551615n),{$:'None'});
 assert.deepEqual(vec.router_owned_text_vec_truncate(copy,2n),['','λ😀']);assert.deepEqual(vec.router_owned_text_vec_truncate(copy,0n),[]);assert.strictEqual(vec.router_owned_text_vec_truncate(copy,18446744073709551615n),copy);
});
test('the paired 4096 value bound applies even to lookup and no-op truncation',limits,()=>{
 const maximum=frozen(Array(4096).fill('λ')),one=frozen(['tail']);assert.equal(vec.router_owned_text_vec_len(maximum),4096n);assert.equal(vec.router_owned_text_vec_len(vec.router_owned_text_vec_append(frozen(Array(4095).fill('x')),one)),4096n);
 assert.equal(vec.router_owned_text_vec_len(vec.router_owned_text_vec_push(frozen(Array(4095).fill('x')),'last')),4096n);
 assert.throws(()=>vec.router_owned_text_vec_push(maximum,'overflow'),RangeError);assert.throws(()=>vec.router_owned_text_vec_append(maximum,one),RangeError);
 const oversized=frozen(Array(4097).fill(''));for(const action of [()=>vec.router_owned_text_vec_from_slice(oversized),()=>vec.router_owned_text_vec_len(oversized),()=>vec.router_owned_text_vec_get(oversized,0n),()=>vec.router_owned_text_vec_truncate(oversized,0n),()=>vec.router_owned_text_vec_replace(oversized,0n,'x')])assert.throws(action,RangeError);
 const largeText='λ'.repeat(131072);assert.deepEqual(vec.router_owned_text_vec_get(vec.router_owned_text_vec_from_slice(frozen([largeText])),0n),{$:'Some',field0:largeText});
});
test('text and index boundaries reject invalid JS values without coercion',limits,()=>{
 let calls=0;const coerce={toString(){calls++;return 'text';}},values=frozen(['one']);
 for(const value of [0,1n,true,null,undefined,coerce,new String('boxed'),'\ud800','\udc00','\ud800x']){
  assert.throws(()=>vec.router_owned_text_vec_from_slice(frozen([value])),TypeError);assert.throws(()=>vec.router_owned_text_vec_push(values,value),TypeError);assert.throws(()=>vec.router_owned_text_vec_replace(values,0n,value),TypeError);
 }
 for(const at of [0,-1n,18446744073709551616n,null,coerce])for(const action of [()=>vec.router_owned_text_vec_get(values,at),()=>vec.router_owned_text_vec_truncate(values,at),()=>vec.router_owned_text_vec_replace(values,at,'x')])assert.throws(action,TypeError);
 assert.throws(()=>vec.router_owned_text_vec_replace(values,1n,'x'),RangeError);assert.throws(()=>vec.router_owned_text_vec_replace(values,18446744073709551615n,'x'),RangeError);assert.equal(calls,0);
});
test('dense frozen carrier checks reject accessors proxies holes extra keys and custom prototypes without invoking callers',limits,()=>{
 let calls=0;const getter=[];Object.defineProperty(getter,'0',{enumerable:true,get(){calls++;return 'hidden';}});Object.freeze(getter);
 const proxy=new Proxy(frozen(['x']),{get(){calls++;throw Error('no read');}}),extra=['x'];extra.other='hidden';Object.freeze(extra);const symbol=['x'];symbol[Symbol('hidden')]='extra';Object.freeze(symbol);const custom=['x'];Object.setPrototypeOf(custom,null);Object.freeze(custom);
 for(const value of [['mutable'],frozen(Array(1)),getter,proxy,extra,symbol,custom,{},null])assert.throws(()=>vec.router_owned_text_vec_from_slice(value),TypeError);assert.equal(calls,0);
});
function fixture(t){const directory=mkdtempSync(join(tmpdir(),'router-owned-text-vector-source-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const rows=fresh(frame=>frame.sources.map(row=>({...row})));for(const row of rows){const path=join(directory,row.repositoryPath);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}return {directory,rows};}
test('all eight native runtime declaration validator and catalog sources retain complete CST source joins and no authority',limits,()=>{
 const rows=fresh(frame=>{assert.equal(frame.sources.length,8);assert.equal(frame.inputFiles.length,8);assert.equal(frame.sourceAuthority,false);assert.equal(frame.namespaceAuthority,false);assert.equal(frame.runtimeAuthority,false);assert.equal(frame.crossInvocationCache,false);return frame.sources;});
 assert.equal(rows.filter(row=>row.language==='Rust').length,1);assert.equal(rows.filter(row=>row.language==='TypeScript').length,2);assert.ok(rows.some(row=>row.path==='whitespace-data.mjs'));
 assert.deepEqual(contracts.map(row=>row.operation),['new','from_slice','push','append','truncate','replace','len','get']);assert.deepEqual(rules.map(row=>row.phase),['language','repository']);
 assert.deepEqual(contracts.find(row=>row.operation==='push').consumed,[0,1]);assert.deepEqual(contracts.find(row=>row.operation==='replace').consumed,[0,2]);assert.equal(contracts.find(row=>row.operation==='get').returns,'text-owned-option');assert.equal(contracts.find(row=>row.operation==='get').clonesOwnedText,true);
 for(const row of contracts){assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.nativeRootActivated,false);assert.equal(row.returnedLoan,false);assert.equal(row.receivingExecuted,false);}
});
test('every fresh source pin rejects changed size or same-size content and accepts a corrected new operation',limits,t=>{
 const api=fixture(t);for(const row of api.rows){const path=join(api.directory,row.repositoryPath),bytes=readFileSync(path);try{writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n')]));assert.throws(()=>fresh(()=>42,{directory:api.directory}));const changed=Buffer.from(bytes);changed[0]^=1;writeFileSync(path,changed);assert.throws(()=>fresh(()=>42,{directory:api.directory}));}finally{writeFileSync(path,bytes);}assert.equal(fresh(()=>42,{directory:api.directory}),42);}
});
test('caught nested source failure and byte restoration still invalidate the enclosing owned-text source operation',limits,t=>{
 const api=fixture(t),row=api.rows.find(value=>value.language==='Rust'),path=join(api.directory,row.repositoryPath),bytes=readFileSync(path);
 assert.throws(()=>fresh(()=>{try{writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n')]));assert.throws(()=>fresh(()=>42,{directory:api.directory}));}finally{writeFileSync(path,bytes);}return 42;},{directory:api.directory}),/invalidated/u);
 assert.equal(fresh(()=>42,{directory:api.directory}),42);
});
test('paired assets include the complete runtime validator and strict declaration dependencies in both roots',limits,()=>{
 const one=assets('runtime'),two=assets('runtime','types');assert.equal(one.length,6);assert.equal(two.length,12);assert.equal(new Set(two.map(row=>row.path)).size,12);
 for(const name of ['owned-text-vector-runtime.mjs','owned-text-vector-runtime.d.mts','string-iterator-runtime.mjs','whitespace-data.mjs','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])for(const prefix of ['runtime','types'])assert.ok(two.some(row=>row.path===prefix+'/'+name));
 for(const root of ['/absolute','../escape','bad\\root','bad:root','bad\u0000root'])assert.throws(()=>assets(root));
});
test('strict independent TypeScript callers retain owned text options and reject wrong text/index/mutation types',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-owned-text-vector-types-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const row of assets('runtime')){const path=join(directory,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}
 const file=join(directory,'input.mts');writeFileSync(file,`import * as vec from './runtime/owned-text-vector-runtime.mjs';
import type {RustU64} from './runtime/primitive-operator-runtime.mjs';
const index=0n as RustU64;
const empty=vec.router_owned_text_vec_new();
const values=vec.router_owned_text_vec_push(empty,'λ😀');
const copied=vec.router_owned_text_vec_from_slice(values);
const output=vec.router_owned_text_vec_get(copied,index);
if(output.$==='Some'){const text:string=output.field0;void text;}
const count:RustU64=vec.router_owned_text_vec_len(copied);void count;
// @ts-expect-error native String domain rejects numbers
vec.router_owned_text_vec_push(values,7);
// @ts-expect-error native u64 domain rejects number indices
vec.router_owned_text_vec_get(values,0);
// @ts-expect-error frozen carrier cannot be mutated through its declaration
values.push('illegal');
// @ts-expect-error an optional owned text result is not a boolean
const wrong:boolean=output;void wrong;
`);
 const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');const program=ts.createProgram([file],{strict:true,noEmit:true,allowJs:true,checkJs:false,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});assert.deepEqual(ts.getPreEmitDiagnostics(program).map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')),[]);
});
test('eight complete mixed source equations retain full native/source originals both phases and every inverse',limits,()=>{
 const plan=prepareOwnedTextVectorCoreSources();assert.equal(plan.files.length,8);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
 const native=plan.files.find(row=>row.path==='rust/src/translation_owned_text_vectors_core.rs');assert.equal(native.nativeBindings.rustCstSourceChecked,true);assert.equal(native.nativeBindings.rustCompilationExecuted,false);assert.equal(native.nativeBindings.nativeSemanticScopeChecked,false);
});
