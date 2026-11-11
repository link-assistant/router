import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import * as current from '../macro-token-trees.mjs';
import * as builder from '../builtin-ast-builder-meta.mjs';
import {createStaticRustTokenReader,staticRustTokenReaderFacts} from '../static-rust-tokens.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {transportConcreteSourcePhases} from '../concrete-phased-equations.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../source-copy-native-bindings.mjs';
import {fileURLToPath} from 'node:url';

const base=new URL('../',import.meta.url),root=new URL('../../../',import.meta.url);
const json=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,functionText=Function.prototype.toString;
const hash=value=>createHash('sha256').update(value).digest('hex');
const raw=gunzipSync(readFileSync(new URL('./fixtures/builtin-import-token-storage-before.json.gz',import.meta.url)),{maxOutputLength:100000});
assert.equal(hash(raw),'110d77985ceab49e0b00b07c04c96c681f83747bb657aea4f7a3e61a2f22bb37');
const history=JSON.parse(raw),source=name=>history.files.find(row=>row.path==='tools/translation/'+name).source;
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),bounds={maxBytes:256000,maxTokens:32000,maxDepth:64};
let vectors=[];
const retain=(kind,value)=>{if(process.env.ROUTER_BUILTIN_IMPORT_TOKEN_EVIDENCE_DIR)vectors.push({kind,value});return value;};
function check(name,run){test(name,{timeout:60000},async t=>{vectors=[];try{await run(t);}finally{
 const out=process.env.ROUTER_BUILTIN_IMPORT_TOKEN_EVIDENCE_DIR;
 if(out){mkdirSync(out,{recursive:true});const bytes=Buffer.from(json({name,vectors})+'\n'),packed=gzipSync(bytes,{mtime:0});assert.deepEqual(gunzipSync(packed),bytes);writeFileSync(join(out,hash(name)+'.json.gz'),packed,{flag:'wx'});}
}});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function equal(kind,before,after){retain(kind,{before,after});assert.deepEqual(after,before,kind);return after;}
async function original(t){
 const directory=mkdtempSync(join(tmpdir(),'router-import-token-original-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const paths=new Map(history.files.map(row=>[row.path.split('/').at(-1),join(directory,row.path.split('/').at(-1))]));
 for(const row of history.files){
  assert.equal(Buffer.byteLength(row.source),row.bytes);assert.equal(hash(row.source),row.sha256);const edits=[];
  const relocated=row.source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/gu,(before,quote,path)=>{
   const target=paths.has(path.slice(2))?pathToFileURL(paths.get(path.slice(2))).href:new URL(path,base).href;
   const after='from '+quote+target+quote;edits.push({before,after});return after;
  });
  let inverse=relocated;for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,()=>edit.before);}assert.equal(inverse,row.source);
  writeFileSync(paths.get(row.path.split('/').at(-1)),relocated,{flag:'wx'});retain('complete-original-relocation',{...row,relocated,edits,inverse});
 }
 return {macro:await import(pathToFileURL(paths.get('macro-token-trees.mjs'))),builder:await import(pathToFileURL(paths.get('builtin-ast-builder-meta.mjs')))};
}
function replaceOnce(value,before,after){assert.equal(value.split(before).length,2);return value.replace(before,()=>after);}
const regexState=()=>Object.fromEntries(['input','lastMatch','lastParen','leftContext','rightContext','$1','$2','$3','$4','$5','$6','$7','$8','$9'].map(name=>[name,RegExp[name]]));

