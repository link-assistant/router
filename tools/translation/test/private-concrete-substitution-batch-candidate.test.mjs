import test from 'node:test';
import assert from 'node:assert/strict';
import {Hash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {preparePrivateConcreteSubstitutionBatchCandidate} from '../prepare-private-concrete-substitution-batch-candidate.mjs';
import {substitutePrivateConcreteSourceBatches} from '../private-concrete-substitution-batch-candidate.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const rule=(from,to,id)=>({id,edits:[{span:[0,from.length],expected:from,replacement:to}]});
function request(source='pub fn value()->u8{7}',language='Rust'){
 const middle=source+'\n// complete language phase',after=middle+'\n// complete repository phase';return {source,language,stages:[{phase:'language',expected:middle,sequence:{languageRules:[rule(source,middle,'javascript:complete-language')],repositoryRules:[]},inverseSequence:{languageRules:[rule(middle,source,'javascript:complete-language-inverse')],repositoryRules:[]}},{phase:'repository',expected:after,sequence:{languageRules:[],repositoryRules:[rule(middle,after,'router:complete-repository')]},inverseSequence:{languageRules:[],repositoryRules:[rule(after,middle,'router:complete-repository-inverse')]}}]};
}
function legacy(row){
 const first=transportConcreteSyntaxSource(row.source,{language:row.language}),stages=[];let document=first.document;
 for(const stage of row.stages){const before=document.source,beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta),run=applyConcreteSyntaxSubstitutions(fresh.document,stage.sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta),inverse=applyConcreteSyntaxSubstitutions(last.document,stage.inverseSequence);assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,before);assert.equal(last.source,stage.expected);stages.push({phase:stage.phase,before,after:last.source,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=last.document;}
 return {beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:row.source,stages,trace:stages.flatMap(stage=>stage.trace)};
}
function run(rows){const result=substitutePrivateConcreteSourceBatches(rows);assert.equal(result.schema,'private-concrete-source-substitution-batches-v1');assert.equal(result.sourceAuthority,false);assert.equal(result.runtimeAuthority,false);assert.ok(result.rows.every(value=>typeof value==='string'));return {...result,rows:result.rows.map(value=>JSON.parse(value))};}

test('complete native original transaction copy retains fixed bank source all old APIs and independent inverses',{timeout:60000},()=>{
 const current=prepareCurrentPrivateConcreteSubstitutionBatchCandidate(),plan=current.birth,row=plan.files[0];assertPrivateParserDataCurrentComposition(current);assert.equal(row.current,current.finalSources[row.path]);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.selection.fixedRegistryUnchanged,true);assert.equal(row.selection.originalAPIsUntouched,true);assert.equal(row.selection.noPrivateFrameAcrossReturn,true);assert.equal(row.selection.independentNativeInverse,row.selection.originalBatch);assert.ok(row.after.includes(row.before));assert.equal(plan.defaultChanged,false);assert.equal(plan.performanceQualified,false);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);
 for(const input of plan.inputs)assert.equal(readFileSync(new URL('../../../'+input.path,import.meta.url),'utf8'),input.source);
});

test('full original Rust JavaScript TypeScript phases serialized CST traces and every inverse equal independent standalone operations',{timeout:60000},()=>{
 const rows=[request(),request('export function value(){return 7}','JavaScript'),request('export function value():number{return 7}','TypeScript')],expected=rows.map(legacy),actual=run(rows);assert.deepStrictEqual(actual.rows,expected);assert.equal(actual.totals.rows,3);assert.equal(actual.totals.rules,12);assert.equal(actual.totals.edits,12);assert.ok(actual.totals.canonicalCodeUnits<=33554432);assert.ok(actual.totals.nodes<=200000);
});

test('actual node selectors and exact empty phase rules retain complete independent outputs',{timeout:60000},()=>{
 const node=request();const edit=node.stages[0].sequence.languageRules[0].edits[0];delete edit.span;edit.node=0;
 const empty=request('pub fn unchanged(){}');for(const stage of empty.stages){stage.expected=empty.source;stage.sequence={languageRules:[],repositoryRules:[]};stage.inverseSequence={languageRules:[],repositoryRules:[]};}
 const rows=[node,empty];assert.deepStrictEqual(run(rows).rows,rows.map(legacy));
});

