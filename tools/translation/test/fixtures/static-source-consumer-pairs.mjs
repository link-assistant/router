// Complete lexical-only equations. Historical sources remain immutable; current
// sources keep every producer-scope branch and independently changed feature.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourceEquations} from '../../concrete-source-equations.mjs';
const prefix='tools/translation/extensions/';
const readerImport="import {createStaticSourceItemReader} from '../static-source-items.mjs';\n";
const rawImport="import {sourceItems} from '../rust-structure.mjs';\n";
function replace(source,before,after,count){assert.equal(source.split(before).length-1,count,before);return source.split(before).join(after);}
function memoized(source,kind){
 let result=replace(source,rawImport,kind==='external'?readerImport:rawImport+readerImport,1);
 if(kind==='external')result=replace(result,'function originalNamespace(pin){','const originalSourceItems=createStaticSourceItemReader();\nfunction originalNamespace(pin){',1);
 else result=replace(result,'const coreProofs=new Map();','const coreProofs=new Map(),originalSourceItems=createStaticSourceItemReader();',1);
 result=replace(result,'sourceItems(pin.source)','originalSourceItems(pin)',kind==='external'?1:3);
 if(kind==='core')result=replace(result,'sourceItems(root.source)','originalSourceItems(root)',1);
 return result;
}
function unmemoized(source,kind){
 let result=replace(source,readerImport,'',1);
 if(kind==='external'){
  result=replace(result,'const originalSourceItems=createStaticSourceItemReader();\n','',1);
  result=replace(result,"import {itemConfiguration",rawImport+"import {itemConfiguration",1);
 }else result=replace(result,',originalSourceItems=createStaticSourceItemReader()','',1);
 result=replace(result,'originalSourceItems(pin)','sourceItems(pin.source)',kind==='external'?1:3);
 if(kind==='core')result=replace(result,'originalSourceItems(root)','sourceItems(root.source)',1);
 return result;
}
export function staticSourceConsumerPairs(originals){
 const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 const rows=[],pairs={historical:{},current:{}};
 for(const [kind,file]of [['external','external-trait-sources.mjs'],['core','primitive-trait-closure.mjs']]){
  const path=prefix+file,historical=originals.get(path),current=readFileSync(new URL('../../extensions/'+file,import.meta.url),'utf8');assert.equal(typeof historical,'string');
  for(const [cohort,before,after]of [['historical',historical,memoized(historical,kind)],['current',unmemoized(current,kind),current]]){
   assert.notEqual(before,after);assert.equal(unmemoized(after,kind),before);
   for(const source of [before,after])assert.equal(ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
   rows.push({cohort,kind,path,before,after});
  }
 }
 const equations=transportConcreteSourceEquations(rows.map(({before,after})=>({before,after,language:'JavaScript'})));
 for(let index=0;index<rows.length;index++){
  const row=rows[index],equation=equations[index];assert.equal(equation.before,row.before);assert.equal(equation.after,row.after);assert.equal(equation.inverse,row.before);assert.deepEqual(equation.trace.map(stage=>stage.phase),['language','repository']);
  pairs[row.cohort][row.kind]={...row,equation,sourceAuthority:false,runtimeAuthority:false};
 }
 return pairs;
}