check('complete original source equations retain two CST phases and exact inverses',()=>{
 const macro='macro-token-trees.mjs',before=source(macro);
 const language=[
  ['export function originalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={}) {','function readOriginalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={},readTokens) {'],
  ['for(const token of rustTokens(source)) {','for(const token of readTokens(source)) {'],
 ];
 let middle=before;for(const [from,to]of language)middle=replaceOnce(middle,from,to);
 const after=readFileSync(new URL(macro,base),'utf8'),repository=[
  ["import {rustTokens} from './rust-structure.mjs';\n","import {rustTokens} from './rust-structure.mjs';\nimport {createStaticRustTokenReader} from './static-rust-tokens.mjs';\n"],
  ['function readOriginalMacroTrees(',after.slice(after.indexOf('export function originalMacroTrees('),after.indexOf('function readOriginalMacroTrees('))+'function readOriginalMacroTrees('],
 ];
 let actual=middle;for(const [from,to]of repository)actual=replaceOnce(actual,from,to);assert.equal(actual,after);
 let inverse=after;for(const [from,to]of [...repository].reverse())inverse=replaceOnce(inverse,to,from);assert.equal(inverse,middle);for(const [from,to]of [...language].reverse())inverse=replaceOnce(inverse,to,from);assert.equal(inverse,before);
 const builderBefore=source('builtin-ast-builder-meta.mjs'),builderAfter=readFileSync(new URL('builtin-ast-builder-meta.mjs',base),'utf8'),builderLanguage=[
  ['roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64})','roots=access?originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}):originalImportTrees(profile,origin)'],
  ['trees=originalMacroTrees(source.source,{maxBytes:256000,maxTokens:32000,maxDepth:64})','trees=originalImportTrees(state.profile,source)'],
 ],builderRepository=[
  ["import {originalMacroTrees} from './macro-token-trees.mjs';","import {originalMacroTrees,createPinnedMacroTreeReader} from './macro-token-trees.mjs';"],
  ['const ident=node=>',builderAfter.slice(builderAfter.indexOf('const importTokenReaders='),builderAfter.indexOf('const ident=node=>'))+'const ident=node=>'],
 ];
 let builderMiddle=builderBefore;for(const [from,to]of builderLanguage)builderMiddle=replaceOnce(builderMiddle,from,to);
 let builderActual=builderMiddle;for(const [from,to]of builderRepository)builderActual=replaceOnce(builderActual,from,to);assert.equal(builderActual,builderAfter);
 let builderInverse=builderAfter;for(const [from,to]of [...builderRepository].reverse())builderInverse=replaceOnce(builderInverse,to,from);assert.equal(builderInverse,builderMiddle);for(const [from,to]of [...builderLanguage].reverse())builderInverse=replaceOnce(builderInverse,to,from);assert.equal(builderInverse,builderBefore);
 const equations=transportConcreteSourcePhases([{before,middle,after,language:'JavaScript'},{before:builderBefore,middle:builderMiddle,after:builderAfter,language:'JavaScript'}]);
 const newReader=readFileSync(new URL('static-rust-tokens.mjs',base),'utf8'),ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 const nativeBindings=verifyNativeCopiedModuleBindings(ts,[['macro.before.mjs',before],['macro.after.mjs',after],['builder.before.mjs',builderBefore],['builder.after.mjs',builderAfter],['static-rust-tokens.mjs',newReader]].map(([path,source])=>({path:fileURLToPath(new URL(path,base)),source})));
 retain('complete-source-phases',{history,equations,language,repository,inverse,builderLanguage,builderRepository,builderInverse,newReader,nativeBindings});
 assert.equal(equations.length,2);
});

