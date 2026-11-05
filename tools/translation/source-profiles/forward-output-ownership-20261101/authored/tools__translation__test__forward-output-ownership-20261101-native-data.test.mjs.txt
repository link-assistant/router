// Independent source cases. SOURCE ONLY / UNRUN; no admission is inferred from
// locator DATA. Actual private producer cases below use original plan APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {locatePrivateNativeSource,readPrivateNativeSource} from '../forward-output-ownership-20261101-native-data.mjs';
import {planRegeneration,forwardRegenerationSourceEntries,verifyForwardRegenerationSourceInputs,validateRegenerationPlan} from '../bulk.mjs';

function fixture(run){
 const root=fs.mkdtempSync(join(os.tmpdir(),'router-forward-native-data-'));fs.mkdirSync(join(root,'src'));
 try{return run(root);}finally{fs.rmSync(root,{recursive:true,force:true});}
}
function retained(source,extra={}){return JSON.stringify({other:{source:'decoy',nested:[']','}',{concreteSyntaxMeta:{source:'wrong'}}]},...extra,concreteSyntaxMeta:{language:'Rust',source,nodes:[{text:'"\\'}]},tail:'after'});}

test('private DATA locator chooses the exact top-level full CST source',()=>{
 for(const source of ['', 'pub fn f() {}\n', '"\\\n\r\t\0😀', '/* { ] : source concreteSyntaxMeta */']){
  const text=retained(source),locator=locatePrivateNativeSource(text,source);
  assert.deepEqual(Object.keys(locator),['begin','finish']);assert.equal(readPrivateNativeSource(text,locator),source);assert.ok(Object.isFrozen(locator));
 }
});
test('DATA extraction does not accept another source or ambiguous/incomplete full object',()=>{
 assert.throws(()=>locatePrivateNativeSource(retained('a'),'b'));
 assert.throws(()=>locatePrivateNativeSource('{"concreteSyntaxMeta":{"source":"a"},"concreteSyntaxMeta":{"source":"a"}}','a'));
 assert.throws(()=>locatePrivateNativeSource('{"concreteSyntaxMeta":{"source":"a","source":"a"}}','a'));
 assert.throws(()=>locatePrivateNativeSource(retained('a').slice(0,-1),'a'));
 assert.throws(()=>readPrivateNativeSource(retained('a'),{begin:-1,finish:3}));
});
test('nested unrelated IR data is scanned without materializing its object graph',()=>{
 const source='pub fn a() -> i32 { 1 }\n',other=[];for(let at=0;at<50000;at++)other.push({source:'unrelated',items:['a','b',at]});
 const text=retained(source,{large:other}),locator=locatePrivateNativeSource(text,source);
 assert.equal(readPrivateNativeSource(text,locator),source);
});
test('public copied metadata and a forged output descriptor cannot manufacture an original private plan',()=>{
 assert.throws(()=>validateRegenerationPlan({schema:'checked-bulk-output-plan-v1',outputs:[],manifest:{concreteSyntaxMeta:{source:'pub fn forged() {}'}}}));
 assert.throws(()=>forwardRegenerationSourceEntries({schema:'checked-bulk-output-plan-v1',outputs:[]}));
});
test('genuine direct original plans retain exact invalid UTF-8 bytes despite identical decoded CST',()=>fixture(root=>{
 const file=join(root,'src/lib.rs'),suffix=Buffer.from('\npub fn value() -> i32 { 1 }\n');
 const original=Buffer.concat([Buffer.from('// '),Buffer.from([0x80]),suffix]);fs.writeFileSync(file,original);
 const plan=planRegeneration({root,sources:['src/lib.rs'],entries:[]});
 assert.equal(validateRegenerationPlan(plan),plan);assert.ok([...forwardRegenerationSourceEntries(plan)].length>0);
 fs.writeFileSync(file,Buffer.concat([Buffer.from('// '),Buffer.from([0x81]),suffix]));
 assert.equal(fs.readFileSync(file).toString('utf8'),original.toString('utf8'));
 assert.throws(()=>verifyForwardRegenerationSourceInputs(plan));
}));
test('genuine direct CST locators close actual source identities and complete bytes',()=>fixture(root=>{
 const file=join(root,'src/lib.rs');fs.writeFileSync(file,'pub fn value() -> i32 { 1 }\n');
 const plan=planRegeneration({root,sources:['src/lib.rs'],entries:[]});verifyForwardRegenerationSourceInputs(plan);
 const replacement=join(root,'src/replacement.rs');fs.writeFileSync(replacement,fs.readFileSync(file));fs.renameSync(replacement,file);
 assert.throws(()=>verifyForwardRegenerationSourceInputs(plan));
}));
test('direct empty selection remains valid without manufacturing an empty corpus',()=>fixture(root=>{
 const plan=planRegeneration({root,sources:[],entries:[]});assert.equal(plan.manifest.sources.length,0);verifyForwardRegenerationSourceInputs(plan);
}));
test('unused project limits retain the original ignored-option behavior without toJSON',()=>fixture(root=>{
 fs.writeFileSync(join(root,'src/lib.rs'),'pub fn value() -> u8 { 1 }\n');let calls=0;const ignored={};ignored.cycle=ignored;Object.defineProperty(ignored,'toJSON',{enumerable:true,get(){calls++;throw false;}});
 const plan=planRegeneration({root,sources:['src/lib.rs'],entries:[],projectMetaStorageLimits:ignored});assert.equal(calls,0);verifyForwardRegenerationSourceInputs(plan);assert.equal(calls,0);
}));
test('direct source bytes preserve the original domain beyond the corpus64Mi aggregate',{timeout:3600000},()=>fixture(root=>{
 const source='//'+'x'.repeat(1024*1024-3)+'\n',sources=[];assert.equal(Buffer.byteLength(source),1024*1024);
 for(let at=0;at<65;at++){const name='src/large_'+at+'.rs';sources.push(name);fs.writeFileSync(join(root,name),source);}
 const plan=planRegeneration({root,sources,entries:[]});assert.equal(plan.manifest.sources.length,65);verifyForwardRegenerationSourceInputs(plan);
}));
// This actual original planner workload is deliberately separate from the
// explicit-corpus20k domain. It must not be replaced by a source inventory test.
test('direct source selection preserves its original domain beyond corpus20k paths',{timeout:3600000},()=>fixture(root=>{
 const sources=[];for(let at=0;at<20001;at++){const name='src/unit_'+at+'.rs';sources.push(name);fs.writeFileSync(join(root,name),'// independent source '+at+'\n');}
 const plan=planRegeneration({root,sources,entries:[]});assert.equal(plan.manifest.sources.length,20001);verifyForwardRegenerationSourceInputs(plan);
}));
