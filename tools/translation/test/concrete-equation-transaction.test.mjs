import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareConcreteEquationTransaction} from '../prepare-concrete-equation-transaction.mjs';
import {transportConcreteSyntaxSourceEquations,transportConcreteSyntaxSources,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('complete source transaction copies retain every original API all native spans both CST phases and full inverses',{timeout:60000},()=>{
 const plan=prepareConcreteEquationTransaction();assert.equal(plan.files.length,2);assert.equal(plan.newCaches,false);assert.equal(plan.existingFullCanonicalPathsUnchanged,true);assert.equal(plan.semanticAuthority,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after);assert.ok(row.after.startsWith(row.before));assert.equal(row.inverse,row.before);assert.equal(row.existingApisUnchanged,true);assert.equal(row.nativeKernel.source,row.before.slice(...row.nativeKernel.span));assert.equal(row.nativeKernel.selectionCoordinates,'kernel-local');
  let copy=row.nativeKernel.source;for(const edit of [...row.nativeSelections].sort((a,b)=>b.span[0]-a.span[0])){assert.equal(copy.slice(...edit.span),edit.expected);copy=copy.slice(0,edit.span[0])+edit.replacement+copy.slice(edit.span[1]);}assert.equal(copy,row.nativeKernel.copied);assert.ok(row.after.includes(copy));assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
  if(row.path.endsWith('/private-parser-execution.mjs'))for(const expected of ['batchSnapshot(input,current)','authenticate()','result=transport(row.source,row.language,false)','nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL','finalIdentities(before.records,before.ancestors)','batchInputCurrent(request.snapshots)'])assert.ok(copy.includes(expected),expected);
 }
});

test('separate transaction retains complete original canonical rows and independently replayed exact edits',{timeout:60000},()=>{
 const input=[{source:'// Ω😀\npub fn a()->u8{1}\n',language:'Rust'},{source:'// Ω😀\npub fn a()->u8{2}\n',language:'Rust'}],original=transportConcreteSyntaxSources(input),actual=transportConcreteSyntaxSourceEquations(input);
 assert.deepEqual(actual.rows,original.rows);assert.deepEqual(actual.totals,original.totals);assert.equal(actual.equations.length,1);const equation=actual.equations[0];assert.equal(equation.beforeMeta,original.rows[0].meta);assert.equal(equation.afterMeta,original.rows[1].meta);assert.equal(equation.before,input[0].source);assert.equal(equation.after,input[1].source);assert.equal(equation.inverse,input[0].source);assert.deepEqual(equation.trace.map(row=>row.phase),['language','repository']);
 assert.throws(()=>transportConcreteSyntaxSourceEquations(input.slice(0,1)),/pairs/);assert.throws(()=>transportConcreteSyntaxSourceEquations([input[0],{...input[1],language:'JavaScript'}]),/language/);
 let calls=0;const accessor={language:'Rust'};Object.defineProperty(accessor,'source',{enumerable:true,get(){calls++;throw Error('unexpected source getter');}});assert.throws(()=>transportConcreteSyntaxSourceEquations([accessor,input[1]]),TypeError);assert.equal(calls,0);
});