check('fresh macro trees retain exact source syntax legacy regexp state and original malformed refusals',async t=>{
 const old=(await original(t)).macro,read=current.createPinnedMacroTreeReader();
 assert.equal(current.originalMacroTrees.length,old.originalMacroTrees.length);assert.equal(current.originalMacroTrees.name,old.originalMacroTrees.name);
 for(const text of ['struct S{v:u8}\n','/// Ω😀\nmacro_rules! m{($x:ident)=>{$x}}\n','use x::{a,b};\n','fn x(){let q=r##"raw"##;let c=\'λ\';}\n','struct S{v:u8}','fn x(\n','/** docs */struct S;\n']){
  const pin=Object.freeze({source:text});
  for(let index=0;index<2;index++){
   /sentinel-(before)/u.exec('sentinel-before');const expected=outcome(()=>old.originalMacroTrees(text,bounds)),beforeState=regexState();
   /sentinel-(before)/u.exec('sentinel-before');const actual=outcome(()=>read(pin,bounds)),afterState=regexState();
   equal('complete-trees-and-legacy-state',{expected,beforeState},{expected:actual,beforeState:afterState});
   if(actual.value){assert.ok(Object.isFrozen(actual.value));assert.deepEqual(current.macroTreeSource(actual.value),{source:text,sha256:hash(text)});assert.equal(old.macroTreeSource(actual.value),null);assert.notEqual(read(pin,bounds),actual.value);}
  }
 }
 for(const limits of [{maxBytes:1},{maxTokens:1},{maxDepth:1},{maxTokens:32001},{maxBytes:NaN},null]){
  const text='fn x(){if true{{}}}\n',pin=Object.freeze({source:text});
  equal('original-independent-budget-refusal',outcome(()=>old.originalMacroTrees(text,limits)),outcome(()=>read(pin,limits)));
 }
});

check('every complete pinned Rust source retains full original macro projection and fresh tree identities',async t=>{
 const old=(await original(t)).macro,read=current.createPinnedMacroTreeReader();
 for(const row of profile.sources){
  const pin=builtinAstOriginal(profile,row.path);
  /sentinel-(before)/u.exec('sentinel-before');const expected=outcome(()=>old.originalMacroTrees(pin.source,bounds)),state=regexState();
  for(let at=0;at<2;at++){
   /sentinel-(before)/u.exec('sentinel-before');const actual=outcome(()=>read(pin,bounds)),actualState=regexState();
   equal('complete-pinned-original-'+row.path,{result:expected,state},{result:actual,state:actualState});
  }
 }
});

check('complete builder contracts callbacks original refusals and private compiler boundaries remain exact',async t=>{
 const old=(await original(t)).builder,a=old.createBuiltinAstBuilderMetaCompiler(profile),b=builder.createBuiltinAstBuilderMetaCompiler(profile);
 for(const name of ['expr_deref','expr_call','expr_path','expr_call_global','expr_macro_call','expr_unreachable','nonexistent_output_builder'])equal('complete-original-builder-'+name,outcome(()=>a.compile(name)),outcome(()=>b.compile(name)));
 for(const [path,name]of [['clone.rs','cs_clone_simple'],['clone.rs','cs_clone'],['debug.rs','show_substructure'],['debug.rs','show_fieldless_enum'],['cmp/partial_eq.rs','get_substructure_equality_expr'],['hash.rs','hash_substructure']]){
  const fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/'+path,name);
  equal('complete-original-callback-'+name,outcome(()=>old.inventoryBuiltinAstCallbackCalls(a,fragment)),outcome(()=>builder.inventoryBuiltinAstCallbackCalls(b,fragment)));
 }
 assert.throws(()=>b.assert(a.compile('expr_call')),/original compiler/);assert.throws(()=>a.assert(b.compile('expr_call')),/original compiler/);
 for(const fake of [structuredClone(profile),{...profile},new Proxy(profile,{})])equal('original-private-profile-refusal',outcome(()=>old.createBuiltinAstBuilderMetaCompiler(fake)),outcome(()=>builder.createBuiltinAstBuilderMetaCompiler(fake)));
});

