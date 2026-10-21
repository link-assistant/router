import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {Hash} from 'node:crypto';
import {proposeSourceBackedCoreFormattingCorpus} from '../source-backed-core-formatting.mjs';
import {iterateSourceBackedCoreFormattingCorpusPackets} from '../source-backed-formatting-packets.mjs';
import {prepareSourceBackedFormattingPackets} from '../prepare-source-backed-formatting-packets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const limits={timeout:60_000},root=new URL('../../../',import.meta.url),core={'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE};
const files=(body='pub fn message(name:&str)->String{format!("hello {name}")}',extra={})=>({'src/lib.rs':'pub mod translation_core;pub mod app;','src/app.rs':body,...core,...extra});
const cargo=()=>({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const completeJsonWire=value=>JSON.parse(JSON.stringify(value));
function collect(options){
 const iterator=iterateSourceBackedCoreFormattingCorpusPackets(options),groups=new Map();let completed;
 for(;;){const next=iterator.next();if(next.done){completed=next.value;break;}const event=next.value;assert.deepEqual(Object.keys(event),['section','ordinal','text']);assert.equal(typeof event.text,'string');assert.ok(event.text.endsWith('\n'));const rows=groups.get(event.section)??[];assert.equal(event.ordinal,rows.length);rows.push(JSON.parse(event.text));groups.set(event.section,rows);}
 iterator.verify();const metadata=groups.get('metadata')[0],substitutions={inputs:groups.get('inputs'),rows:groups.get('rows'),bindingInspections:groups.get('binding-inspections')??[],moduleEdges:groups.get('module-edges')[0],moduleDiagnostics:groups.get('module-diagnostics')[0]},proposal=Object.fromEntries(metadata.keys.map(key=>[key,Object.hasOwn(metadata.values,key)?metadata.values[key]:substitutions[key]]));return {proposal,completed};
}
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;
 if(row.mapping){for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}}
 else for(const edit of [...row.edits].reverse()){assert.equal(source.slice(...edit.span),edit.replacement);source=source.slice(0,edit.span[0])+edit.expected+source.slice(edit.span[1]);}assert.equal(source,row.before.source);
}
test('native packet preparation retains exact materialized source and complete source inverse',limits,()=>{
 const plan=prepareSourceBackedFormattingPackets();assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.allOriginalMaterializedFunctionsUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.sourceAuthority,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);assert.equal(row.after.includes('rows.push('),false);assert.ok(row.after.includes('inspections.set(path,encoded)'));}
});
test('detached formatting events reconstruct every original field status scope origin and refusal',limits,()=>{
 const input=files(undefined,{'src/untracked.rs':'pub fn ignored()->String{format!("untracked")}'});input['src/lib.rs']+='pub mod custom;#[cfg(test)]pub mod disabled;';input['src/custom.rs']='#[unknown]pub fn custom()->String{format!("no")}';input['src/disabled.rs']='pub fn disabled()->String{format!("off")}';
 const options={files:input},materialized=proposeSourceBackedCoreFormattingCorpus(options),streamed=collect(options);assert.deepEqual(streamed.proposal,completeJsonWire(materialized));assert.deepEqual(streamed.completed.summary,materialized.summary);assert.equal(streamed.completed.counts.rows,Object.keys(input).length);for(const row of streamed.proposal.rows)if(row.proposal)inverse(row.proposal);for(const row of streamed.proposal.bindingInspections)inverse(row);
 const reordered=collect({files:Object.fromEntries(Object.entries(input).reverse())});assert.deepEqual(reordered.proposal,completeJsonWire(materialized));
});
test('registered producer and Unicode helper inspection packets retain the complete materialized source equation',limits,()=>{
 const input=files('#[derive(serde::Serialize)]#[serde(rename_all="camelCase")]pub struct Marker{#[serde(rename="😀")]value:u8}pub fn message()->String{format!("ok")}'),options={files:input,dependencyInputs:cargo()},materialized=proposeSourceBackedCoreFormattingCorpus(options),streamed=collect(options);assert.deepEqual(streamed.proposal,completeJsonWire(materialized));assert.equal(materialized.summary.selectedFunctions,1);assert.equal(materialized.producerEffects.selections.length,1);for(const row of streamed.proposal.bindingInspections){inverse(row);assert.equal(row.before.source.length,row.after.source.length);}assert.ok(streamed.proposal.rows.find(row=>row.path==='src/app.rs').proposal.after.source.includes('#[serde(rename="😀")]'));
});
test('only proven inactive original items are removed from inspection while unknown cfg and active producer effects remain refused',limits,()=>{
 const body='pub fn message()->String{format!("ok")}',inactive='#[cfg(test)]mod tests{use unknown::*;unknown!();#[tokio::test]async fn original(){format!("test");}}',inactiveFunction='#[cfg(test)]pub fn disabled()->String{format!("disabled")}',input=files(body+inactiveFunction+inactive),materialized=proposeSourceBackedCoreFormattingCorpus({files:input}),streamed=collect({files:input});assert.deepEqual(streamed.proposal,completeJsonWire(materialized));
 const selected=materialized.rows.find(row=>row.path==='src/app.rs');assert.equal(selected.status,'proposed');assert.ok(selected.proposal.after.source.endsWith(inactive));assert.ok(selected.proposal.after.source.includes(inactiveFunction));assert.equal(materialized.summary.selectedFunctions,1);const inspection=materialized.bindingInspections.find(row=>row.path==='src/app.rs');assert.deepEqual(inspection.inactiveItems.map(row=>row.expected),[inactiveFunction,inactive]);assert.ok(inspection.inactiveItems.every(row=>row.condition.status==='inactive'));inverse(inspection);
 for(const source of [body+inactive.replace('#[cfg(test)]','#[cfg(unknown)]'),body+'unknown!();',body+'#[tokio::test]async fn active(){}']){const current=collect({files:files(source)}).proposal;assert.equal(current.rows.find(row=>row.path==='src/app.rs').status,'skipped',source);}
});
test('the complete JSON wire comparison rejects one mutated nested retained original source field',limits,()=>{
 const options={files:files()},expected=completeJsonWire(proposeSourceBackedCoreFormattingCorpus(options)),actual=collect(options).proposal;assert.deepEqual(actual,expected);
 const changed=completeJsonWire(actual),original=changed.rows.find(row=>row.path==='src/app.rs').scope.ancestors[0];assert.equal(original.source,options.files['src/lib.rs']);original.source+='\n// changed retained original source';assert.throws(()=>assert.deepEqual(changed,expected),assert.AssertionError);
});
test('unfinished streams own-data accessors and mutations between detached packets retain fresh source Cargo and option refusals',limits,()=>{
 const early=iterateSourceBackedCoreFormattingCorpusPackets({files:files()});assert.throws(()=>early.verify(),/unfinished/);early.next();early.return();assert.throws(()=>early.verify(),/unfinished/);
 let reads=0;const getter={};Object.defineProperty(getter,'files',{enumerable:true,get(){reads++;return files();}});assert.throws(()=>iterateSourceBackedCoreFormattingCorpusPackets(getter),/own data/);assert.equal(reads,0);
 for(const target of ['source','Cargo','options']){
  const input={files:files(),dependencyInputs:{manifest:'standalone source',lock:'standalone lock'}},iterator=iterateSourceBackedCoreFormattingCorpusPackets(input);assert.equal(iterator.next().done,false);
  if(target==='source')input.files['src/app.rs']+='\n';else if(target==='Cargo')input.dependencyInputs.lock+='\n';else input.entry='src/app.rs';assert.throws(()=>{while(!iterator.next().done){}},/changed/);
 }
 for(const target of ['source','Cargo']){
  const input={files:files(),dependencyInputs:{manifest:'standalone source',lock:'standalone lock'}},original=Hash.prototype.update;let changed=false;
  try{Hash.prototype.update=function(value,...args){if(!changed&&value===input.files['src/app.rs']){changed=true;if(target==='source')input.files['src/app.rs']+='\n';else input.dependencyInputs.lock+='\n';}return Reflect.apply(original,this,[value,...args]);};assert.throws(()=>collect(input),/changed/);}finally{Hash.prototype.update=original;}assert.equal(changed,true);
 }
});
test('the complete 256-function receiving case consumes every per-file packet and inverse without retaining proposal arrays',limits,()=>{
 const input={...core,'src/lib.rs':'pub mod translation_core;'},count=256;for(let at=0;at<32;at++){input['src/lib.rs']+='pub mod sample'+at+';';input['src/sample'+at+'.rs']=Array.from({length:8},(_,position)=>'pub fn value'+position+'()->String{format!("'+at+':'+position+' {}",'+position+'u8)}').join('\n');}
 const cursor=iterateSourceBackedCoreFormattingCorpusPackets({files:input}),initial=process.memoryUsage();let rows=0,selected=0,inspections=0,bytes=0,maximumPacket=0,peakObservedHeap=initial.heapUsed,peakObservedRss=initial.rss,finish;
 function receive(event){assert.equal(typeof event.text,'string');bytes+=Buffer.byteLength(event.text);maximumPacket=Math.max(maximumPacket,Buffer.byteLength(event.text));const row=JSON.parse(event.text);if(event.section==='rows'){rows++;if(row.proposal){selected+=row.proposal.functions.length;inverse(row.proposal);}}else if(event.section==='binding-inspections'){inspections++;inverse(row);}const memory=process.memoryUsage();peakObservedHeap=Math.max(peakObservedHeap,memory.heapUsed);peakObservedRss=Math.max(peakObservedRss,memory.rss);}
 for(;;){const next=cursor.next();if(next.done){finish=next.value;break;}receive(next.value);}cursor.verify();assert.equal(rows,Object.keys(input).length);assert.equal(selected,count);assert.equal(finish.summary.selectedFunctions,count);assert.equal(finish.summary.proposed,32);assert.equal(finish.counts.bindingInspections,inspections);assert.ok(bytes>maximumPacket);
 const receipt={schema:'formatting-packet-256-function-receiving-v1',functions:count,files:Object.keys(input).length,rows,inspections,packetBytes:bytes,maximumPacketBytes:maximumPacket,peakObservedHeapBytes:peakObservedHeap,peakObservedRssBytes:peakObservedRss,processResourceUsage:process.resourceUsage?.()??null,sampling:'between detached packets; process resource maxRSS where available; no forced GC',fullCorpusFitProved:false,sourceAuthority:false};const output=process.env.ROUTER_FORMATTING_PACKET_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,'256-functions.json'),JSON.stringify(receipt)+'\n');}
});
