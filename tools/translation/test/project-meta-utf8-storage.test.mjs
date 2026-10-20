import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {json} from '../translate.mjs';
import {planProjectMetaStorage,loadProjectMetaStorage,PROJECT_META_STORAGE_LIMITS} from '../project-meta-storage.mjs';
import {planProjectMetaUtf8ObjectStorage as planProjectMetaObjectStorage} from '../project-meta-utf8-storage.mjs';
import {serializeProjectMetaFieldUtf8} from '../project-meta-field-json.mjs';
import {deriveProjectMetaUtf8StorageSources} from '../prepare-project-meta-utf8-storage.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readFileSync} from 'node:fs';

const name='tools/translation/projects/rust/src/lib.meta.json';
function compare(meta,storageLimits){
 const original=json(meta),old=planProjectMetaStorage(name,original,{storageLimits}),next=planProjectMetaObjectStorage(name,meta,{serializeUtf8:serializeProjectMetaFieldUtf8,storageLimits});
 assert.deepEqual(next,old);
 const files=new Map(next.components.map(row=>[row.path,row.text])),targets={meta:name,javascript:'js/generated/rust-project/rust/src/lib.mjs',typescript:'ts/generated/rust-project/rust/src/lib.ts',...next.targets};
 const restored=loadProjectMetaStorage(next.text,{metaPath:name,targets,read:path=>files.get(path),storageLimits});assert.equal(restored.text,original);assert.deepEqual(restored.meta,JSON.parse(original));return next;
}
function metadata(size=100){return {
 schema:'tracked-rust-project-semantic-meta-v1',entry:'rust/src/lib.rs',runtimeParity:false,
 checkedSemanticProgram:{integer:2n**127n,drop:undefined,rows:Array.from({length:size},(_,index)=>({index,source:'猫😀\n"\\',value:new Map([['first',-3n],['last',undefined]])}))},
 targetSemanticProgram:{source:'\ufeffrust\r\n',rows:Array.from({length:size},(_,index)=>[index,true,null,'\ud800'])},
 concreteSyntaxMeta:Array.from({length:size},(_,index)=>({source:'rust/src/module'+index+'.rs',document:{source:'pub fn value()->u8{7}',authority:false}})),
 tail:{keep:true,missing:undefined},
};}

test('component-wise metadata exactly matches every original inline and three-component byte',{timeout:60000},()=>{
 const meta=metadata();assert.equal(compare(meta,PROJECT_META_STORAGE_LIMITS).components.length,0);
 const componentBound=value=>Math.max(...['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'].filter(key=>Object.hasOwn(value,key)).map(key=>Buffer.byteLength(json(value[key]))))+1024;
 assert.ok(Buffer.byteLength(json(meta))>componentBound(meta));assert.equal(compare(meta,{fileBytes:componentBound(meta),totalBytes:100000}).components.length,3);
 const legacy={...meta};delete legacy.concreteSyntaxMeta;assert.ok(Buffer.byteLength(json(legacy))>componentBound(legacy));assert.equal(compare(legacy,{fileBytes:componentBound(legacy),totalBytes:100000}).components.length,2);
});

test('native key order omissions Map BigInt Unicode and nested toJSON key arguments keep complete bytes',{timeout:60000},()=>{
 const meta=Object.assign(Object.create(null),{2:'two',1:'one'},metadata(10),{
  omitted:undefined,callable:()=>{},symbol:Symbol('omitted'),
  key:{toJSON(key){return {nativeKey:key,unicode:'猫\ud800'};}},
 });
 compare(meta,{fileBytes:3000,totalBytes:20000});
 compare({},{fileBytes:100,totalBytes:100});
});

test('lower-only limits and whole late component values preserve original storage bounds',{timeout:60000},()=>{
 const meta=metadata(500);compare(meta,{fileBytes:100000,totalBytes:500000});
 for(const storageLimits of [{fileBytes:500,totalBytes:500000},{fileBytes:100000,totalBytes:1000},{fileBytes:PROJECT_META_STORAGE_LIMITS.fileBytes+1},{foreign:1}]){
  assert.throws(()=>planProjectMetaStorage(name,json(meta),{storageLimits}));
  assert.throws(()=>planProjectMetaObjectStorage(name,meta,{serializeUtf8:serializeProjectMetaFieldUtf8,storageLimits}));
 }
 const late=metadata(10);late.targetSemanticProgram.rows.at(-1).push('last complete value');compare(late,{fileBytes:3000,totalBytes:20000});
});

