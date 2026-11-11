import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareProjectSourceOriginCst,deriveProjectSourceOriginAdoption} from '../prepare-project-source-origin-cst.mjs';
import {createRustConcreteSyntaxStage,createRustConcreteSyntaxStages as original} from '../forward-concrete-syntax.mjs';
import {createRustConcreteSyntaxSourceStages as sourceOrigin} from '../forward-source-origin-concrete-syntax.mjs';
import {readRustConcreteSyntaxMeta} from '../forward-concrete-syntax.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../source-copy-native-bindings.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {resolveModuleGraph} from '../project.mjs';

test('complete source producer retains original APIs and both serialized phases and full inverses',{timeout:60000},()=>{
 const proposal=prepareProjectSourceOriginCst();assert.equal(proposal.files.length,2);
 assert.equal(proposal.typescriptVersion,'5.9.3');assert.equal(proposal.originalBoundsChanged,false);
 assert.equal(proposal.privateNativeSourceJsonOnly,true);assert.equal(proposal.semanticAuthority,false);
 const bindings=verifyNativeCopiedModuleBindings(ownershipCompiler(),proposal.files.map(row=>({path:resolve(row.path),source:row.after})));
 for(const [at,row]of proposal.files.entries()){
  assert.equal(readFileSync(row.path,'utf8'),row.after);assert.equal(row.current,row.after);
  assert.equal(row.inverse,row.before);assert.equal(row.equation.inverse,row.before);
  assert.equal(bindings[at].nativeSemanticScopeChecked,true);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
  }
  if(row.originalPath)assert.equal(readFileSync(row.originalPath,'utf8'),row.before);
 }
});

