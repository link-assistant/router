import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareGuardedProofLexing,assertGuardedProofLexingInputsFresh} from '../prepare-guarded-proof-lexing.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),common=new URL('../original-json-intrinsics.mjs',import.meta.url).href;
const urls={original:new URL('../original-lexing-intrinsics.mjs',import.meta.url).href,guarded:new URL('../guarded-proof-lexing-intrinsics.mjs',import.meta.url).href,freezer:new URL('../private-data-freeze.mjs',import.meta.url).href};
const hash=value=>createHash('sha256').update(value).digest('hex'),json=JSON.stringify;
const legacy="const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};";
function retain(name,value){const directory=process.env.ROUTER_GUARDED_PROOF_LEXING_VECTORS;if(!directory)return;mkdirSync(directory,{recursive:true});const bytes=Buffer.from(json(value)+'\n');assert.ok(bytes.length<=64*1024*1024);const path=join(directory,name+'.json.gz');writeFileSync(path,gzipSync(bytes),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}),bytes);}
function child(name,code){
 const program=code+"\nconst {gzipSync}=await import('node:zlib');process.stdout.write(gzipSync(JSON.stringify(report)));";let wire;
 try{wire=execFileSync(process.execPath,['--input-type=module','--eval',program],{timeout:10000,maxBuffer:8*1024*1024});}catch(error){retain(name+'-failed',{program,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64')});throw error;}
 const bytes=gunzipSync(wire,{maxOutputLength:64*1024*1024}),report=JSON.parse(bytes.toString('utf8'));retain(name,{program,wire:{bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')},report});return report;
}
function cold(subject,key){return child('cold-'+subject+'-'+key,[
 'await import('+json(common)+');',
 'const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,owner='+(key==='get'?'WeakMap.prototype':'Object')+',key='+json(key)+',prior=descriptor(owner,key),tape=[];let subject;',
 "try{define(owner,key,{...prior,value(...args){tape.push({key,args:args.map(value=>typeof value==='function'?{name:value.name,text:Function.prototype.toString.call(value)}:typeof value==='object'?'object':value)});return apply(prior.value,this,args);}});subject=await import("+json(urls[subject])+");}finally{define(owner,key,prior);}",
 legacy,
 subject==='freezer'?'const input={child:{v:1}},read=subject.createCompletedDataFreezer(freeze),result={same:read(input)===input,rootFrozen:Object.isFrozen(input),childFrozen:Object.isFrozen(input.child)};':'const result={guards:[subject.originalLexingIntrinsicsUnchanged(),subject.originalBatchedLexingIntrinsicsUnchanged()]};',
 'const report={tape,result};',
 ].join('\n'));}

test('complete guarded module and only two private imports retain all native bodies phases CST and whole inverses',{timeout:60000},()=>{
 const proposal=prepareGuardedProofLexing({root});assert.equal(proposal.files.length,3);assert.equal(proposal.originalLexingModuleUnchanged,true);assert.equal(proposal.privateConsumerBodiesUnchanged,true);assert.equal(proposal.newCaches,false);assert.equal(proposal.runtimeQualified,false);
 for(const row of proposal.files){assert.equal(readFileSync(join(root,row.path),'utf8'),row.text);assert.equal(row.inverse,row.source);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);assert.equal(stage.inverse,stage.source);let inverse=stage.text;for(const edit of [...stage.edits].reverse()){assert.equal(inverse.slice(edit.afterStart,edit.afterEnd),edit.after);inverse=inverse.slice(0,edit.afterStart)+edit.before+inverse.slice(edit.afterEnd);}assert.equal(inverse,stage.source);}}
 const guarded=proposal.files[0];assert.equal(readFileSync(join(root,guarded.origin),'utf8'),guarded.source);assert.ok(guarded.nativeFactory.firstStatement.startsWith('if(!originalBatchedDataFreezeIntrinsicsUnchanged())'));for(const row of proposal.files.slice(1)){assert.equal(row.stages[0].edits.length,0);assert.equal(row.stages[1].edits.length,1);assert.equal(row.stages[1].edits[0].before,"'./original-lexing-intrinsics.mjs'");assert.equal(row.stages[1].edits[0].after,"'./guarded-proof-lexing-intrinsics.mjs'");}assert.equal(assertGuardedProofLexingInputsFresh(proposal),true);retain('complete-source-proposal',proposal);
});

test('healthy fresh guarded factory exposes the exact original function bodies names signatures and true guards',{timeout:60000},()=>{
 const reports=[];for(const name of ['original','guarded'])reports.push(child('healthy-'+name,'await import('+json(common)+');const subject=await import('+json(urls[name])+');const names=Object.keys(subject),report={names,guards:names.map(name=>subject[name]()),lengths:names.map(name=>subject[name].length),sources:names.map(name=>Function.prototype.toString.call(subject[name]))};'));
 assert.deepEqual(reports[1],reports[0]);assert.deepEqual(reports[1].guards,[true,true]);assert.deepEqual(reports[1].lengths,[0,0]);
});

for(const key of ['getOwnPropertyDescriptor','get'])test('cold '+key+' observation closes eligibility before original reflective initialization and keeps full freezer workload',{timeout:60000},()=>{
 const original=cold('original',key),guarded=cold('guarded',key),freezer=cold('freezer',key);
 assert.deepEqual(guarded.result,original.result);assert.deepEqual(guarded.result,{guards:[false,false]});assert.deepEqual(guarded.tape,[]);assert.deepEqual(freezer.tape,[]);assert.deepEqual(freezer.result,{same:true,rootFrozen:true,childFrozen:true});
 if(key==='getOwnPropertyDescriptor')assert.ok(original.tape.length>0,'the exact original initializer must expose the observed regression');else assert.deepEqual(original.tape,[]);
});

test('late descriptor WeakMap species and inherited toJSON changes refuse freshly without invoking hooks and restoration reopens guards',{timeout:60000},()=>{
 const report=child('late-hooks',`await import(${json(common)});const subject=await import(${json(urls.guarded)}),descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,tape=[],rows=[];
const healthy=()=>[subject.originalLexingIntrinsicsUnchanged(),subject.originalBatchedLexingIntrinsicsUnchanged()];
for(const channel of ['descriptor','weak-get','species','toJSON']){
 const before=healthy(),owner=channel==='descriptor'?Object:channel==='weak-get'?WeakMap.prototype:channel==='species'?Array:Object.prototype,key=channel==='descriptor'?'getOwnPropertyDescriptor':channel==='weak-get'?'get':channel==='species'?Symbol.species:'toJSON',prior=descriptor(owner,key);
 try{if(channel==='species'||channel==='toJSON')define(owner,key,{configurable:true,get(){tape.push({channel,operation:'getter'});throw Error('unexpected getter');}});else define(owner,key,{...prior,value(...args){tape.push({channel,args:args.map(value=>typeof value)});return apply(prior.value,this,args);}});rows.push({channel,before,during:healthy()});}finally{if(prior)define(owner,key,prior);else delete owner[key];}rows.at(-1).after=healthy();
}
const report={rows,tape};`);
 assert.deepEqual(report.tape,[]);assert.equal(report.rows.length,4);for(const row of report.rows){assert.deepEqual(row.before,[true,true]);assert.deepEqual(row.during,[false,false]);assert.deepEqual(row.after,[true,true]);}
});

test('source producer refuses unknown exported guards and changed private bindings and retains exact physical freshness',{timeout:60000},t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-guarded-lexing-refusal-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const put=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
 const path='tools/translation/original-lexing-intrinsics.mjs',source=readFileSync(join(root,path),'utf8');put(path,source+'\nexport function unrelatedGuard(){return true;}\n');assert.throws(()=>prepareGuardedProofLexing({root:directory}),/complete original lexing declarations\/imports differ/);
 put(path,source);const privatePath='tools/translation/private-native-proof-json.mjs',privateSource=readFileSync(join(root,privatePath),'utf8').replace('import {originalBatchedLexingIntrinsicsUnchanged}', 'import {originalBatchedLexingIntrinsicsUnchanged as unprovedGuard}');put(privatePath,privateSource);assert.throws(()=>prepareGuardedProofLexing({root:directory}),/actual original private lexing binding required/);
 const inputs=[{path,source,bytes:Buffer.byteLength(source),sha256:hash(source)}];assert.equal(assertGuardedProofLexingInputsFresh({root:directory,inputs}),true);put(path,source+' ');assert.throws(()=>assertGuardedProofLexingInputsFresh({root:directory,inputs}),/physical input changed/);
});
