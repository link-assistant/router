import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {types} from 'node:util';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {independentParserSha256} from '../private-parser-sha256.mjs';

const base=fileURLToPath(new URL('../',import.meta.url));
const BEFORE="// Independent SHA-256 for executable-source authentication. Node crypto calls\n// remain required separately; their observer-returned digest is not authority.\nimport {originalPrivateParserDescriptorCommonIntrinsicsUnchanged,originalPrivateParserUint32WorkStorageUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';\nconst initial=originalPrivateParserDescriptorCommonIntrinsicsUnchanged();\nconst uint32AtBirth=initial&&originalPrivateParserUint32WorkStorageUnchanged();\nconst privateUint32Constructor=uint32AtBirth?Object.getOwnPropertyDescriptor(globalThis,'Uint32Array').value:null;\nlet constants=null;\nfunction checked(){\n  if(!initial||!originalPrivateParserDescriptorCommonIntrinsicsUnchanged())throwOriginalCapturedTypeError('Independent parser SHA256 host operations changed');\n}\nconst rotate=(value,count)=>(value>>>count)|(value<<(32-count));\nexport function independentParserSha256(source){\n  checked();if(typeof source!=='string'||source.length>262144)throwOriginalCapturedTypeError('Independent parser SHA256 requires bounded primitive text');\n  // No round array exists until the genuine initial/live guard has succeeded.\n  // Constants and work arrays never reach crypto, callbacks or returned data.\n  if(!constants)constants=[\n    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,\n    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,\n    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,\n    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,\n    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,\n    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,\n    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,\n    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,\n  ];\n  // No callback occurs after checked(): only primitive bounds, literal constants\n  // and captured-native Uint32 eligibility precede the two private allocations.\n  const typed=privateUint32Constructor!==null&&originalPrivateParserUint32WorkStorageUnchanged();\n  const h=typed?new privateUint32Constructor(8):[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],words=typed?new privateUint32Constructor(64):[];\n  if(typed){h[0]=0x6a09e667;h[1]=0xbb67ae85;h[2]=0x3c6ef372;h[3]=0xa54ff53a;h[4]=0x510e527f;h[5]=0x9b05688c;h[6]=0x1f83d9ab;h[7]=0x5be0cd19;}\n  let pendingWord=0,pendingBytes=0,wordIndex=0,payloadBytes=0;\n  function compress(){\n    for(let at=16;at<64;at++){\n      const x=words[at-15],y=words[at-2];\n      const a=rotate(x,7)^rotate(x,18)^(x>>>3),b=rotate(y,17)^rotate(y,19)^(y>>>10);\n      words[at]=(words[at-16]+a+words[at-7]+b)>>>0;\n    }\n    let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],v=h[7];\n    for(let at=0;at<64;at++){\n      const sum=rotate(e,6)^rotate(e,11)^rotate(e,25),choice=(e&f)^(~e&g);\n      const t1=(v+sum+choice+constants[at]+words[at])>>>0;\n      const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;\n      v=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;\n    }\n    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;\n    h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+v)>>>0;\n  }\n  function emit(byte){\n    pendingWord=(pendingWord<<8)|byte;pendingBytes++;\n    if(pendingBytes===4){\n      words[wordIndex++]=pendingWord;pendingWord=0;pendingBytes=0;\n      if(wordIndex===16){compress();wordIndex=0;}\n    }\n  }\n  // Pack each complete UTF8 byte directly into the current 64-byte block.\n  // All16 input words are overwritten before each schedule/compression pass.\n  for(let at=0;at<source.length;at++){\n    let code=source.charCodeAt(at);\n    if(code>=55296&&code<=56319){\n      const low=at+1<source.length?source.charCodeAt(at+1):-1;\n      if(low<56320||low>57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');\n      code=65536+(code-55296)*1024+low-56320;at++;\n    }else if(code>=56320&&code<=57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');\n    if(code<128){emit(code);payloadBytes++;}\n    else if(code<2048){emit(192|(code>>>6));emit(128|(code&63));payloadBytes+=2;}\n    else if(code<65536){emit(224|(code>>>12));emit(128|((code>>>6)&63));emit(128|(code&63));payloadBytes+=3;}\n    else{emit(240|(code>>>18));emit(128|((code>>>12)&63));emit(128|((code>>>6)&63));emit(128|(code&63));payloadBytes+=4;}\n  }\n  if(payloadBytes>1048576)throwOriginalCapturedTypeError('Independent parser SHA256 byte budget');\n  const bits=payloadBytes*8;emit(128);\n  while(wordIndex*4+pendingBytes!==56)emit(0);\n  for(let at=0;at<4;at++)emit(0);\n  for(let shift=24;shift>=0;shift-=8)emit((bits>>>shift)&255);\n  let result='';const digits='0123456789abcdef';\n  for(let at=0;at<8;at++)for(let shift=28;shift>=0;shift-=4)result+=digits[(h[at]>>>shift)&15];\n  checked();return result;\n}\n";
const shaPath=join(base,'private-parser-sha256.mjs'),manifestPath=join(base,'source-profiles/private-parser-execution/manifest.json');
const nativeHash=value=>createHash('sha256').update(value).digest('hex');
const current=fs.readFileSync(shaPath,'utf8');
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};
function retain(name,value){const root=process.env.ROUTER_ASCII_SHA_VECTOR_DIR;if(root){fs.mkdirSync(root,{recursive:true});fs.writeFileSync(join(root,name+'.json.gz'),gzipSync(JSON.stringify(value)));}}
function scratch(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-ascii-sha-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
async function pair(t){
  const root=scratch(t),witnesses=[];
  async function copy(source,label){
    const before="from './original-json-intrinsics.mjs'",after='from '+JSON.stringify(pathToFileURL(join(base,'original-json-intrinsics.mjs')).href);
    assert.equal(source.split(before).length,2);const copied=source.replace(before,after),path=join(root,label+'.mjs');fs.writeFileSync(path,copied);
    const reversed=copied.replace(after,before),readback=fs.readFileSync(path,'utf8');witnesses.push({label,source,copied,reversed,readback});assert.equal(reversed,source);assert.equal(readback,copied);
    return import(pathToFileURL(path).href);
  }
  const before=await copy(BEFORE,'before'),after=await copy(current,'after');return {root,before,after,witnesses};
}
function rows(pair,inputs){return inputs.map(row=>({...row,before:outcome(()=>pair.before.independentParserSha256(row.source)),after:outcome(()=>pair.after.independentParserSha256(row.source)),production:outcome(()=>independentParserSha256(row.source)),native:nativeHash(row.source)}));}
function assertValid(actual){for(const row of actual){assert.deepEqual(row.before,{value:row.native},row.label);assert.deepEqual(row.after,row.before,row.label);assert.deepEqual(row.production,row.before,row.label);}}

test('full previous helper plus independent native known vectors remain exact',{timeout:60000},async t=>{
  const p=await pair(t),inputs=[{label:'empty',source:'',expected:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'},{label:'abc',source:'abc',expected:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'},{label:'NIST-two-block',source:'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',expected:'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'},{label:'whole-before-source',source:BEFORE},{label:'whole-current-source',source:current}];
  const actual=rows(p,inputs);retain('01-complete-known-vectors',{BEFORE,beforeSha256:nativeHash(BEFORE),current,witnesses:p.witnesses,actual});assertValid(actual);for(const row of actual)if(row.expected)assert.equal(row.native,row.expected);
});
test('all64 block offsets and 55 56 63 64 65 padding lengths match the complete old algorithm',{timeout:60000},async t=>{
  const p=await pair(t),inputs=[];for(let offset=0;offset<64;offset++)for(const length of [0,1,2,3,4,55,56,63,64,65])inputs.push({label:`offset-${offset}-tail-${length}`,source:'P'.repeat(offset)+'abcd'.repeat(Math.ceil(length/4)).slice(0,length)});
  const actual=rows(p,inputs);retain('02-all64-ascii-offsets',{actual});assert.equal(actual.length,640);assertValid(actual);
});
test('NUL every ASCII byte and long bounded text preserve all complete input bytes',{timeout:60000},async t=>{
  const p=await pair(t),ascii=Array.from({length:128},(_,at)=>String.fromCharCode(at)).join(''),inputs=[];
  for(const offset of [0,1,2,3,60,61,62,63])inputs.push({label:'all-ascii-'+offset,source:'x'.repeat(offset)+ascii+'\0\0\0\0abcd\0'});
  for(const length of [4095,4096,4097,65535,65536,262144])inputs.push({label:'bounded-'+length,source:'a'.repeat(length)});
  const actual=rows(p,inputs);retain('03-complete-ascii-and-max',{ascii,actual});assertValid(actual);
});
test('multibyte and valid surrogate transitions at all64 offsets preserve UTF8 alignment',{timeout:60000},async t=>{
  const p=await pair(t),inputs=[];for(let offset=0;offset<64;offset++)for(const middle of ['\u007f\u0080','\u07ff\u0800','Ω','😀','\udbff\udfff','\uFEFF\r\n','aΩbc😀d\0'])inputs.push({label:`offset-${offset}-${JSON.stringify(middle)}`,source:'x'.repeat(offset)+middle+'0123456789abcdef'.repeat(5)});
  const actual=rows(p,inputs);retain('04-complete-unicode-offsets',{actual});assert.equal(actual.length,448);assertValid(actual);
});
test('malformed surrogate and primitive-input refusals remain exact and never coerce callers',{timeout:60000},async t=>{
  const p=await pair(t),invalid=[];for(let offset=0;offset<64;offset++)for(const middle of ['\ud800','\udfff','\ud800x','\ud800\ud800','\udfff\ud800'])invalid.push({label:`offset-${offset}-${JSON.stringify(middle)}`,source:'x'.repeat(offset)+middle+'abcd'});
  const actual=invalid.map(row=>({...row,before:outcome(()=>p.before.independentParserSha256(row.source)),after:outcome(()=>p.after.independentParserSha256(row.source)),production:outcome(()=>independentParserSha256(row.source))}));
  let callbacks=0;const hostile={toString(){callbacks++;throw Error('coercion');}},proxy=new Proxy({},{get(){callbacks++;throw Error('proxy');}}),argumentsRows=[null,1,new String('abc'),hostile,proxy,'x'.repeat(262145)].map(input=>({kind:typeof input,before:outcome(()=>p.before.independentParserSha256(input)),after:outcome(()=>p.after.independentParserSha256(input))}));
  retain('05-complete-refusals',{actual,argumentsRows,callbacks});for(const row of actual){assert.match(row.before.error.message,/well-formed UTF16/);assert.deepEqual(row.after,row.before);assert.deepEqual(row.production,row.before);}for(const row of argumentsRows){assert.ok(row.before.error);assert.deepEqual(row.after,row.before);}assert.equal(callbacks,0);
});
test('actual typed work and synchronous cold and live array fallback use the same word algorithm',{timeout:60000},async t=>{
  const root=scratch(t),witnesses=[],factories=[];
  for(const [label,source]of [['before',BEFORE],['after',current]]){
    const lines=source.split('\n'),importLine=lines.find(line=>line.startsWith('import '));assert.ok(importLine);const marker='/* bound original import: SHA322 */';let body=source.replace(importLine,marker);assert.equal(body.split('export function independentParserSha256').length,2);body=body.replace('export function independentParserSha256','function independentParserSha256');
    const point='  let pendingWord=0,pendingBytes=0,wordIndex=0,payloadBytes=0;',probe='  __record(typed,h,words);\n';assert.equal(body.split(point).length,2);body=body.replace(point,probe+point);
    const relocated=importLine.replace("'./original-json-intrinsics.mjs'",JSON.stringify(pathToFileURL(join(base,'original-json-intrinsics.mjs')).href)),prefix=relocated+"\nimport {types} from 'node:util';\nconst __rows=[],__apply=Reflect.apply,__length=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint32Array.prototype),'length').get;\nfunction __record(typed,h,words){__rows.push(typed?{typed,hBrand:types.isUint32Array(h),wordsBrand:types.isUint32Array(words),hLength:__apply(__length,h,[]),wordsLength:__apply(__length,words,[])}:{typed});}\nexport const workRows=__rows;\nexport function createCompleteSourceSha322(){\n'use strict';\n",suffix='\nreturn {independentParserSha256};\n}\n',copied=prefix+body+suffix,path=join(root,label+'-factory.mjs');
    let reversed=copied.slice(prefix.length,-suffix.length).replace(probe+point,point).replace('function independentParserSha256','export function independentParserSha256');reversed=reversed.replace(marker,importLine);assert.equal(reversed,source);fs.writeFileSync(path,copied);assert.equal(fs.readFileSync(path,'utf8'),copied);witnesses.push({label,source,prefix,suffix,copied,reversed});factories.push(await import(pathToFileURL(path).href));
  }
  const source='abcd'.repeat(33)+'Ω😀\0abc',expected=nativeHash(source),field=Object.getOwnPropertyDescriptor(globalThis,'Uint32Array'),records=[];let callbacks=0;
  for(const factory of factories){const warm=factory.createCompleteSourceSha322(),start=factory.workRows.length,ordinary=outcome(()=>warm.independentParserSha256(source));let live,cold,coldResult;
    try{Object.defineProperty(globalThis,'Uint32Array',{get(){callbacks++;throw Error('optional constructor getter');},configurable:true});live=outcome(()=>warm.independentParserSha256(source));cold=factory.createCompleteSourceSha322();coldResult=outcome(()=>cold.independentParserSha256(source));}
    finally{Object.defineProperty(globalThis,'Uint32Array',field);}
    const restored=outcome(()=>warm.independentParserSha256(source)),coldRestored=outcome(()=>cold.independentParserSha256(source));records.push({ordinary,live,coldResult,restored,coldRestored,coverage:factory.workRows.slice(start)});
  }
  retain('06-full-typed-fallback-factories',{witnesses,source,expected,records,callbacks});assert.equal(callbacks,0);for(const row of records){for(const key of ['ordinary','live','coldResult','restored','coldRestored'])assert.deepEqual(row[key],{value:expected});assert.deepEqual(row.coverage,[{typed:true,hBrand:true,wordsBrand:true,hLength:8,wordsLength:64},{typed:false},{typed:false},{typed:true,hBrand:true,wordsBrand:true,hLength:8,wordsLength:64},{typed:false}]);}
});
async function executors(t){
  const p=await pair(t),manifestSource=fs.readFileSync(manifestPath,'utf8'),manifest=JSON.parse(manifestSource),source=fs.readFileSync(join(base,'private-parser-execution.mjs'),'utf8'),copies=[];
  for(const label of ['before','after']){
    const root=join(p.root,'executor-'+label);fs.mkdirSync(join(root,'source-profiles/private-parser-execution'),{recursive:true});fs.writeFileSync(join(root,'source-profiles/private-parser-execution/manifest.json'),manifestSource);
    const files=[];for(const row of [...manifest.sources,...manifest.licenses,...manifest.notices,...manifest.hostInputs]){const bytes=fs.readFileSync(join(base,row.path));assert.equal(bytes.length,row.bytes);assert.equal(nativeHash(bytes),row.sha256);fs.mkdirSync(dirname(join(root,row.path)),{recursive:true});fs.writeFileSync(join(root,row.path),bytes);files.push({row,base64:bytes.toString('base64')});}
    const replacements=[["from './private-parser-sha256.mjs'",'from '+JSON.stringify(pathToFileURL(join(p.root,label+'.mjs')).href)],["from './original-json-intrinsics.mjs'",'from '+JSON.stringify(pathToFileURL(join(base,'original-json-intrinsics.mjs')).href)] ];let copied=source;
    for(const [before,after]of replacements){assert.equal(copied.split(before).length,2);copied=copied.replace(before,after);}let reversed=copied;for(const [before,after]of [...replacements].reverse())reversed=reversed.replace(after,before);assert.equal(reversed,source);
    const path=join(root,'private-parser-execution.mjs');fs.writeFileSync(path,copied);assert.equal(fs.readFileSync(path,'utf8'),copied);copies.push({label,source,copied,reversed,replacements,manifestSource,files,module:await import(pathToFileURL(path).href)});
  }
  return copies;
}
function observe(module,action){
  const update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),read=Object.getOwnPropertyDescriptor(fs,'readSync'),hashTape=[],readTape=[];let result;
  try{Object.defineProperty(Hash.prototype,'update',{...update,value:function(input,...args){hashTape.push(typeof input==='string'?{kind:'string',source:input}:{kind:'bytes',base64:Buffer.from(input).toString('base64')});return Reflect.apply(update.value,this,[input,...args]);}});Object.defineProperty(fs,'readSync',{...read,value:function(...args){const count=Reflect.apply(read.value,this,args);readTape.push({count,argCount:args.length,thisUndefined:this===undefined,offset:args[2],length:args[3],position:args[4],base64:Buffer.from(args[1]).subarray(args[2],args[2]+count).toString('base64')});return count;}});result=outcome(()=>action(module));}
  finally{Object.defineProperty(Hash.prototype,'update',update);Object.defineProperty(fs,'readSync',read);}
  return {result,hashTape,readTape};
}
test('actual complete authentication preserves all60 native hash inputs and full read argument tapes',{timeout:60000},async t=>{
  const copies=await executors(t),source='pub fn ascii_word(value: u32)->u32 { value + 7 }',observations=copies.map(copy=>observe(copy.module,module=>module.lexPrivateConcreteSource(source,'Rust')));
  retain('07-full-authentication-tapes',{copies:copies.map(({module,...copy})=>copy),source,observations});assert.deepEqual(observations[1],observations[0]);assert.ok(observations[0].result.value);assert.equal(observations[0].hashTape.length,60);assert.ok(observations[0].readTape.length>0);for(const row of observations[0].readTape){assert.equal(row.argCount,5);assert.equal(row.thisUndefined,true);}
});
test('actual hash-time charCodeAt mutation still refuses before its getter and restored execution succeeds',{timeout:60000},async t=>{
  const copies=await executors(t),source='pub fn after_restore()->u32 { 7 }',update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),char=Object.getOwnPropertyDescriptor(String.prototype,'charCodeAt'),records=[];
  for(const copy of copies){let callbacks=0,hashCalls=0,result;
    try{Object.defineProperty(Hash.prototype,'update',{...update,value:function(input,...args){const value=Reflect.apply(update.value,this,[input,...args]);hashCalls++;if(hashCalls===1)Object.defineProperty(String.prototype,'charCodeAt',{get(){callbacks++;throw Error('forbidden charCodeAt getter');},configurable:true});return value;}});result=outcome(()=>copy.module.lexPrivateConcreteSource(source,'Rust'));}
    finally{Object.defineProperty(Hash.prototype,'update',update);Object.defineProperty(String.prototype,'charCodeAt',char);}
    const restored=observe(copy.module,module=>module.lexPrivateConcreteSource(source,'Rust'));records.push({callbacks,hashCalls,result,restored});
  }
  retain('08-hash-time-refusal-and-restoration',{source,records});assert.deepEqual(records[1],records[0]);for(const row of records){assert.equal(row.callbacks,0);assert.ok(row.hashCalls>0);assert.match(row.result.error.message,/changed/);assert.ok(row.restored.result.value);assert.equal(row.restored.hashTape.length,60);}
});
