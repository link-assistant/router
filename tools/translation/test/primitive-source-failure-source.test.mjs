// Independent failure/closing/legacy/physical-input cases. ALL execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {withSourceFailureOperation as scope,withSourceInputValidation as validate,invalidateActiveSourceOperations as invalidate} from '../source-failure-operations.mjs';
import {withCompleteSourceClosingFence as close} from '../complete-source-closing-fence.mjs';
import * as vector from '../failure-aware-primitive-owned-vector-source.mjs';
import * as sequence from '../failure-aware-primitive-sequence-source.mjs';
import * as literal from '../failure-aware-primitive-vector-literal-source.mjs';
import * as oldVector from '../current-primitive-owned-vector-source.mjs';
import * as oldSequence from '../current-primitive-sequence-source.mjs';
import * as oldLiteral from '../current-primitive-vector-literal-source.mjs';
import {withFreshPrimitiveOwnedVectorInputs as freshVector} from '../failure-aware-fresh-primitive-owned-vector-inputs.mjs';
import {withFreshPrimitiveSequenceInputs as freshSequence} from '../failure-aware-fresh-primitive-sequence-inputs.mjs';
import {withFreshPrimitiveVectorLiteralInputs as freshLiteral} from '../failure-aware-fresh-primitive-vector-literal-inputs.mjs';
import {withFreshPrimitiveOwnedVectorInputs as oldFreshVector} from '../fresh-primitive-owned-vector-inputs.mjs';
import {withFreshPrimitiveSequenceInputs as oldFreshSequence} from '../fresh-primitive-sequence-inputs.mjs';
import {withFreshPrimitiveVectorLiteralInputs as oldFreshLiteral} from '../fresh-primitive-vector-literal-inputs.mjs';
import {proposePrimitiveOwnedVectorRootSource} from '../primitive-owned-vector-root-source.mjs';
import {primitiveVectorLiteralRuntimeSources} from '../primitive-vector-literal-runtime-sources.mjs';
import {preparePrimitiveSourceFailureSources} from '../prepare-primitive-source-failure-sources.mjs';
const limits={timeout:60000},invalid=/invalidated.*source-input failure/u;
function caught(run){try{return {thrown:false,value:run()};}catch(value){return {thrown:true,value};}}
function fixture(runtimeRoot='runtime',declarationRoot=runtimeRoot){const plan=proposePrimitiveOwnedVectorRootSource('pub mod translation_core;\n',{runtimeRoot,declarationRoot}),files=new Map(plan.files.map(row=>[row.path,row.after??row.source]));for(const row of primitiveVectorLiteralRuntimeSources(runtimeRoot,declarationRoot))files.set(row.path,row.source);return {files,configuration:{runtimeRoot,declarationRoot}};}
const families=[
 {name:'sequence',scope:sequence.withOriginalPrimitiveSequenceSourceOperation,oldScope:oldSequence.withOriginalPrimitiveSequenceSourceOperation,operation:sequence.requireCurrentPrimitiveSequenceOperationSource,oldOperation:oldSequence.requireCurrentPrimitiveSequenceOperationSource,call:'slice_u8_get',file:'primitive-sequence-runtime.mjs'},
 {name:'vector',scope:vector.withOriginalPrimitiveOwnedVectorSourceOperation,oldScope:oldVector.withOriginalPrimitiveOwnedVectorSourceOperation,operation:vector.requireCurrentPrimitiveOwnedVectorOperationSource,oldOperation:oldVector.requireCurrentPrimitiveOwnedVectorOperationSource,call:'vec_u8_push',file:'primitive-owned-vector-runtime.mjs'},
 {name:'literal',scope:literal.withOriginalPrimitiveVectorLiteralSourceOperation,oldScope:oldLiteral.withOriginalPrimitiveVectorLiteralSourceOperation,operation:literal.requireCurrentPrimitiveVectorLiteralOperationSource,oldOperation:oldLiteral.requireCurrentPrimitiveVectorLiteralOperationSource,call:'router_vec_u8_literal',file:'primitive-vector-literal-runtime.mjs'},
];
test('only private source validation failures invalidate parents; arbitrary application thrown values stay exact',limits,()=>{
 for(const primary of [null,undefined,false,0,'',Symbol('primary'),new Error('primary')]){
  assert.equal(scope(()=>{const result=caught(()=>scope(()=>{throw primary;}));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);return 17;}),17);
  const result=caught(()=>scope(()=>validate(()=>{throw primary;})));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);assert.equal(scope(()=>19),19);
  assert.throws(()=>scope(()=>{const result=caught(()=>validate(()=>{throw primary;}));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);return 23;}),invalid);
  assert.equal(scope(()=>29),29);
 }
});
test('invalidated scopes still execute every closing validator and preserve the original primary failure',limits,()=>{
 const events=[],primary=Symbol('primary'),result=caught(()=>scope(()=>close(()=>{throw primary;},[()=>validate(()=>{events.push('first');throw new Error('source changed');}),()=>validate(()=>{events.push('second');}),()=>validate(()=>{events.push('third');throw new Error('another source changed');}),()=>events.push('last')])));assert.equal(result.thrown,true);assert.strictEqual(result.value,primary);assert.deepEqual(events,['first','second','third','last']);assert.equal(scope(()=>31),31);
 assert.throws(()=>scope(()=>{invalidate();assert.throws(()=>scope(()=>true),invalid);return true;}),invalid);assert.equal(scope(()=>true),true);
});
for(const family of families)test(family.name+' complete current source facts equal the retained legacy API for valid fresh input',limits,()=>{for(const [runtimeRoot,declarationRoot]of [['runtime','runtime'],['app/runtime','typed/runtime']]){const {files,configuration}=fixture(runtimeRoot,declarationRoot),args=[files,configuration,family.call,2],before=family.oldScope(()=>family.oldOperation(...args)),after=family.scope(()=>family.operation(...args));assert.deepEqual(after,before);assert.notStrictEqual(after,before);for(const key of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','privateCallerBindingQualified','receivingExecuted','crossInvocationCache'])assert.equal(after[key],false);}});
for(const family of families)test(family.name+' caught source change followed by restoration cannot revive cached source facts',limits,()=>{
 const {files,configuration}=fixture(),bad=new Map(files);bad.set('runtime/'+family.file,files.get('runtime/'+family.file)+'\n// changed complete source\n');assert.throws(()=>family.scope(()=>{family.operation(files,configuration,family.call,2);assert.throws(()=>family.operation(bad,configuration,family.call,2));bad.set('runtime/'+family.file,files.get('runtime/'+family.file));assert.throws(()=>family.operation(files,configuration,family.call,2),invalid);return true;}),invalid);assert.equal(family.operation(files,configuration,family.call,2).sourceAuthority,false);
 // The public legacy scope/API remains independent with its original contract.
 assert.equal(family.oldScope(()=>{assert.throws(()=>family.oldOperation(new Map([...files].filter(([path])=>path!=='runtime/'+family.file)),configuration,family.call,2));return family.oldOperation(files,configuration,family.call,2).sourceAuthority;}),false);
});
test('one observed source failure invalidates every active selected family without leaking into the next operation',limits,()=>{const {files,configuration}=fixture(),bad=new Map(files);bad.delete('runtime/primitive-vector-literal-runtime.d.mts');assert.throws(()=>vector.withOriginalPrimitiveOwnedVectorSourceOperation(()=>{assert.throws(()=>sequence.withOriginalPrimitiveSequenceSourceOperation(()=>{assert.throws(()=>literal.requireCurrentPrimitiveVectorLiteralOperationSource(bad,configuration,'router_vec_u8_literal',2));return true;}),invalid);assert.throws(()=>vector.requireCurrentPrimitiveOwnedVectorOperationSource(files,configuration,'vec_u8_get'),invalid);return true;}),invalid);assert.equal(literal.requireCurrentPrimitiveVectorLiteralOperationSource(files,configuration,'router_vec_u8_literal',2).sourceAuthority,false);});
function physicalFixture(t){const directory=mkdtempSync(join(tmpdir(),'router-primitive-failure-source-')),rows=new Map();t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const reader of [oldFreshSequence,oldFreshVector,oldFreshLiteral])reader(inputs=>{for(const row of inputs.sources){const prior=rows.get(row.repositoryPath);if(prior)assert.equal(prior.source,row.source);rows.set(row.repositoryPath,row);}});for(const row of rows.values()){const path=join(directory,row.repositoryPath);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}return {directory,rows};}
for(const [name,fresh,path]of [['sequence',freshSequence,'tools/translation/extensions/primitive-sequence-runtime.mjs'],['vector',freshVector,'tools/translation/extensions/primitive-owned-vector-runtime.mjs'],['literal',freshLiteral,'tools/translation/extensions/primitive-vector-literal-runtime.mjs']])test(name+' nested physical pin failure remains fatal after bytes are restored before outer closing',limits,t=>{
 const {directory,rows}=physicalFixture(t),original=rows.get(path).source,target=join(directory,path);let calls=0;assert.throws(()=>scope(()=>fresh(()=>{try{writeFileSync(target,original+'\n// bad pin\n');assert.throws(()=>fresh(()=>{calls++;},{directory}));}finally{writeFileSync(target,original);}return true;},{directory})),invalid);assert.equal(calls,0);assert.equal(fresh(inputs=>inputs.crossInvocationCache,{directory}),false);
});
test('synchronous callback and aggregate nesting bounds do not retain frames or invoke accessors',limits,()=>{let calls=0,gets=0;assert.throws(()=>scope(async()=>{calls++;}));assert.throws(()=>scope(new Proxy(()=>true,{apply(){calls++;return true;}})));assert.throws(()=>scope(()=>({get then(){gets++;return null;}})));assert.equal(calls,0);assert.equal(gets,0);const nested=depth=>scope(()=>depth?nested(depth-1):true);assert.throws(()=>nested(256),/depth bound/u);assert.equal(scope(()=>37),37);});
test('twenty-five complete source equations retain every old API source, both phases and exact whole inverses',limits,()=>{const plan=preparePrimitiveSourceFailureSources();assert.equal(plan.files.length,25);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
