import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,openSync,closeSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {projectCanonicalJsonArrayField} from '../canonical-json-array-fields.mjs';
import {prepareStreamingStaticEncoding} from '../prepare-streaming-static-encoding.mjs';
import {encodeStaticSourceStorage,encodeStaticSourceStorageIncremental,decodeStaticSourceStorage} from '../static-source-storage-codec.mjs';
import {encodeStaticSourceStorage as encodeLayout,encodeStaticSourceStorageIncremental as encodeLayoutIncremental,decodeStaticSourceStorage as decodeLayout} from '../static-source-layout-storage.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(source){const canonical=transportConcreteSyntaxSource(source,{language:'Rust'}).meta;return {schema:'router-static-source-lifecycle-v1',cases:{},profiles:[],current:{},lineage:[],sources:{[hash(source)]:{source,bytes:Buffer.byteLength(source),gitBlob:'0'.repeat(40),canonical}},authority:{semantic:false},trace:[]};}
function compare(bundle,raw=Buffer.from(JSON.stringify(bundle)+'\n')){for(const [old,current,decode]of [[encodeStaticSourceStorage,encodeStaticSourceStorageIncremental,decodeStaticSourceStorage],[encodeLayout,encodeLayoutIncremental,decodeLayout]]){const expected=old(bundle,raw),actual=current(bundle,raw);assert.deepEqual(actual,expected);assert.deepEqual(decode(actual.raw,{schema:bundle.schema,...(actual.storage?{storage:actual.storage}:{})}),bundle);}return raw;}

test('every actual bank source canonical lineage and layout byte equals the complete original encoders',{timeout:60000},()=>{
 const started=performance.now(),worker=fileURLToPath(new URL('./streaming-static-encoding-case-worker.mjs',import.meta.url)),original=readFileSync(worker),folder=mkdtempSync(join(tmpdir(),'router-complete-stream-encoding-')),receipts=[];writeFileSync(join(folder,'actual-complete-worker-source.mjs'),original,{flag:'wx'});
 for(const which of ['read','old-core','current-core','old-layout','current-layout','decode-core','decode-layout']){const output=join(folder,which);mkdirSync(output);const stdout=openSync(join(output,'stdout.raw.log'),'wx'),stderr=openSync(join(output,'stderr.raw.log'),'wx'),args=[worker,which,output,...(which==='read'?[]:[folder])],milliseconds=Math.min(25000,60000-Math.ceil(performance.now()-started)-1000);assert.ok(milliseconds>0);writeFileSync(join(output,'actual-command.json'),JSON.stringify({command:[process.execPath,...args],childMilliseconds:milliseconds,withinOriginalParentMilliseconds:60000,noRustTools:true})+'\n',{flag:'wx'});
  try{execFileSync(process.execPath,args,{timeout:milliseconds,stdio:['ignore',stdout,stderr]});}finally{closeSync(stdout);closeSync(stderr);assert.deepEqual(readFileSync(worker),original);}
  const receipt=JSON.parse(readFileSync(join(output,'receipt.json')));assert.equal(receipt.which,which);assert.equal(receipt.runtime.bun,process.versions.bun??null);assert.equal(receipt.sourceAuthority,false);if(which.startsWith('decode-'))assert.equal(receipt.completeOriginalDecoderInverse,true);assert.equal(receipt.rustExecuted,false);receipts.push(receipt);
  if(which.startsWith('current-')){const old=JSON.parse(readFileSync(join(folder,which.replace('current-','old-'),'receipt.json'))),before=gunzipSync(readFileSync(join(folder,which.replace('current-','old-'),'complete-encoded-raw.json.gz')),{maxOutputLength:256*1024*1024}),after=gunzipSync(readFileSync(join(output,'complete-encoded-raw.json.gz')),{maxOutputLength:256*1024*1024});assert.ok(after.equals(before),'complete original and current encoded bytes');assert.deepEqual(receipt.storage,old.storage);assert.equal(receipt.completeEncodedSha256,old.completeEncodedSha256);}
 }
 for(const receipt of receipts.slice(1))for(const field of ['logicalBytes','logicalSha256','inputArchiveSha256','sourceRows','canonicalRows'])assert.equal(receipt[field],receipts[0][field]);
});

