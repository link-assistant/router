import test from 'node:test';
import assert from 'node:assert/strict';
import {createRustConcreteSyntaxStage,createRustConcreteSyntaxStages} from '../forward-concrete-syntax.mjs';
import {readRustConcreteSyntaxMeta} from '../forward-concrete-syntax.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';

test('bounded ingress retains every complete source and independent CST inverse across partitions',{timeout:60000},()=>{
 const sources=Array.from({length:258},(_,at)=>`// Ω😀 ${at}\r\npub fn f${at}()->u8{7u8}\r\n`);
 sources.splice(20,0,'// '+ 'x'.repeat(66000)+'\n');
 const stages=createRustConcreteSyntaxStages(sources);
 assert.equal(stages.length,sources.length);
 for(let at=0;at<sources.length;at++){
  assert.equal(stages[at].source,sources[at]);
  assert.equal(stages[at].document.source,sources[at]);
 }
 for(const at of [0,20,255,256,stages.length-1]){
  assert.deepEqual(stages[at],createRustConcreteSyntaxStage(sources[at]));
  assert.equal(readRustConcreteSyntaxMeta(JSON.stringify(stages[at].document)).source,sources[at]);
 }
});

test('dense batches retain complete original documents without raising any original bound',{timeout:60000},()=>{
 const source='a '.repeat(40000),expected=createRustConcreteSyntaxStage(source);
 const stages=createRustConcreteSyntaxStages([source,source,source]);
 assert.equal(stages.length,3);for(const stage of stages)assert.deepEqual(stage,expected);
 assert.throws(()=>createRustConcreteSyntaxStages([' '.repeat(2097153)]),TypeError);
});

test('only reachable physical files cross ingress and inline views retain original coordinates',{timeout:60000},()=>{
 const files={
  'src/lib.rs':'// full Ω😀\r\nmod child;#[cfg(test)]mod absent;mod nested{pub fn value()->u8{9u8}}\r\n',
  'src/child.rs':'pub fn value()->u8{7u8}\n',
  'src/absent.rs':'invalid }',
 };
 const calls=[],events=[],graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),compilationProfile:PRODUCTION_PROFILE,readSource(file){calls.push(file);return files[file];}},row=>events.push(row));
 assert.deepEqual(calls,['src/lib.rs','src/child.rs']);assert.deepEqual(graph.diagnostics,[]);
 assert.deepEqual(graph.modules.map(row=>row.path),[[],['child'],['nested']]);
 assert.deepEqual(graph.concreteSyntaxMeta.map(row=>row.source),calls);
 for(const row of graph.concreteSyntaxMeta)assert.deepEqual(row.document,createRustConcreteSyntaxStage(files[row.source]).document);
 const inline=graph.modules.find(row=>row.path[0]==='nested');
 assert.equal(inline.source,files['src/lib.rs']);assert.equal(inline.offset,0);
 const items=originalSourceModuleItems(inline);assert.equal(items.length,1);assert.equal(items[0].term,'fn');
 assert.ok(items[0].start>files['src/lib.rs'].indexOf('mod nested'));
 assert.equal(events.filter(row=>row.state==='start').length,3);
 assert.equal(events.filter(row=>row.state==='end').length,3);
});

test('fresh graph calls transport changed full bytes and retain conditional candidates',{timeout:60000},()=>{
 const files={'src/lib.rs':'#[cfg(unproved)]mod child;','src/child.rs':'pub fn first()->u8{7u8}'};
 const options={entry:'src/lib.rs',paths:Object.keys(files),readSource:file=>files[file]};
 const before=resolveModuleGraph(options);files['src/child.rs']='// changed Ω\npub fn second()->u8{9u8}';
 const after=resolveModuleGraph(options);
 assert.equal(after.modules[1].source,files['src/child.rs']);
 assert.notDeepEqual(after.concreteSyntaxMeta[1].document,before.concreteSyntaxMeta[1].document);
 assert.equal(after.modules[1].configurationCondition,'unknown');assert.ok(after.diagnostics.length);
 assert.equal(readRustConcreteSyntaxMeta(JSON.stringify(after.concreteSyntaxMeta[1].document)).source,files['src/child.rs']);
});

test('malformed source retains the original diagnostic CST without semantic authority',{timeout:60000},()=>{
 for(const source of ['mod broken {','pub fn broken(){"unterminated','pub fn broken(){/*unterminated']){
  const expected=createRustConcreteSyntaxStage(source),stages=createRustConcreteSyntaxStages(['pub fn valid(){}',source]);
  assert.deepEqual(stages[1],expected);assert.ok(expected.document.diagnostics.length);
  const graph=resolveModuleGraph({entry:'lib.rs',paths:['lib.rs'],readSource:()=>source});
  assert.deepEqual(graph.concreteSyntaxMeta[0].document,expected.document);assert.ok(graph.diagnostics.length);
 }
 assert.throws(()=>createRustConcreteSyntaxStages(['pub fn valid(){}',null]),TypeError);
 assert.throws(()=>resolveModuleGraph({entry:'lib.rs',paths:['lib.rs'],readSource:()=>({source:'pub fn valid(){}'})}),TypeError);
});
