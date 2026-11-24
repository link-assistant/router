import test from 'node:test';
import assert from 'node:assert/strict';
import {json} from '../translate.mjs';
import {planProjectMetaStorage,planProjectMetaObjectStorage,loadProjectMetaStorage,PROJECT_META_STORAGE_LIMITS} from '../project-meta-storage.mjs';

const name='tools/translation/projects/rust/src/lib.meta.json';
function compare(meta,storageLimits){
 const original=json(meta),old=planProjectMetaStorage(name,original,{storageLimits}),next=planProjectMetaObjectStorage(name,meta,{serialize:json,storageLimits});
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
  assert.throws(()=>planProjectMetaObjectStorage(name,meta,{serialize:json,storageLimits}));
 }
 const late=metadata(10);late.targetSemanticProgram.rows.at(-1).push('last complete value');compare(late,{fileBytes:3000,totalBytes:20000});
});

test('new owned-data entry refuses accessors proxies root toJSON and malformed field serializers without admission',()=>{
 let callbacks=0;const accessor=Object.defineProperty({},'value',{enumerable:true,get(){callbacks++;return 1;}}),custom={toJSON(){callbacks++;return {};}};
 const proxy=new Proxy({}, {get(){callbacks++;throw Error('unexpected trap');},getPrototypeOf(){callbacks++;throw Error('unexpected trap');}});
 for(const value of [accessor,custom,proxy,[],null,1])assert.throws(()=>planProjectMetaObjectStorage(name,value,{serialize:json}),TypeError);
 assert.equal(callbacks,0);
 for(const serialize of [undefined,()=>null,()=>'',()=>'{"different":1}\n',()=>'{"value":1,"extra":2}\n'])assert.throws(()=>planProjectMetaObjectStorage(name,{value:true},{serialize}));
 const cycle={};cycle.self=cycle;assert.throws(()=>planProjectMetaObjectStorage(name,{cycle},{serialize:json}),TypeError);
});

test('flat complete fields retain all UTF16 units and multibyte member prefixes under component storage',{timeout:60000},()=>{
 let units='';for(let base=0;base<65536;base+=256)units+=String.fromCharCode(...Array.from({length:256},(_,index)=>base+index));
 const meta=metadata(5);meta.checkedSemanticProgram.allUnits=units;meta.targetSemanticProgram.allUnits=units;meta['λ😀']={toJSON(key){return key+'\ud800\r\n';}};
 const fileBytes=Math.max(Buffer.byteLength(json(meta.checkedSemanticProgram)),Buffer.byteLength(json(meta.targetSemanticProgram)))+1024;
 assert.ok(Buffer.byteLength(json(meta))>fileBytes);assert.equal(compare(meta,{fileBytes,totalBytes:2*1024*1024}).components.length,3);
});
