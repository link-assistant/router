// An explicitly different test-DATA API. No complete-CST/native proof is reused.
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {readStaticSourceLifecycle,staticSourceAssociatedTextData,staticSourceAssociatedContext} from './real-source-fixtures.mjs';
import {associatedOriginalParentInputs,associatedOriginalFileReader} from './associated-original-context.mjs';
import {encodeStaticSourceStorage,decodeStaticSourceStorage,decodeStaticSourceTextData} from '../static-source-storage-codec.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),ASSETS=fileURLToPath(new URL('../source-profiles/static-source-lifecycle/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex'),blob=value=>createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(value)}\0`)).update(value).digest('hex'),json=JSON.stringify;
const manifest=JSON.parse(readFileSync(new URL('./fixtures/outside-static-source-associations.json',import.meta.url),'utf8'));
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{const vectors=[];try{await run(t,(kind,value)=>{vectors.push({kind,value});return value;});}finally{const folder=process.env.ROUTER_ASSOCIATED_TEXT_DATA_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),{name,vectors},(_key,value)=>typeof value==='bigint'?{$bigint:String(value)}:value instanceof Map?{$map:[...value]}:value);}}});
function folderFor(t){const folder=mkdtempSync(join(tmpdir(),'router-associated-text-data-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));for(const path of ['manifest.json','originals.json.gz'])writeFileSync(join(folder,path),readFileSync(join(ASSETS,path)));return folder;}
function smallBank(){
 const before='pub fn selected()->u8{1}\n',after='pub fn selected()->u8{2}\n',a=hash(before),b=hash(after),file=(id,source)=>({path:'src/lib.rs',sourceId:id,bytes:Buffer.byteLength(source),gitBlob:blob(source)}),old=file(a,before),now=file(b,after),edit={span:[0,before.length],expected:before,replacement:after},inverse={span:[0,after.length],expected:after,replacement:before};
 const sources={[a]:{source:before,bytes:old.bytes,gitBlob:old.gitBlob,canonical:transportConcreteSyntaxSource(before,{language:'Rust'}).meta},[b]:{source:after,bytes:now.bytes,gitBlob:now.gitBlob,canonical:transportConcreteSyntaxSource(after,{language:'Rust'}).meta}};
 return {schema:'router-static-source-lifecycle-v1',cases:{},profiles:[{revision:'before',files:[old],sourceSetSha256:hash(json([old]))}],current:{files:[now],sourceSetSha256:hash(json([now]))},lineage:[{revision:'before',files:[{path:'src/lib.rs',status:'changed',before:old,after:now,edit,inverse,completeInverse:true}]}],sources,authority:{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false},trace:[]};
}

test('all six text projections authenticate both full historical universes and retain only original parents and Cargo',(_t,retain)=>{
 const full=readStaticSourceLifecycle();
 for(const entry of manifest.entries){
  const data=staticSourceAssociatedTextData(entry.id),profile=full.bundle.profiles.find(row=>row.revision===entry.revision),parents=[];
  assert.equal(data.authentication.sourceRows,Object.keys(full.bundle.sources).length);assert.equal(data.authentication.currentFiles,full.bundle.current.files.length);assert.equal(data.authentication.currentSourceSetSha256,full.bundle.current.sourceSetSha256);
  assert.deepEqual(data.authentication.historicalProfiles,full.bundle.profiles.map(row=>({revision:row.revision,files:row.files.length,bytes:row.files.reduce((sum,file)=>sum+file.bytes,0),sourceSetSha256:row.sourceSetSha256})));
  assert.deepEqual(Object.keys(data),['source','association','authentication','scope']);assert.equal(data.authentication.canonicalDocuments,false);assert.equal(data.authentication.logicalPayloadDigest,false);assert.equal(data.authentication.compilerAuthority,false);
  for(const path of [...entry.parents.map(row=>row.path),'Cargo.toml','Cargo.lock']){const row=profile.files.find(row=>row.path===path),source=data.source(path);assert.equal(source,full.bundle.sources[row.sourceId].source);assert.equal(Buffer.byteLength(source),row.bytes);assert.equal(hash(source),row.sourceId);parents.push({path,source});}
  assert.throws(()=>data.source('src/not-an-associated-parent.rs'),TypeError);retain(entry.id,{association:data.association,authentication:data.authentication,parents});
 }
});

test('the complete Copy parent enters a fresh ordinary checked project and both typed targets',async(_t,retain)=>{
 const data=staticSourceAssociatedTextData('copy-translation.test.mjs'),source=data.source('src/stream_termination.rs'),items=sourceItems(source),enumItem=items.find(row=>row.term==='enum'&&row.name==='FailureKind'),constant=items.find(row=>row.term==='const'&&row.name==='INCOMPLETE_STREAM_MESSAGE'),method=extractImplDeclarations(source).implementations.find(row=>row.typePath.join('.')==='FailureKind').methods.find(row=>row.name==='message');
 const input=[source.slice(enumItem.start,enumItem.end),source.slice(constant.start,constant.end),'impl FailureKind { '+source.slice(method.span.start,method.span.end)+' }',"pub fn message(kind:FailureKind)->&'static str{kind.message()}"].join('\n'),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>input});
 assert.equal(result.meta.checkedMethods.length,1);assert.equal(result.meta.checkedMethods[0].receiver,'value');retain('fresh-Copy-source-and-result',{source,input,method,result:{javascript:result.javascript,typescript:result.typescript,meta:result.meta}});
 await verifyTypedTargets(result,api=>{for(const [name,message]of [['Stalled','upstream stream stalled past the idle timeout before completion'],['Interrupted','upstream stream was interrupted before completion'],['Truncated','upstream stream ended before completion']])assert.equal(api.message(Object.freeze({$:name})),message);assert.throws(()=>api.message({$:'Stalled'}),TypeError);assert.throws(()=>api.message(Object.freeze({$:'Wrong'})),TypeError);},{childTimeoutMs:20000});
});

test('all four derive whole parents preserve exact original method spans with no compiler permission',(_t,retain)=>{
 const data=associatedOriginalParentInputs('derive-helper-originals.test.mjs'),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8')),parents=[];
 for(const pin of fixture.entries){const source=data.source(pin.path),implementations=extractImplDeclarations(source).implementations;assert.equal(hash(source),pin.sourceSha256);const methods=[];for(const method of pin.methods){const actual=implementations.find(row=>row.typePath.join('::')===method.owner)?.methods.find(row=>row.name===method.name);assert.ok(actual);assert.deepEqual(actual.span,method.span);assert.equal(actual.source,source.slice(method.span.start,method.span.end));assert.equal(hash(actual.source),method.sha256);methods.push(actual);}parents.push({pin,source,methods});}
 assert.deepEqual(Object.keys(data),['source']);assert.ok(data.source('Cargo.toml').includes('[package]'));assert.ok(data.source('Cargo.lock').includes('version ='));assert.throws(()=>data.source('src/lib.rs'),TypeError);retain('complete-original-derive-parents',{parents,manifest:data.source('Cargo.toml'),lock:data.source('Cargo.lock'),compilerAuthority:false});
});

test('unknown associations nonparents and source URL escapes stay explicit refusals',(_t,retain)=>{
 for(const value of ['unknown','copy-translation.test.mjs:copy',{id:'copy-translation.test.mjs'}])assert.throws(()=>staticSourceAssociatedTextData(value),TypeError);
 const data=staticSourceAssociatedTextData('copy-translation.test.mjs');for(const path of ['src/config.rs','../Cargo.toml','/tmp/Cargo.toml'])assert.throws(()=>data.source(path),TypeError);
 const read=associatedOriginalFileReader('copy-translation.test.mjs');assert.throws(()=>read('/tmp/not-original','utf8'),TypeError);assert.throws(()=>read(new URL('../../../src/stream_termination.rs',import.meta.url),'binary'),TypeError);assert.throws(()=>read(new URL('file:///tmp/stream_termination.rs'),'utf8'),TypeError);
 assert.equal(read(new URL('../../../src/stream_termination.rs',import.meta.url),'utf8'),data.source('src/stream_termination.rs'));retain('closed-input-domain',{association:data.association,authentication:data.authentication,noMetadataPermit:true});
});

test('recomputed archive hashes cannot authenticate mutations outside actual current Git', (t,retain)=>{
 const cases=[['manifest',folder=>{const path=join(folder,'manifest.json'),index=JSON.parse(readFileSync(path,'utf8'));index.current='0'.repeat(64);writeFileSync(path,json(index));}],['stored-bytes',folder=>{const path=join(folder,'originals.json.gz'),bytes=readFileSync(path);bytes[bytes.length-1]^=1;writeFileSync(path,bytes);}],['self-consistent-other-bank',folder=>{const bundle=smallBank(),raw=Buffer.from(json(bundle)+'\n'),packed=gzipSync(raw),index=JSON.parse(readFileSync(join(folder,'manifest.json'),'utf8'));delete index.storage;Object.assign(index,{bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,rawSha256:hash(raw)});writeFileSync(join(folder,'manifest.json'),json(index));writeFileSync(join(folder,'originals.json.gz'),packed);}]];
 for(const [label,mutate]of cases){const folder=folderFor(t);mutate(folder);assert.throws(()=>staticSourceAssociatedTextData('copy-translation.test.mjs',{folder}),/archive\/index differs from actual current Git/u);retain(label,{folder,refusal:'full current Git bytes required before source-data decode'});}
});

test('the source-only codec preserves complete strings and inverses while default CST decoding stays separate',(_t,retain)=>{
 const bank=smallBank(),raw=Buffer.from(json(bank)+'\n'),encoded=encodeStaticSourceStorage(bank,raw),index={schema:bank.schema,...(encoded.storage?{storage:encoded.storage}:{})},data=decodeStaticSourceTextData(encoded.raw,index),complete=decodeStaticSourceStorage(encoded.raw,index);
 assert.deepEqual(complete,bank);assert.deepEqual(data.bundle.lineage,bank.lineage);assert.deepEqual(Object.keys(data.bundle.sources),Object.keys(bank.sources));assert.deepEqual(Object.keys(data.bundle),['schema','cases','authority','profiles','current','sources','lineage']);assert.equal(Object.hasOwn(data.bundle,'trace'),false);assert.equal(Object.hasOwn(data.bundle,'columnTables'),false);
 for(const [id,row]of Object.entries(bank.sources)){assert.deepEqual(data.bundle.sources[id],{source:row.source,bytes:row.bytes,gitBlob:row.gitBlob});assert.equal(Object.hasOwn(data.bundle.sources[id],'canonical'),false);}
 assert.deepEqual(data.validation,{canonicalDocuments:false,logicalPayloadDigest:false,compilerAuthority:false});
 for(const mutate of [b=>{Object.values(b.sources)[0].source+=' ';},b=>{Object.values(b.sources)[0].bytes=8*1024**2+1;},b=>{const row=Object.values(b.sources)[0];row.gitBlob='foreign';},b=>{const [id,row]=Object.entries(b.sources)[0];delete b.sources[id];row.source='\ud800';row.bytes=Buffer.byteLength(row.source);row.gitBlob=blob(row.source);b.sources[hash(row.source)]=row;}]){const changed=JSON.parse(json(bank));mutate(changed);assert.throws(()=>decodeStaticSourceTextData(Buffer.from(json(changed)),{schema:bank.schema}),TypeError);}
 if(encoded.storage){const stored=JSON.parse(encoded.raw),id=Object.keys(stored.payload.sources)[0];stored.payload.sources[id].source=['router-source-delta-v1',id,0,0,''];assert.throws(()=>decodeStaticSourceTextData(Buffer.from(json(stored)),index),TypeError);}
 // This API deliberately is NOT complete CST validation. The untouched full
 // reader/codec suites independently retain every original malformed-CST test.
 const changed=JSON.parse(json(bank));Object.values(changed.sources)[0].canonical='not a CST';changed.trace=[{unreturnedCanonical:bank.sources[Object.keys(bank.sources)[0]].canonical}];const projected=decodeStaticSourceTextData(Buffer.from(json(changed)),{schema:bank.schema});assert.equal(projected.validation.canonicalDocuments,false);assert.equal(Object.hasOwn(Object.values(projected.bundle.sources)[0],'canonical'),false);assert.equal(Object.hasOwn(projected.bundle,'trace'),false);assert.equal(json(projected).includes('unreturnedCanonical'),false);
 retain('full-source-inverse-and-boundary',{bank,text:data,complete,unreturnedCanonicalExplicitlyUnvalidated:true});
});

test('missing physical source universes and late observable candidate mutations refuse', (t,retain)=>{
 const missing=mkdtempSync(join(tmpdir(),'router-text-data-missing-root-'));t.after(()=>rmSync(missing,{recursive:true,force:true}));execFileSync('/usr/bin/git',['init','--quiet',missing],{timeout:20000});assert.throws(()=>staticSourceAssociatedTextData('copy-translation.test.mjs',{root:missing}));
 const folder=folderFor(t),path=join(folder,'manifest.json'),prototype=Object.getPrototypeOf(createHash('sha256')),descriptor=Object.getOwnPropertyDescriptor(prototype,'update');let changed=false;
 try{Object.defineProperty(prototype,'update',{...descriptor,value:function(value,...args){if(!changed&&typeof value==='string'){changed=true;writeFileSync(path,readFileSync(path,'utf8')+'\n');}return Reflect.apply(descriptor.value,this,[value,...args]);}});assert.throws(()=>staticSourceAssociatedTextData('copy-translation.test.mjs',{folder}),/input identity changed before return/u);}
 finally{Object.defineProperty(prototype,'update',descriptor);}
 assert.equal(changed,true);assert.throws(()=>staticSourceAssociatedTextData('copy-translation.test.mjs',{folder}),/archive\/index differs from actual current Git/u);retain('late-input-mutation',{folder,changed,fullRawMutationRetainedByTestPath:true});
});

test('fresh calls reauthenticate storage and old complete context remains the native CST lane', (t,retain)=>{
 const folder=folderFor(t),first=staticSourceAssociatedTextData('copy-translation.test.mjs',{folder}),path=join(folder,'originals.json.gz'),original=readFileSync(path),altered=Buffer.from(original);altered[0]^=1;writeFileSync(path,altered);
 assert.throws(()=>staticSourceAssociatedTextData('copy-translation.test.mjs',{folder}),/archive\/index differs from actual current Git/u);writeFileSync(path,original);
 const second=staticSourceAssociatedTextData('copy-translation.test.mjs',{folder});assert.notStrictEqual(first,second);assert.notStrictEqual(first.source,second.source);assert.equal(first.source('src/stream_termination.rs'),second.source('src/stream_termination.rs'));
 // Keep the public full-context API present and distinct; the original full
 // outside/static suites execute it unchanged with every native CST guard.
 assert.equal(typeof staticSourceAssociatedContext,'function');assert.equal(Object.hasOwn(second,'lineage'),false);assert.equal(Object.hasOwn(second,'index'),false);retain('fresh-detached-plain-strings',{first:{association:first.association,authentication:first.authentication},second:{association:second.association,authentication:second.authentication},source:second.source('src/stream_termination.rs')});
});
