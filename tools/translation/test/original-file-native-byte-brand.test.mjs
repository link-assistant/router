// Native brand DATA checks grant no original-source or namespace authority.
// The separate original-file-token-context whole8 retains the actual full route.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {originalFileTokenContextFacts} from '../original-file-context-source.mjs';
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,nativeJson=JSON.stringify;
const owner=Object.getPrototypeOf(Uint8Array.prototype),tag=get(owner,Symbol.toStringTag),length=get(owner,'length');
const test=(name,body)=>nodeTest(name,{timeout:60000},async()=>{
 const rows=[],retain=(kind,value)=>{rows.push({kind,value});return value;};
 try{await body(retain);}finally{const folder=process.env.ROUTER_ORIGINAL_FILE_BYTE_BRAND_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonTextGzip(folder+'/'+Buffer.from(name).toString('hex')+'.json.gz',nativeJson({name,rows,authority:false}));}}
});
function brand(value){let actualBrand,actualLength,error;try{actualBrand=apply(tag.get,value,[]);actualLength=apply(length.get,value,[]);}catch(caught){error={name:caught.name,message:caught.message};}return {actualBrand,actualLength,error};}
async function lateModes(modes,retain){
 const rows=[];
 for(const key of [Symbol.toStringTag,'length'])for(const mode of modes){
  const before=get(owner,key);let calls=0,error,caughtError,callsAtRestore;const changed={...before};
  if(mode==='wrapper')changed.get=function(){calls++;return apply(before.get,this,[]);};
  else if(mode==='proxy')changed.get=new Proxy(before.get,{apply(target,receiver,args){calls++;return apply(target,receiver,args);}});
  else if(mode==='foreign-native')changed.get=key==='length'?tag.get:length.get;
  else if(mode==='enumerable')changed.enumerable=!before.enumerable;
  else changed.set=function(){calls++;};
  try{define(owner,key,changed);try{await originalFileTokenContextFacts({});}catch(caught){caughtError=caught;}}
  finally{callsAtRestore=calls;define(owner,key,before);}
  // Formatting a native stack can itself consult Buffer.length. The deliberate
  // hook is restored before any diagnostic Error property is materialized.
  if(caughtError)error={name:caughtError.name,message:caughtError.message,stack:caughtError.stack};
  const row={key:typeof key==='symbol'?'Symbol.toStringTag':key,mode,calls,callsAtRestore,error,phase:'genuine-private-api-before-diagnostic-formatting'};rows.push(row);retain('complete-late-accessor-'+rows.length,row);
  assert.equal(error?.name,'TypeError');assert.equal(error.message,key==='length'?'Private parser execution: live native operation changed':'Original file token context: private fact native byte accessors changed');assert.equal(calls,0);assert.equal(callsAtRestore,0);
 }
 let restored;try{await originalFileTokenContextFacts({});}catch(error){restored={name:error.name,message:error.message};}retain('restored-private-foreign-refusal',restored);assert.equal(restored.name,'TypeError');assert.match(restored.message,/copied or foreign original-token receipt/);
 return rows;
}
function coldModes(modes,retain){
 const url=new URL('../original-file-context-source.mjs',import.meta.url).href,rows=[];
 for(const mode of modes){
  const legacyScript=`import assert from 'node:assert/strict';const mode=${JSON.stringify(mode)},owner=Object.getPrototypeOf(Uint8Array.prototype),key=mode.startsWith('length-')?'length':Symbol.toStringTag,before=Object.getOwnPropertyDescriptor(owner,key),other=Object.getOwnPropertyDescriptor(owner,key==='length'?Symbol.toStringTag:'length');let calls=0,result;try{if(mode!=='native')Object.defineProperty(owner,key,{...before,get:mode.endsWith('wrapper')?function(){calls++;return Reflect.apply(before.get,this,[]);}:mode.endsWith('proxy')?new Proxy(before.get,{apply(target,receiver,args){calls++;return Reflect.apply(target,receiver,args);}}):other.get});try{const api=await import(${JSON.stringify(url)});result={imported:true,apiType:typeof api.prepareOriginalFileContextSources};}catch(error){result={error:{name:error.name,message:error.message,stack:error.stack}};}}finally{Object.defineProperty(owner,key,before);}console.log(JSON.stringify({mode,calls,result,authority:false}));assert.equal(calls,0);if(mode==='native'){assert.equal(result.imported,true);assert.equal(result.apiType,'function');}else{assert.equal(result.error?.name,'TypeError');assert.equal(result.error.message,mode.startsWith('length-')?'Private parser execution: native byte view length required':'Original file token context: private fact native operations unavailable');}`;
  // Length is also used by the ESM/runtime loader. A cold length replacement
  // does not isolate this issuer. Import the complete genuine API first, inside
  // this same bounded child, then measure its fresh private refusal separately.
  const script=mode.startsWith('length-')?`import assert from 'node:assert/strict';const mode=${JSON.stringify(mode)},api=await import(${JSON.stringify(url)}),bootstrap={apiType:typeof api.prepareOriginalFileContextSources,factsType:typeof api.originalFileTokenContextFacts};assert.equal(bootstrap.apiType,'function');assert.equal(bootstrap.factsType,'function');const owner=Object.getPrototypeOf(Uint8Array.prototype),before=Object.getOwnPropertyDescriptor(owner,'length'),other=Object.getOwnPropertyDescriptor(owner,Symbol.toStringTag);let calls=0,callsAtRestore,caught,result;try{Object.defineProperty(owner,'length',{...before,get:mode.endsWith('wrapper')?function(){calls++;return Reflect.apply(before.get,this,[]);}:mode.endsWith('proxy')?new Proxy(before.get,{apply(target,receiver,args){calls++;return Reflect.apply(target,receiver,args);}}):other.get});try{await api.originalFileTokenContextFacts({});result={unexpectedReturn:true};}catch(error){caught=error;}}finally{callsAtRestore=calls;Object.defineProperty(owner,'length',before);}if(caught)result={error:{name:caught.name,message:caught.message,stack:caught.stack}};console.log(JSON.stringify({mode,phase:'healthy-full-import-then-private-guard',bootstrap,calls,callsAtRestore,result,authority:false}));assert.equal(calls,0);assert.equal(callsAtRestore,0);assert.equal(result.error?.name,'TypeError');assert.equal(result.error.message,'Private parser execution: live native operation changed');`:legacyScript;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024}),row={mode,phase:mode.startsWith('length-')?'healthy-full-import-then-private-guard':'original-preimport-tag-or-native-control',script,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error?.message};rows.push(row);retain('complete-cold-accessor-'+rows.length,row);assert.equal(child.status,0,child.stderr);assert.equal(child.signal,null);
 }
 return rows;
}
test('genuine native Uint8Array and Buffer brands retain complete bounded byte lengths',retain=>{
 const rows=[{name:'Uint8Array',row:brand(new Uint8Array([7]))},{name:'Buffer',row:brand(Buffer.from([7]))}];retain('complete-native-byte-positives',rows);
 for(const {row}of rows){assert.equal(row.actualBrand,'Uint8Array');assert.equal(row.actualLength,1);assert.equal(row.error,undefined);}
});
test('wrong typed-array array and DataView brands cannot stand for Uint8Array bytes',retain=>{
 const rows=[{name:'clamped',row:brand(new Uint8ClampedArray(1))},{name:'Array',row:brand([])},{name:'DataView',row:brand(new DataView(new ArrayBuffer(1)))}];retain('complete-wrong-byte-brands',rows);
 assert.equal(rows[0].row.actualBrand,'Uint8ClampedArray');assert.equal(rows[0].row.actualLength,1);assert.notEqual(rows[0].row.actualBrand,'Uint8Array');for(const {row}of rows.slice(1)){assert.equal(row.actualBrand,undefined);assert.equal(row.error.name,'TypeError');}
});
test('hostile Symbol tags and Proxy views are not consulted by native brand getters',retain=>{
 let reads=0;const hostile={get [Symbol.toStringTag](){reads++;throw Error('must not read tag');}},proxy=new Proxy(new Uint8Array(1),{get(){reads++;throw Error('must not read Proxy');}}),rows=[brand(hostile),brand(proxy)];retain('complete-hostile-brand-oracles',{rows,reads});for(const row of rows){assert.equal(row.actualBrand,undefined);assert.equal(row.error.name,'TypeError');}assert.equal(reads,0);
});
test('late callable and Proxy accessor substitutions refuse before private fact callbacks',async retain=>{await lateModes(['wrapper','proxy'],retain);});
test('late accessor flags and setters retain exact current descriptor refusal',async retain=>{await lateModes(['enumerable','setter'],retain);});
test('different genuine native accessors cannot substitute for the captured byte operations',async retain=>{await lateModes(['foreign-native'],retain);});
test('cold native import succeeds while wrapper and Proxy accessors issue no private facts',retain=>{coldModes(['native','tag-wrapper','tag-proxy','length-wrapper','length-proxy'],retain);});
test('cold foreign native getters cannot pass the private byte qualification witnesses',retain=>{coldModes(['tag-foreign-native','length-foreign-native'],retain);});
