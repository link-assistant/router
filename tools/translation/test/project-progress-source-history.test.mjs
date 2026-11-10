import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreProjectProgressSourceHistory} from './project-progress-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const source=()=>readFileSync(new URL('../project.mjs',import.meta.url),'utf8');
test('complete project progress receiving history preserves current bytes and the original full inverse',
 {timeout:60000},()=>{
 const current=source(),rows=[];
 const historical=restoreProjectProgressSourceHistory(current,(kind,value)=>rows.push({kind,value}));
 assert.equal(rows.length,1);const row=rows[0].value;
 assert.equal(row.current,current);assert.equal(row.historical,historical);
 assert.equal(row.proof.after,current);assert.equal(row.proof.inverse,historical);
 assert.equal(row.proof.layers.length,4);
 const parserLayer=row.proof.layers.at(-1);
 assert.equal(parserLayer.after,current);
 assert.equal(parserLayer.inverse,row.proof.layers.at(-2).after);
 assert.match(parserLayer.after,/const matchesMacroContext=createEnclosingMatchesMacroContext\(matchesOptions\)/u);
 assert.equal(row.equation.after,current);assert.equal(row.equation.inverse,historical);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
 for(const key of ['sourceAuthority','semanticAuthority','runtimeAuthority'])assert.equal(row[key],false);
 assert.equal(row.productionExecutableGain,0);assert.equal(source(),current);
 assert.match(historical,/export function resolveModuleGraph/u);
});

test('complete project progress history refuses altered wrappers foreign bytes and callbacks',
 {timeout:60000},()=>{
 const current=source();
 for(const changed of [current+'\n',current.replace('trackedInput={value:null}','trackedInput={value:false}'),
  current.replace('return graph;','return null;')])
  assert.throws(()=>restoreProjectProgressSourceHistory(changed),/complete current project source/u);
 assert.throws(()=>restoreProjectProgressSourceHistory(new String(current)),/primitive source/u);
 assert.throws(()=>restoreProjectProgressSourceHistory(current,null),/callback/u);
 const failure=new Error('retaining complete source failed');
 assert.throws(()=>restoreProjectProgressSourceHistory(current,()=>{throw failure;}),error=>error===failure);
});
