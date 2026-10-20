import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Hash,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {prepareBuiltinSourceMetaStringKeys,originalBuiltinSourceMetaCodec} from '../prepare-builtin-source-meta-string-keys.mjs';
import {relocateSourceModule} from './relocate-source-module.mjs';
import {builtinSourceMetaStringKeysReady} from '../builtin-source-meta-intrinsics.mjs';
import {privateNativeProofJsonDataWithinBudget} from '../private-native-proof-json.mjs';

const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify;
const currentURL=new URL('../builtin-source-meta.mjs',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message,metadataBytes:error.metadataBytes,metadataCells:error.metadataCells}};}};
function retain(name,value){
 const folder=process.env.ROUTER_BUILTIN_STRING_KEYS_VECTOR_DIR;if(!folder)return;
 mkdirSync(folder,{recursive:true});writeFileSync(join(folder,name+'.json.gz'),gzipSync(json(value)+'\n'),{flag:'wx'});
}
async function fixture(t){
 const original=originalBuiltinSourceMetaCodec(),current=readFileSync(currentURL,'utf8'),directory=mkdtempSync(join(tmpdir(),'router-builtin-string-keys-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const needle='strings.set(value,index);',replacement=needle+'receivingStrings++;';assert.equal(current.split(needle).length,2);
 const instrumented=current.replace(needle,replacement);assert.equal(instrumented.replace(replacement,needle),current);
 const relocated=relocateSourceModule(instrumented,currentURL.href),selected='let receivingStrings=0;\n'+relocated.text+'\nexport function receivingFacts(){return {strings:receivingStrings};}\n';
 const paths={before:join(directory,'before.mjs'),current:join(directory,'current.mjs')};writeFileSync(paths.before,original,{flag:'wx'});writeFileSync(paths.current,selected,{flag:'wx'});
 const before=await import(pathToFileURL(paths.before).href),actual=await import(pathToFileURL(paths.current).href);
 retain('source-'+hash(directory),{original,current,instrumented,relocated,selected,paths,sourceAuthority:false});return {before,current:actual};
}
function same(f,value){const before=outcome(()=>f.before.encodeBuiltinSourceMeta(value)),current=outcome(()=>f.current.encodeBuiltinSourceMeta(value));assert.deepEqual(current,before);return current;}
function trial(api,make,install=()=>()=>{}){
 const tape=[],undo=install(tape);let result;try{result=outcome(()=>api.encodeBuiltinSourceMeta(make(tape)));}finally{undo();}return {result,tape};
}
function paired(f,make,install){const before=trial(f.before,make,install),current=trial(f.current,make,install);assert.deepEqual(current,before);return current;}

test('actual native AST copies and complete language then repository CST inverses preserve the original codec',{timeout:60000},()=>{
 const row=prepareBuiltinSourceMetaStringKeys();assert.equal(row.native.typescriptVersion,'5.9.3');assert.equal(row.native.completeNativeCopy,true);assert.equal(row.native.factoryCopy,row.native.currentNativeCopy);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.stages.every(stage=>stage.completeInverse));assert.equal(row.acrossInvocationCaches,false);retain('complete-native-source-equations',row);
});
test('primitive string keys and original JSON string tuples have the same injective UTF16 identity',{timeout:60000},async t=>{
 const f=await fixture(t),strings=['','short','same text','same text','abcdefgh','abcdefgi','\0'.repeat(8),'"\\\b\t\n\f\rX','\ud800'.repeat(8),'\udc00'.repeat(8),'😀😀😀😀','\ud800x\udc00xxxxx','["s","x"]','__proto__','constructor','toJSONxx'];
 for(const a of strings)for(const b of strings){const keys=new Map([[a,1]]);assert.equal(keys.has(b),json(['s',a])===json(['s',b]));assert.equal(JSON.parse(json(['s',a]))[1],a);}
 const observations=[];for(const value of strings){const row=same(f,value);assert.equal(f.current.decodeBuiltinSourceMeta(row.value),value);observations.push(row);}assert.ok(f.current.receivingFacts().strings>0);retain('complete-UTF16-injection-and-root-results',{strings,observations});
});
test('root nodes object key order duplicates and string versus object interleaving preserve every table byte',{timeout:60000},async t=>{
 const f=await fixture(t),shared={longField:'same text',signed:-128},values=[{first:'same text',second:shared,third:'same text',fourth:shared},['same text',{first:'abcdefgh'},'abcdefgh',{first:'same text'}],{'2':'abcdefgh','1':'same text',z:['abcdefgh','same text'],__proto__:null},[null,true,false,-0,1.5,Number.MIN_VALUE,Number.MAX_VALUE],{a:undefined,b:'abcdefgh'}];
 for(const value of values){const row=same(f,value);assert.ok(row.value);assert.deepEqual(f.current.decodeBuiltinSourceMeta(row.value),f.before.decodeBuiltinSourceMeta(row.value));assert.equal(f.current.encodeBuiltinSourceMeta(f.current.decodeBuiltinSourceMeta(row.value)),row.value);}retain('complete-table-order-values',values);
});
test('changed native JSON and inherited array serialization hooks retain complete original operand callbacks',{timeout:60000},async t=>{
 const f=await fixture(t);for(const mode of ['stringify','array-toJSON','object-toJSON']){
  const prior=get(JSON,'stringify'),owner=mode==='array-toJSON'?Array.prototype:Object.prototype,old=get(owner,'toJSON');
  const row=paired(f,()=>({source:'abcdefgh',nested:['abcdefgh','ijklmnop']}),tape=>{
   if(mode==='stringify')define(JSON,'stringify',{...prior,value:function(...args){tape.push({operation:'stringify',thisJSON:this===JSON,args});return apply(prior.value,this,args);}});
   else define(owner,'toJSON',{configurable:true,value:function(key){tape.push({operation:'toJSON',key,array:Array.isArray(this)});return this;}});
   return ()=>{define(JSON,'stringify',prior);if(old)define(owner,'toJSON',old);else delete owner.toJSON;};
  });assert.ok(row.tape.length);retain('complete-hook-'+mode,row);
 }
});
test('accessor proxy and lazy stack graphs retain old callbacks while failed eligibility stays stateless',{timeout:60000},async t=>{
 const f=await fixture(t);for(const mode of ['getter','proxy','lazy-stack']){
  const prepare=get(Error,'prepareStackTrace');const row=paired(f,tape=>{
   const value={source:'abcdefgh'};
   if(mode==='getter')define(value,'nested',{enumerable:true,get(){tape.push('get-nested');return ['abcdefgh'];}});
   if(mode==='proxy')return new Proxy(value,{get(target,key,receiver){tape.push('get:'+String(key));return Reflect.get(target,key,receiver);},ownKeys(target){tape.push('ownKeys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){tape.push('descriptor:'+String(key));return get(target,key);}});
   if(mode==='lazy-stack'){Error.captureStackTrace(value);define(value,'stack',{...get(value,'stack'),enumerable:true});}
   return value;
  },tape=>{if(mode==='lazy-stack')define(Error,'prepareStackTrace',{configurable:true,value(){tape.push('format-stack');return 'abcdefgh';}});return ()=>{if(prepare)define(Error,'prepareStackTrace',prepare);else delete Error.prepareStackTrace;};});
  assert.ok(row.tape.length);retain('complete-unknown-graph-'+mode,row);
 }
});
test('numeric callee mutation cannot invalidate skipped string decisions inside the native domain',{timeout:60000},async t=>{
 const f=await fixture(t),finite=get(Number,'isFinite'),integer=get(Number,'isInteger'),stringify=get(JSON,'stringify');
 for(const key of ['isFinite','isInteger']){
  const original=key==='isFinite'?finite:integer,row=paired(f,()=>({first:'abcdefgh',number:12,last:'ijklmnop'}),tape=>{
   define(Number,key,{...original,value:function(...args){tape.push({operation:key,args});define(JSON,'stringify',{...stringify,value:function(...values){tape.push({operation:'late-stringify',values});return apply(stringify.value,this,values);}});return apply(original.value,this,args);}});
   return ()=>{define(Number,'isFinite',finite);define(Number,'isInteger',integer);define(JSON,'stringify',stringify);};
  });assert.ok(row.tape.some(row=>row.operation==='late-stringify'));retain('complete-numeric-late-mutation-'+key,row);
 }
});
test('changed global ingress and Number owner getters remain exact old fallback without added reads',{timeout:60000},async t=>{
 const f=await fixture(t),root=globalThis;
 for(const key of ['globalThis','Number']){const prior=get(root,key),row=paired(f,()=>({source:'abcdefgh',value:1}),tape=>{define(root,key,{configurable:true,enumerable:prior.enumerable,get(){tape.push('get-'+key);return prior.value;}});return ()=>define(root,key,prior);});if(key==='globalThis')assert.deepEqual(row.tape,[]);else assert.ok(row.tape.length);retain('complete-global-getter-'+key,row);}
});
test('cell depth canonical byte and stateless scan bounds keep every original success or refusal',{timeout:60000},async t=>{
 const f=await fixture(t),cyclic={};cyclic.next=cyclic;let deep=null;for(let at=0;at<66;at++)deep={next:deep};
 for(const value of [cyclic,deep,Array.from({length:16001},(_,index)=>({index})),{source:'x'.repeat(524288)}])assert.ok(same(f,value).error);
 const value=Array.from({length:11000},()=> '\0'.repeat(128)),before=f.current.receivingFacts();assert.equal(privateNativeProofJsonDataWithinBudget(value),false);assert.ok(same(f,value).value);assert.deepEqual(f.current.receivingFacts(),before);assert.ok(same(f,{restored:'abcdefgh'}).value);assert.ok(f.current.receivingFacts().strings>before.strings);retain('complete-bound-subject',{deepDepth:66,logicalStringOccurrences:value.length,logicalStringLength:value[0].length,remainingBounds:{cells:16000,depth:64,bytes:524288}});
});
test('fresh original hashes reissue every complete metadata input after native interning',{timeout:60000},async t=>{
 const f=await fixture(t),value={source:'abcdefgh',span:{start:1,end:8}},update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest');
 const run=api=>{const tape=[];try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({operation:'update',args});return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const result=apply(digest.value,this,args);tape.push({operation:'digest',args,result});return result;}});return {result:outcome(()=>api.sealBuiltinSourceMeta(value)),tape};}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}};
 const before=run(f.before),current=run(f.current);assert.deepEqual(current,before);assert.ok(current.tape.some(row=>row.operation==='update'));const first=f.current.sealBuiltinSourceMeta(value);value.source='ijklmnop';const second=f.current.sealBuiltinSourceMeta(value);assert.notEqual(first.digest,second.digest);assert.equal(builtinSourceMetaStringKeysReady(),true);retain('complete-fresh-hash-and-input-results',{before,current,first,second});
});
