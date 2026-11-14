import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {prepareOperationProofByteSources} from '../prepare-operation-proof-byte-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const originalPin='6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f';
const originalOutputPin='698ab536c8e4a87851ee48dcdb1fd5af066cbe658828bf2c24441d7011ca7635';
const measuredOriginalOutputPin='9fe79dd2b6bbd0931c87f2095ea56880b3b3a373bb33e96d123fc0e73da2105c';
const hash=value=>createHash('sha256').update(value).digest('hex');
// Independently authored complete successor rules: the original output pin
// continues to identify the source before these three ordered changes.
const measurementRules=[
  {id:'javascript:operation-local-positive-size-records',
    before:' function createPrivateFrozenJsonComposer(){\n',
    after:'// Positive scalar sizes only, weakly keyed inside this one operation.\n'
      +'// Fresh whole-graph eligibility and every logical debit remain mandatory.\n'
      +'let sharedMeasurements=qualified?new weakConstructor():null,sharedMeasurementRecords=0;\n'
      +' function createPrivateFrozenJsonComposer(){\n'},
  {id:'javascript:retain-fresh-per-call-measurement-budgets',
    before:'  const sharedMeasurements=new weakConstructor();let sharedMeasurementRecords=0,measurementDeepest=0;',
    after:'  let measurementDeepest=0;'},
  {id:'javascript:retire-size-records-before-original-callbacks',
    before:' function operationClearBytes(){\n  if(!qualified||storage===null)return;\n',
    after:' function operationClearBytes(){\n  if(!qualified||storage===null)return;\n'
      +'  sharedMeasurements=new weakConstructor();sharedMeasurementRecords=0;\n'},
];
function substitute(source,before,after){
  const at=source.indexOf(before);
  assert.ok(at>=0);assert.equal(source.indexOf(before,at+1),-1);
  return source.slice(0,at)+after+source.slice(at+before.length);
}

test('current operation source retains the exact original pin and complete guarded-import inverse',{timeout:60_000},()=>{
  const plan=prepareOperationProofByteSources(),history=plan.sourceEvolution;
  assert.equal(history.originalSha256,originalPin);
  assert.equal(hash(history.equation.source),originalPin);
  assert.equal(history.equation.inverse,history.equation.source);
  assert.equal(history.equation.current,plan.input.source);
  assert.equal(history.equation.text,plan.input.source);
  assert.equal(history.currentSha256,plan.input.sha256);
  assert.equal(history.sourceAuthority,false);
  assert.deepEqual(history.equation.stages.map(row=>row.phase),['language','repository']);
  for(const stage of history.equation.stages){
    assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);
    assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);
    assert.equal(stage.inverse,stage.source);
  }
  const row=plan.files[0];assert.equal(row.current,row.after);
  assert.match(row.after,/from '\.\/guarded-proof-lexing-intrinsics\.mjs'/);
});

test('unrelated composer and import changes remain refused and original generation stays byte exact',{timeout:60_000},()=>{
  const plan=prepareOperationProofByteSources(),root=mkdtempSync(join(tmpdir(),'router-operation-source-evolution-'));
  const put=(path,bytes)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);};
  try{
    put(plan.input.path,plan.input.source);
    put(plan.files[0].path,plan.files[0].current);
    assert.equal(prepareOperationProofByteSources({root}).files[0].after,plan.files[0].after);
    put(plan.input.path,plan.input.source+'\n// unrelated body change\n');
    assert.throws(()=>prepareOperationProofByteSources({root}),/complete current immutable composer differs/);
    put(plan.input.path,plan.input.source);
    put(plan.input.path,plan.input.source.replace("'./guarded-proof-lexing-intrinsics.mjs'","'./foreign-lexing-intrinsics.mjs'"));
    assert.throws(()=>prepareOperationProofByteSources({root}),/private lexing import/);
    put(plan.input.path,plan.sourceEvolution.equation.source);
    const original=prepareOperationProofByteSources({root});
    assert.equal(original.sourceEvolution,null);
    assert.equal(original.input.sha256,originalPin);
    const row=original.files[0],history=row.measurementSourceHistory;
    assert.equal(hash(history.before),originalOutputPin);
    assert.equal(history.inverse,history.before);
    assert.deepEqual(history.languageRules,measurementRules);
    assert.deepEqual(history.repositoryRules,[]);
    let expected=history.before;
    for(const rule of measurementRules)expected=substitute(expected,rule.before,rule.after);
    assert.equal(history.after,expected);assert.equal(row.after,expected);
    for(const rule of [...measurementRules].reverse())expected=substitute(expected,rule.after,rule.before);
    assert.equal(expected,history.before);assert.equal(hash(expected),originalOutputPin);
    assert.equal(row.afterSha256,measuredOriginalOutputPin);
    assert.equal(hash(row.after),measuredOriginalOutputPin);
    assert.equal(transportConcreteSyntaxMeta(history.equation.beforeMeta).source,history.before);
    assert.equal(transportConcreteSyntaxMeta(history.equation.afterMeta).source,history.after);
    assert.equal(history.equation.inverse,history.before);
    assert.equal(history.maximumRecords,1024);assert.equal(history.minimumCells,64);
    assert.equal(history.originalLogicalBudgetsUnchanged,true);
    assert.equal(history.newAcrossOperationCache,false);
    assert.equal(history.sourceAuthority,false);assert.equal(history.runtimeAuthority,false);
    // The real receiving source is unchanged by either refusal or restoration.
    assert.equal(readFileSync(new URL('../../../'+plan.input.path,import.meta.url),'utf8'),plan.input.source);
  }finally{rmSync(root,{recursive:true,force:true});}
});
