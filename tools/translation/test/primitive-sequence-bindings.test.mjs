// Fresh source/root-proposal cases only. ALL UNRUN; no caller qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {withFreshPrimitiveSequenceInputs as fresh} from '../fresh-primitive-sequence-inputs.mjs';
import {proposePrimitiveSequenceRootSource as propose} from '../primitive-sequence-root-source.mjs';
import {observePrimitiveSequenceCoreSources as observe} from '../primitive-sequence-source-bindings.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {preparePrimitiveSequenceBindingsSources} from '../prepare-primitive-sequence-bindings-sources.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));
function fixture(t){const directory=mkdtempSync(join(tmpdir(),'router-primitive-source-')),paths=fresh(frame=>frame.inputFiles);t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const path of paths){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),readFileSync(join(root,path)));}return {directory,paths};}
function caught(run){try{return {thrown:false,value:run()};}catch(value){return {thrown:true,value};}}
test('six complete fresh source programs preserve all language CST inverses and no source/authority result cache',limits,()=>{
 const first=fresh(frame=>frame),second=fresh(frame=>frame);assert.equal(first.sources.length,6);assert.equal(first.inputFiles.length,6);assert.notStrictEqual(first.sources,second.sources);assert.notStrictEqual(first.sources[0],second.sources[0]);for(const row of first.sources){assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);assert.equal(row.sourceAuthority,false);assert.equal(row.namespaceAuthority,false);assert.equal(row.runtimeAuthority,false);}assert.equal(first.crossInvocationCache,false);assert.equal(second.crossInvocationCache,false);
});
test('every selected input is rejoined before and after callbacks and primary null/undefined throws survive closing failures',limits,t=>{
 const {directory,paths}=fixture(t);for(const path of paths){const absolute=join(directory,path),original=readFileSync(absolute);writeFileSync(absolute,Buffer.concat([original,Buffer.from('\n')]));assert.throws(()=>fresh(()=>true,{directory}));writeFileSync(absolute,original);}
 for(const primary of [null,undefined,new Error('independent primary')]){const first=join(directory,paths[0]),last=join(directory,paths.at(-1)),a=readFileSync(first),b=readFileSync(last),result=caught(()=>fresh(()=>{writeFileSync(first,Buffer.concat([a,Buffer.from('\n')]));writeFileSync(last,Buffer.concat([b,Buffer.from('\n')]));throw primary;},{directory}));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);writeFileSync(first,a);writeFileSync(last,b);assert.equal(fresh(frame=>frame.sources.length,{directory}),6);}
});
test('async proxy and then getter escape refuse before callbacks or accessor invocation',limits,()=>{
 let called=0,gets=0;assert.throws(()=>fresh(async()=>{called++;}));assert.throws(()=>fresh(new Proxy(()=>true,{apply(){called++;return true;}})));assert.equal(called,0);assert.throws(()=>fresh(()=>({get then(){gets++;return ()=>null;}})));assert.equal(gets,0);
});
test('the complete root and runtime/declaration source-set proposal is reversible idempotent and uninstalled',limits,()=>{
 const source='pub mod translation_core;\n',row=propose(source);assert.equal(row.files.length,6);assert.equal(row.files[0].before,source);assert.equal(row.files[0].inverse,source);assert.ok(row.files[0].after.endsWith('pub mod translation_primitive_sequences_core;\n'));assert.equal(row.files[0].histories[0].inverse,source);assert.equal(row.alreadyPresent,false);assert.equal(row.nativeRootActivated,false);assert.equal(row.sourceInstalled,false);assert.equal(row.privateCallerBindingQualified,false);assert.deepEqual(row.ruleTrace.map(stage=>stage.phase),['language','repository']);
 const second=propose(row.files[0].after);assert.equal(second.alreadyPresent,true);assert.equal(second.files[0].after,row.files[0].after);assert.equal(second.files[0].inverse,row.files[0].after);const mirrored=propose(source,{runtimeRoot:'app/runtime',declarationRoot:'typed/runtime'});assert.equal(mirrored.files.length,10);assert.equal(new Set(mirrored.files.map(file=>file.path)).size,10);
});
test('source observations join all actual bytes, public functions and private helpers while leaving real caller/type/owner qualification open',limits,()=>{
 const row=propose('pub mod translation_core;\n'),files=new Map(row.files.map(file=>[file.path,file.after??file.source])),result=observe(files,{runtimeRoot:'runtime'});assert.equal(result.publicFunctions.length,33);assert.equal(new Set(result.publicFunctions.map(row=>row.name)).size,33);assert.equal(result.records.length,6);for(const key of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','privateCallerBindingQualified','nativeRustGrammarChecked','receivingExecuted','crossInvocationCache'])assert.equal(result[key],false,key);
 for(const [path,source]of files){const changed=new Map(files);changed.set(path,source+'\n// changed\n');if(path!=='src/lib.rs')assert.throws(()=>observe(changed,{runtimeRoot:'runtime'}));}
 const missing=new Map(files);missing.set('src/lib.rs','pub mod translation_core;\n');assert.throws(()=>observe(missing,{runtimeRoot:'runtime'}));const gated=new Map(files);gated.set('src/lib.rs','#[cfg(any())] pub mod translation_primitive_sequences_core;\n');assert.throws(()=>observe(gated,{runtimeRoot:'runtime'}));
});
test('ambiguous aliases configured/private module edges colliding types and escaping output paths refuse',limits,()=>{
 for(const source of ['mod translation_primitive_sequences_core;','#[cfg(any())]pub mod translation_primitive_sequences_core;','pub mod translation_primitive_sequences_core;pub mod translation_primitive_sequences_core;','use crate::translation_primitive_sequences_core;','struct translation_primitive_sequences_core;'])assert.throws(()=>propose(source));for(const options of [{runtimeRoot:'../escape'},{declarationRoot:'/absolute'},{sourcePath:'caller.mjs'},{sourcePath:'src/translation_primitive_sequences_core.rs'}])assert.throws(()=>propose('',options));
});
test('five complete equations retain whole original source owners current text exact inverses and both phases',limits,()=>{
 const plan=preparePrimitiveSequenceBindingsSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
