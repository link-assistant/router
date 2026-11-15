import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {composeUnitPrivacyApplicationSources,restoreUnitPrivacySourceHistory} from './fixtures/unit-privacy-source-composition.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function application(){
 const packed=readFileSync(new URL('../source-profiles/core-unit-matches/application.json.gz',import.meta.url));
 assert.equal(hash(packed),'b7c0ebc842ab8c710abdfd19111ac1e4e487d8ddfcb075559bbd1c12c64443e0');
 const raw=gunzipSync(packed,{maxOutputLength:16000000});assert.equal(hash(raw),'df6c21e737df57e67d9580a6a6edc624350de0800a2cb87b9ed7c68b66dea2ec');
 return JSON.parse(raw);
}
test('all complete privacy parents and added module retain physical bytes phase inverses and original packet',{timeout:60000},()=>{
 const packet=application(),original=JSON.stringify(packet),rows=composeUnitPrivacyApplicationSources(packet);
 assert.equal(Object.keys(rows).length,8);assert.equal(JSON.stringify(packet),original);
 for(const [path,row]of Object.entries(rows)){
  assert.equal(row.semanticAuthority,false);assert.equal(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),row.source);
  assert.equal(row.equation.afterSha256,hash(row.source));assert.equal(row.equation.inverse,row.historicalSource);
  assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.historicalSource);assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.source);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
 }
 assert.equal(rows['rust/src/geolocation.rs'].added,true);assert.equal(rows['rust/src/geolocation.rs'].historicalSource,'');
 assert.equal(Object.values(rows).filter(row=>row.added).length,1);
 assert.equal(Object.values(rows).reduce((total,row)=>total+row.trace.length,0),12);
});
test('complete privacy joins refuse altered missing duplicated and unknown historical parents',{timeout:60000},()=>{
 for(const change of [packet=>packet.files.find(row=>row.path==='rust/src/account_routing_policy.rs').source+=' ',packet=>packet.files.pop(),packet=>packet.files[0]=packet.files[1]]){
  const packet=application();change(packet);assert.throws(()=>composeUnitPrivacyApplicationSources(packet),/complete original application|complete pinned privacy parent/i);
 }
 const packet=application(),row=packet.files.find(row=>row.path==='rust/src/account_routing_policy.rs');row.source+=' ';row.sha256=hash(row.source);
 assert.throws(()=>composeUnitPrivacyApplicationSources(packet),/complete pinned privacy parent/);
});
test('historical receiving comparisons restore only exact complete privacy sources and retain the current source',{timeout:10000},()=>{
 const path='rust/src/native_service_relay.rs',source=readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),records=[];
 const historical=restoreUnitPrivacySourceHistory(path,source,(name,value)=>records.push({name,value}));
 assert.equal(hash(historical),'5ef693242ff7081a899872ba1a9f19e540a982102670eaa6c01a14b88d7b7e69');
 assert.equal(hash(source),'28c33a558c9112da0f40ab532bcdd9f647af8dff737d4a7b076e4dff80d1191b');
 assert.equal(records.length,1);const row=records[0].value;
 assert.equal(row.current,source);assert.equal(row.historical,historical);assert.equal(row.semanticAuthority,false);
 assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,historical);
 assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,source);
 assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(restoreUnitPrivacySourceHistory(path,historical),historical);
 assert.equal(restoreUnitPrivacySourceHistory('unrelated.rs','unchanged'), 'unchanged');
 for(const unknown of [source+'\n',source.slice(1),source+source])assert.throws(()=>restoreUnitPrivacySourceHistory(path,unknown),/unregistered complete current privacy source/);
 let calls=0;assert.throws(()=>restoreUnitPrivacySourceHistory(path,source,{}),/callback required/);assert.equal(calls,0);
 const failure=new Error('retention callback failed');assert.throws(()=>restoreUnitPrivacySourceHistory(path,source,()=>{calls++;throw failure;}),error=>error===failure);assert.equal(calls,1);
});
