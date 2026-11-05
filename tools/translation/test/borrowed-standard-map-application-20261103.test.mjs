// Complete application source/CST ancestry cases SOURCE. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {proposeBorrowedStandardMapApplication} from '../borrowed-standard-map-application-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const BASE='tools/translation/source-profiles/borrowed-standard-map-application-20261103/';
const inputs=()=>[['rust/src/openai.rs','openai'],['rust/src/lib.rs','lib']].map(([path,name])=>({path,source:read(BASE+name+'.before.txt')}));
test('real application and crate root retain whole native CST and inverses',{timeout:60000},()=>{
 const original=inputs(),result=proposeBorrowedStandardMapApplication(original,{root:ROOT});
 assert.equal(result.files.length,2);assert.equal(result.semanticAuthority,false);assert.equal(result.applicationTranslationQualified,false);
 for(let at=0;at<2;at++){
  const row=result.files[at];assert.equal(row.after,read(row.path));assert.equal(row.inverse,original[at].source);
  assert.equal(row.history.inverse,row.before);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);
 }
 assert.match(result.files[0].after,/query: &BTreeMap<String, String>/u);
 assert.ok(result.files[0].after.includes('&["true", "1"]'));
});
test('changed whole source or redirected application path cannot inherit the proposal',{timeout:60000},()=>{
 const changed=inputs();changed[0].source+='\n';assert.throws(()=>proposeBorrowedStandardMapApplication(changed,{root:ROOT}),/exact original application/u);
 const redirected=inputs();redirected[0].path='rust/src/similar.rs';assert.throws(()=>proposeBorrowedStandardMapApplication(redirected,{root:ROOT}),/exact original application/u);
 assert.throws(()=>proposeBorrowedStandardMapApplication(inputs().slice(1),{root:ROOT}),/both complete original/u);
});