check('warm lexical storage preserves complete hash and changed host observer tapes',async t=>{
 const old=(await original(t)).macro,text='/// original Ω\nfn example(){let value=alpha;call!(value);}\n',pin=Object.freeze({source:text}),read=current.createPinnedMacroTreeReader();read(pin,bounds);
 function observe(run,owner,key){
  const field=get(owner,key),tape=[],callbacks=[];
  // Each complete invocation creates fresh closures, including two runs of
  // the unchanged original. Retain complete callback text and within-tape
  // identity relationships; comparing cross-invocation identities is invalid.
  try{define(owner,key,{...field,value:function(...args){
   const recorded=[];
   for(const arg of args){
    if(typeof arg!=='function'){recorded.push(arg);continue;}
    let identity=callbacks.indexOf(arg);if(identity<0){identity=callbacks.length;callbacks.push(arg);}
    recorded.push({kind:'callback',identity,source:apply(functionText,arg,[]),name:arg.name,length:arg.length});
   }
   tape.push({operation:key,args:recorded});return apply(field.value,this,args);
  }});return {result:outcome(run),tape};}
  finally{define(owner,key,field);}
 }
 for(const [owner,key]of [[Hash.prototype,'update'],[Hash.prototype,'digest'],[JSON,'stringify'],[Object,'freeze'],[Object,'values'],[String.prototype,'slice'],[Array.prototype,'map'],[Array.prototype,'forEach'],[RegExp.prototype,'test']]){
  const expected=observe(()=>old.originalMacroTrees(text,bounds),owner,key),actual=observe(()=>read(pin,bounds),owner,key);
  equal('complete-observer-'+key,expected,actual);assert.ok(actual.tape.length,key);
 }
 function transient(run){
  const update=get(Hash.prototype,'update'),prior=get(RegExp.prototype,'test'),tape=[];let changed=false;
  try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({operation:'update',args});if(!changed){changed=true;define(RegExp.prototype,'test',{...prior,value:function(...args){tape.push({operation:'test',args});return apply(prior.value,this,args);}});}return apply(update.value,this,args);}});return {result:outcome(run),tape,changed};}
  finally{define(Hash.prototype,'update',update);define(RegExp.prototype,'test',prior);}
 }
 equal('hash-hook-changes-lexer-before-current-read',transient(()=>old.originalMacroTrees(text,bounds)),transient(()=>read(pin,bounds)));
});

check('lexical data stays mutable independent bounded and separate from caller proposed source identity',()=>{
 const read=createStaticRustTokenReader({diagnostics:true}),text='struct Original;\n',pin=Object.freeze({source:text}),first=read(pin,text),second=read(pin,text);
 const facts=staticRustTokenReaderFacts(read);retain('actual-private-lexical-reuse',facts);assert.equal(facts.hits,1);assert.equal(facts.misses,1);assert.equal(facts.entries,1);assert.equal(facts.sourceAuthority,false);assert.equal(staticRustTokenReaderFacts(createStaticRustTokenReader()),null);
 equal('complete-fresh-token-data',rustTokens(text),first);assert.notEqual(first,second);assert.notEqual(first[0],second[0]);assert.equal(Object.isFrozen(first),false);assert.equal(Object.isFrozen(first[0]),false);
 first[0].text='changed';first.push({forged:true});equal('original-storage-survives-caller-mutation',rustTokens(text),read(pin,text));
 for(const proposed of [{source:text},Object.freeze({source:'different'}),Object.freeze(Object.assign(Object.create(null),{source:text})),new Proxy(pin,{get(){throw Error('must not observe proposed pin')}})])equal('proposed-pin-is-only-an-optional-storage-miss',rustTokens(text),read(proposed,text));
 for(let at=0;at<20;at++){const value='struct Source'+at+';\n';equal('complete-bounded-entry-'+at,rustTokens(value),read(Object.freeze({source:value}),value));}
 const beforeEvicted=staticRustTokenReaderFacts(read);equal('evicted-pin-keeps-original-token-data',rustTokens(text),read(pin,text));
 const afterEvicted=staticRustTokenReaderFacts(read);assert.equal(afterEvicted.misses,beforeEvicted.misses+1);assert.ok(afterEvicted.entries<=16);assert.ok(afterEvicted.cells<=200000);assert.ok(afterEvicted.chars<=1000000);retain('conservative-storage-bounds',afterEvicted);
 const large='//'+ 'x'.repeat(128000)+'\n';equal('large-source-keeps-original-lexer',rustTokens(large),read(Object.freeze({source:large}),large));
});
