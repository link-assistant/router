// Independent reusable nested source-rule DATA cases. ALL execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {composeConcreteSourceEditTemplates as compose} from '../concrete-source-edit-templates.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
const limits={timeout:60000},edit=(source,start,end,parts)=>({span:[start,end],expected:source.slice(start,end),parts});
test('nested complete original references compose once and retain both CST sequences and full inverse',limits,()=>{
 const source='// 😀 preserved trivia\nconst answer = [first.length, next];\n',start=source.indexOf('['),end=source.indexOf(']')+1,length=source.indexOf('first.length'),next=source.indexOf('next'),parent=edit(source,start,end,['literal(',{sourceSpan:[length,length+12]},', ',{sourceSpan:[next,next+4]},')']),child=edit(source,length,length+12,['length(first)']);
 for(const input of [[parent,child],[child,parent]]){const result=compose(source,input);assert.equal(result.sourceEdits,2);assert.equal(result.rootEdits,1);assert.equal(result.nestedEdits,1);assert.deepEqual(result.edits,[{span:[start,end],expected:'[first.length, next]',replacement:'literal(length(first), next)'}]);const before=transportConcreteSyntaxSource(source,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'language:compose-explicit-original-nested-rules',edits:result.edits}],repositoryRules:[]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value)).source;assert.equal(after,'// 😀 preserved trivia\nconst answer = literal(length(first), next);\n');assert.equal(transportConcreteSourceEquations([{before:source,after,language:'JavaScript'}])[0].inverse,source);assert.deepEqual(run.trace.map(row=>row.phase),['language','repository']);for(const flag of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','crossInvocationCache'])assert.equal(result[flag],false);}
});
test('source references keep unselected whitespace and adjacent edits separate',limits,()=>{const source='[one,  two] + three',first=edit(source,0,11,['make(',{sourceSpan:[1,9]},')']),a=edit(source,1,4,['ONE']),b=edit(source,7,10,['TWO']);assert.throws(()=>compose(source,[first,a,b]),/retained original reference/u);first.parts=[ 'make(',{sourceSpan:[1,10]},')' ];const result=compose(source,[b,first,a]);assert.equal(result.edits[0].replacement,'make(ONE,  TWO)');assert.equal(result.nestedEdits,2);assert.deepEqual(compose('ab',[edit('ab',0,1,['A']),edit('ab',1,2,['B'])]).edits.map(row=>row.replacement),['A','B']);assert.deepEqual(compose('unchanged',[]).edits,[]);});
test('crossing duplicate removed repeated stale empty and surrogate-cut source edits refuse',limits,()=>{
 const source='abcdef';for(const rows of [
  [edit(source,0,4,['x']),edit(source,2,6,['y'])],
  [edit(source,0,4,['x']),edit(source,0,4,['y'])],
  [edit(source,0,6,['generated']),edit(source,1,2,['nested'])],
  [edit(source,0,6,[{sourceSpan:[1,3]},{sourceSpan:[2,4]}])],
  [{span:[0,2],expected:'stale',parts:['x']}],
  [{span:[0,0],expected:'',parts:['insert']}],
  [{span:[0,7],expected:source,parts:['x']}],
 ])assert.throws(()=>compose(source,rows));assert.throws(()=>compose('😀',[{span:[0,1],expected:'\ud83d',parts:['x']}]));
});
test('ordinary bounded exact own DATA is required before invoking accessors/proxy traps',limits,()=>{let called=0;const row={span:[0,1],expected:'a',parts:['A']},accessor={span:[0,1],expected:'a',get parts(){called++;return ['A'];}},proxy=new Proxy(row,{get(){called++;throw new Error('must not invoke');}}),list=new Proxy([row],{get(){called++;throw new Error('must not invoke');}});for(const input of [[accessor],[proxy],list,[,row],Object.assign([row],{extra:true}),[Object.assign({...row},{extra:true})],[{...row,parts:[{get sourceSpan(){called++;return [0,1];}}]}]])assert.throws(()=>compose('a',input));assert.equal(called,0);assert.throws(()=>compose('a',Array(8193)));assert.throws(()=>compose('a',[{...row,parts:['x'.repeat(8388609)]}]));});
test('template nesting is finite and source is reconstructed per operation without result reuse',limits,()=>{const source='('.repeat(161)+'x'+')'.repeat(161),rows=Array.from({length:161},(_,index)=>edit(source,index,source.length-index,[{sourceSpan:[index+1,source.length-index-1]}]));assert.throws(()=>compose(source,rows),/nesting bound/u);const first=compose('a',[edit('a',0,1,['A'])]),second=compose('a',[edit('a',0,1,['A'])]);assert.notStrictEqual(first,second);assert.notStrictEqual(first.edits,second.edits);});