test('new owned-data entry refuses accessors proxies root toJSON and malformed field serializers without admission',()=>{
 let callbacks=0;const accessor=Object.defineProperty({},'value',{enumerable:true,get(){callbacks++;return 1;}}),custom={toJSON(){callbacks++;return {};}};
 const proxy=new Proxy({}, {get(){callbacks++;throw Error('unexpected trap');},getPrototypeOf(){callbacks++;throw Error('unexpected trap');}});
 for(const value of [accessor,custom,proxy,[],null,1])assert.throws(()=>planProjectMetaObjectStorage(name,value,{serializeUtf8:serializeProjectMetaFieldUtf8}),TypeError);
 assert.equal(callbacks,0);
 for(const serializeUtf8 of [undefined,()=>null,()=>'',()=>'{"different":1}\n',()=>'{"value":1,"extra":2}\n'])assert.throws(()=>planProjectMetaObjectStorage(name,{value:true},{serializeUtf8}));
 const cycle={};cycle.self=cycle;assert.throws(()=>planProjectMetaObjectStorage(name,{cycle},{serializeUtf8:serializeProjectMetaFieldUtf8}),TypeError);
});

test('flat complete fields retain all UTF16 units and multibyte member prefixes under component storage',{timeout:60000},()=>{
 let units='';for(let base=0;base<65536;base+=256)units+=String.fromCharCode(...Array.from({length:256},(_,index)=>base+index));
 const meta=metadata(5);meta.checkedSemanticProgram.allUnits=units;meta.targetSemanticProgram.allUnits=units;meta['λ😀']={toJSON(key){return key+'\ud800\r\n';}};
 const fileBytes=Math.max(Buffer.byteLength(json(meta.checkedSemanticProgram)),Buffer.byteLength(json(meta.targetSemanticProgram)))+1024;
 assert.ok(Buffer.byteLength(json(meta))>fileBytes);assert.equal(compare(meta,{fileBytes,totalBytes:2*1024*1024}).components.length,3);
});

test('actual UTF8 source producer preserves complete original sources CST and inverse rules',{timeout:60000},()=>{
 const storage=readFileSync(new URL('../project-meta-storage.mjs',import.meta.url),'utf8'),translate=readFileSync(new URL('../translate.mjs',import.meta.url),'utf8'),proposal=deriveProjectMetaUtf8StorageSources({storage,translate});
 assert.equal(proposal.files.length,2);
 for(const row of proposal.files){
  assert.equal(readFileSync(repositorySourceURL(row.path,new URL('../../../',import.meta.url)),'utf8'),row.text);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);
  assert.ok(row.trace.some(event=>event.phase==='repository'));
 }
 assert.throws(()=>deriveProjectMetaUtf8StorageSources({storage:storage.replace('const fields=[];let bytes=3;','const fields=[];let bytes=4;').replace("typeof serialize!=='function'","typeof serialize==='function'"),translate}),/anchor|changed/);
 assert.throws(()=>deriveProjectMetaUtf8StorageSources({storage,translate:translate.replace('export const json =','export const changed =')}),/changed/);
});

test('complete malformed UTF8 wrappers and noncanonical bytes cannot enter component storage',()=>{
 for(const [wrapped,Expected]of [[Buffer.from('{"value":1}\n'),TypeError],[Buffer.from('{"other":1}'),TypeError],[Buffer.from('{"value":1,"extra":2}'),SyntaxError],[Buffer.from('{"value":01}'),SyntaxError],[Buffer.from([123,34,118,97,108,117,101,34,58,34,255,34,125]),TypeError]]){
  assert.throws(()=>planProjectMetaObjectStorage(name,{value:1},{serializeUtf8:()=>wrapped}),Expected);
 }
});

test('fixed owned UTF8 serializer preserves every original field callback key and JSON byte',()=>{
 const keys=[],meta={first:{toJSON(key){keys.push(key);return {value:7n};}},omitted:undefined,last:new Map([['Ω','猫😀']])};
 const bytes=serializeProjectMetaFieldUtf8(meta);assert.deepEqual(keys,['first']);assert.deepEqual(bytes,Buffer.from(json(meta).slice(0,-1),'utf8'));
 const raw=serializeProjectMetaFieldUtf8({x:'x'.repeat(2*1024*1024)+'猫😀'});assert.equal(raw.at(-1),125);assert.deepEqual(raw,Buffer.from(json({x:'x'.repeat(2*1024*1024)+'猫😀'}).slice(0,-1),'utf8'));
});