test('complete producer refuses changed originals and partially installed or altered afterimages',{timeout:60000},()=>{
 const proposal=prepareProjectSourceOriginCst(),directory=mkdtempSync(join(tmpdir(),'router-project-source-origin-'));
 const original=proposal.files[0],project=proposal.files[1];
 const write=(path,text)=>{const file=join(directory,path);mkdirSync(resolve(file,'..'),{recursive:true});writeFileSync(file,text);};
 try{
  write(original.originalPath,original.before+'\n// changed original\n');write(project.path,project.before);
  assert.throws(()=>prepareProjectSourceOriginCst({sourceRoot:directory}),/complete original forward source changed/u);
  write(original.originalPath,original.before);
  write(project.path,project.after.replace('createRustConcreteSyntaxSourceStages(captured.map(row=>row.source))','createRustConcreteSyntaxStages(captured.map(row=>row.source))'));
  assert.throws(()=>prepareProjectSourceOriginCst({sourceRoot:directory}),/unknown partially installed graph source/u);
  write(project.path,project.after);write(original.path,original.after+'\n// changed generated source\n');
  assert.throws(()=>prepareProjectSourceOriginCst({sourceRoot:directory}),/unknown complete generated source/u);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('composable project source equation preserves complete predecessors and rejects partial adoption',{timeout:60000},()=>{
 const ts=ownershipCompiler(),source=readFileSync(new URL('../project.mjs',import.meta.url),'utf8'),actual=deriveProjectSourceOriginAdoption(ts,source);
 assert.equal(actual.after,source);assert.equal(actual.current,source);assert.equal(actual.semanticAuthority,false);
 const original=deriveProjectSourceOriginAdoption(ts,actual.before);
 assert.equal(original.before,actual.before);assert.equal(original.after,actual.after);assert.equal(original.inverse,actual.before);
 assert.deepEqual(original.equation,actual.equation);
 assert.deepEqual(actual.equation.stages.map(row=>row.phase),['language','repository']);
 for(const stage of actual.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 const partial=actual.after.replace('createRustConcreteSyntaxSourceStages(captured.map(row=>row.source))','createRustConcreteSyntaxStages(captured.map(row=>row.source))');
 assert.throws(()=>deriveProjectSourceOriginAdoption(ts,partial),/unknown partially installed graph source/u);
 assert.throws(()=>deriveProjectSourceOriginAdoption({...ts,version:'0'},source),/TypeScript 5.9.3 required/u);
});

test('source-origin partitioning preserves every full original Unicode trivia and malformed document',{timeout:60000},()=>{
 const sources=Array.from({length:258},(_,at)=>`// Ω😀 ${at}\r\npub fn f${at}()->u8{7u8}\r\n`);
 sources.splice(20,0,'// '+'x'.repeat(66000)+'\n','\ufeff// \ud800\r\npub fn lone(){}','mod broken {','pub fn broken(){"unterminated','pub fn broken(){/*unterminated');
 const result=sourceOrigin(sources);assert.deepEqual(result,original(sources));
 for(const at of [0,20,21,22,23,24,255,256,result.length-1]){
  assert.deepEqual(result[at],createRustConcreteSyntaxStage(sources[at]));
  assert.equal(readRustConcreteSyntaxMeta(JSON.stringify(result[at].document)).source,sources[at]);
  assert.deepEqual(result[at].document.authority,{type:false,owner:false,executable:false});
 }
});

test('independent aggregate partitions retain dense documents and original absolute refusals',{timeout:60000},()=>{
 const source='a '.repeat(40000),expected=createRustConcreteSyntaxStage(source);
 const result=sourceOrigin([source,source,source]);assert.equal(result.length,3);
 for(const stage of result)assert.deepEqual(stage,expected);
 assert.deepEqual(result,original([source,source,source]));
 for(const sources of [[' '.repeat(2097153)],['pub fn valid(){}',null],[{source:'',document:{authority:{executable:true}}}]]){
  assert.throws(()=>original(sources),TypeError);assert.throws(()=>sourceOrigin(sources),TypeError);
 }
});

test('actual graph uses reconstructed complete physical sources and keeps callback order and inline spans',{timeout:60000},()=>{
 const files={'src/lib.rs':'// Ω😀\r\nmod child;mod nested{pub fn answer()->u8{9}}',
  'src/child.rs':'pub fn answer()->u8{7}'};
 const calls=[],events=[],graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource(path){calls.push(path);return files[path];}},event=>events.push(event));
 assert.deepEqual(calls,Object.keys(files));assert.deepEqual(graph.diagnostics,[]);
 assert.deepEqual(graph.modules.map(module=>module.path),[[],['child'],['nested']]);
 assert.deepEqual(graph.concreteSyntaxMeta.map(row=>row.source),calls);
 for(const row of graph.concreteSyntaxMeta)assert.deepEqual(row.document,createRustConcreteSyntaxStage(files[row.source]).document);
 assert.equal(events.filter(event=>event.state==='start').length,3);
 assert.equal(events.filter(event=>event.state==='end').length,3);
 const nested=graph.modules[2];assert.equal(nested.source,files['src/lib.rs']);assert.equal(nested.offset,0);
 files['src/child.rs']='// changed full bytes\r\npub fn changed()->u8{11}';
 const next=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
 assert.equal(next.modules[1].source,files['src/child.rs']);assert.notDeepEqual(next.concreteSyntaxMeta[1],graph.concreteSyntaxMeta[1]);
});

test('changed JSON and traversal hosts refuse before running replacement callbacks',{timeout:60000},()=>{
 let calls=0;
 for(const [owner,key]of [[JSON,'parse'],[JSON,'stringify'],[Array.prototype,'entries']]){
  const field=Object.getOwnPropertyDescriptor(owner,key);
  try{
   Object.defineProperty(owner,key,{...field,value:function(){calls++;throw Error('replacement invoked');}});
   assert.throws(()=>sourceOrigin(['pub fn one(){}','pub fn two(){}']),TypeError);
  }finally{Object.defineProperty(owner,key,field);}
 }
 assert.equal(calls,0);assert.deepEqual(sourceOrigin(['pub fn current(){}']),original(['pub fn current(){}']));
});