test('caller proxies getters unknown lazy keys and executable selectors refuse without invoking them',{timeout:60000},()=>{
 let calls=0;const proxy=new Proxy([request()],{get(){calls++;},ownKeys(){calls++;return [];}}),getter=request();Object.defineProperty(getter,'source',{get(){calls++;},enumerable:true});const unknown=request();Object.defineProperty(unknown,'stack',{get(){calls++;},enumerable:true});const selector=request();selector.stages[0].sequence.languageRules[0].edits[0].node=()=>{calls++;};delete selector.stages[0].sequence.languageRules[0].edits[0].span;
 for(const rows of [proxy,[getter],[unknown],[selector]])assert.throws(()=>substitutePrivateConcreteSourceBatches(rows),/substitution|private|Private/iu);assert.equal(calls,0);
});

test('one invalid later row inverse phase or original count bound aborts the complete operation',{timeout:60000},()=>{
 const inverse=request();inverse.stages[1].inverseSequence.repositoryRules[0].edits[0].expected+=' ';assert.throws(()=>substitutePrivateConcreteSourceBatches([request(),inverse]),/expected|span|inverse/iu);
 const phase=request();phase.stages.reverse();assert.throws(()=>substitutePrivateConcreteSourceBatches([phase]),/phase order/iu);
 assert.throws(()=>substitutePrivateConcreteSourceBatches(Array.from({length:257},()=>request())),/budget|shape/iu);
 const oversized=request();oversized.source='x'.repeat(2097153);assert.throws(()=>substitutePrivateConcreteSourceBatches([oversized]),/bounded primitive/iu);
 const edits=request();edits.stages[0].sequence.languageRules[0].edits=Array.from({length:4097},()=>({span:[0,0],expected:'',replacement:''}));assert.throws(()=>substitutePrivateConcreteSourceBatches([edits]),/budget|shape/iu);
});

test('a real source Hash callback changing an original request is freshly rejected after all private rows before any return',{timeout:60000},()=>{
 const rows=[request()],original=rows[0].source,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,update=descriptor(Hash.prototype,'update');let hashes=0,returned;const tape=[];
 try{define(Hash.prototype,'update',{...update,value:function(...args){const result=Reflect.apply(update.value,this,args);hashes++;tape.push(args);if(hashes===1)rows[0].source+=' ';return result;}});assert.throws(()=>{returned=substitutePrivateConcreteSourceBatches(rows);},/input descriptor\/value changed/iu);}
 finally{define(Hash.prototype,'update',update);rows[0].source=original;}
 assert.equal(returned,undefined);assert.ok(hashes>0);assert.ok(tape.every(args=>args.length>0));assert.deepStrictEqual(run(rows).rows,[legacy(rows[0])]);
});

test('each separate bounded call freshly emits all original source Hash payloads and retains no previous source or encoded verdict',{timeout:60000},()=>{
 const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,update=descriptor(Hash.prototype,'update'),tapes=[],results=[];
 for(const row of [request(),request('pub fn other()->bool{true}')]){
  const tape=[];try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push(args);return Reflect.apply(update.value,this,args);}});results.push(run([row]));}finally{define(Hash.prototype,'update',update);}assert.ok(tape.length>0);tapes.push(tape);
 }
 assert.deepStrictEqual(tapes[1],tapes[0]);assert.notEqual(results[0].rows[0].beforeMeta,results[1].rows[0].beforeMeta);assert.equal(results[0].rows[0].inverse,'pub fn value()->u8{7}');assert.equal(results[1].rows[0].inverse,'pub fn other()->bool{true}');
});

import {prepareCurrentPrivateConcreteSubstitutionBatchCandidate} from '../private-parser-data-current-sources.mjs';
import {assertPrivateParserDataCurrentComposition} from './private-parser-data-current-source-assertions.mjs';
