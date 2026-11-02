// Independent complete source ancestry cases SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {proposeProtectedCstCliSources,knownProtectedCstCliSuccessor} from '../protected-cst-cli-writers-20261102-history.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/protected-cst-cli-writers-20261102/';
const read=path=>fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
test('all seven original producer bodies retain full source substitutions CST and inverse',{timeout:60000},()=>{
 const manifest=JSON.parse(read(BASE+'manifest.json')),inputs=manifest.files.map(row=>({path:row.path,source:read(BASE+row.beforeFile)}));
 const result=proposeProtectedCstCliSources(inputs,{root:ROOT});assert.equal(result.files.length,7);assert.equal(result.sourceInstalled,false);
 for(let at=0;at<result.files.length;at++){
  const row=result.files[at],original=manifest.files[at];assert.equal(row.after,read(BASE+original.afterFile));assert.equal(row.inverse,inputs[at].source);assert.equal(row.history.inverse,inputs[at].source);
  assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);
  const bodyBefore=row.before.slice(0,row.before.indexOf('if(process.argv[1]'));
  assert.equal(row.after.slice(row.after.indexOf('\n')+1,row.after.indexOf('if(process.argv[1]')),bodyBefore);
  const current=knownProtectedCstCliSuccessor({root:ROOT,path:row.path,before:row.before});assert.equal(current.currentAfter,row.after);
 }
});
test('unknown or similar source cannot inherit a finite protected producer successor',{timeout:30000},()=>{
 const manifest=JSON.parse(read(BASE+'manifest.json')),inputs=manifest.files.map(row=>({path:row.path,source:read(BASE+row.beforeFile)}));
 assert.equal(knownProtectedCstCliSuccessor({root:ROOT,path:'tools/translation/unknown.mjs',before:'any'}),null);
 inputs[0].source+='\n';assert.throws(()=>proposeProtectedCstCliSources(inputs,{root:ROOT}),/exact original CST producer/u);
});