test('canonical array spans and projected metadata equal independent native JSON across complete Unicode inputs',{timeout:60000},()=>{
 const values=[[],[null,true,false,0,-0,1e21],['猫😀','\ud800','\udfff','\u0000','"\\'],[[1,2],{nested:['unchanged']},[]]];
 for(let at=0;at<120;at++)values.push(Array.from({length:at%23},(_,index)=>['token','猫😀',index,index+1,index*4,index*4+4,0]));
 for(const nodes of values){const value={source:'complete',nodes,after:{nodes:['nested retained']}},source=JSON.stringify(value),projection=projectCanonicalJsonArrayField(source,'nodes');assert.ok(projection);assert.deepEqual(JSON.parse(projection.source),{...value,nodes:null});assert.deepEqual(projection.nodeSpans.map(span=>JSON.parse(source.slice(...span))),JSON.parse(source).nodes);assert.equal(source.slice(...projection.span),JSON.stringify(nodes));}
 for(const source of ['{}','[]','null','{"nodes":null}','{"nodes":{}}',' {"nodes":[]}','{"nodes":[1.0]}','{"nodes":[],"nodes":[]}','{"nodes":[1,]}','{"nodes":["\\u0061"]}','{"nodes":['.repeat(514)+'0'+']}'.repeat(514)])assert.equal(projectCanonicalJsonArrayField(source,'nodes'),null);
});

test('complete native source producer preserves old encoders and every original receiving case body',{timeout:60000},()=>{
 const plan=prepareStreamingStaticEncoding(),ts=ownershipCompiler();assert.equal(plan.files.length,4);
 const parse=(path,source)=>{const sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return sf;};
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);const before=parse(row.path,row.original),after=parse(row.path,row.after);
  if(row.path.endsWith('.test.mjs')){const cases=sf=>sf.statements.filter(ts.isExpressionStatement).map(n=>n.expression).filter(n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test').map(n=>n.getText(sf));assert.deepEqual(cases(after),cases(before));}
  else if(!row.path.endsWith('canonical-json-array-fields.mjs')){const current=new Map(after.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.text,n.getText(after)]));for(const n of before.statements.filter(ts.isFunctionDeclaration))assert.equal(current.get(n.name.text),n.getText(before));}
 }
 assert.equal(plan.allOriginalEncoderBodiesUnchanged,true);assert.equal(plan.completePerRowAndWholeStorageInversesRemain,true);assert.equal(plan.originalLimitsUnchanged,true);assert.equal(plan.additionalDataCallbackContract,true);assert.equal(plan.newAcrossInvocationCaches,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
});

test('incremental full storage has exact original bytes and complete native inverses for Unicode and alternate headers',{timeout:60000},()=>{
 for(const source of ['','\ufeffα😀\r\npub fn value()->u64{7}','// lone \ud800\udfff\npub fn value(){let text="猫";}','// '+('a😀 '.repeat(3000))+'\npub fn value(){}','pub fn large(){'+Array.from({length:3000},(_,at)=>'let value_'+at+'='+at+'u64;').join('')+'}\n']){const bundle=fixture(source);compare(bundle);const row=Object.values(bundle.sources)[0],doc=JSON.parse(row.canonical);row.canonical=JSON.stringify(Object.fromEntries(Object.entries(doc).reverse()));compare(bundle);}
});

test('unsupported original nodes and full raw-byte mismatches retain legacy decisions and refusals',{timeout:60000},()=>{
 for(const canonical of ['{malformed','{"nodes":[]}',null,17]){const bundle=fixture('pub fn value(){}');Object.values(bundle.sources)[0].canonical=canonical;compare(bundle);}
 const bundle=fixture('pub fn value()->u8{1}'),raw=Buffer.from(JSON.stringify(bundle)+'\n');for(const make of [bytes=>bytes.subarray(0,-1),bytes=>Buffer.concat([bytes,Buffer.from('\n')]),bytes=>{const copy=Buffer.from(bytes);copy[copy.indexOf('cases')]=67;return copy;}]){const bytes=make(raw);for(const encode of [encodeStaticSourceStorage,encodeStaticSourceStorageIncremental])assert.throws(()=>encode(bundle,bytes),/complete original logical payload/);}
});
