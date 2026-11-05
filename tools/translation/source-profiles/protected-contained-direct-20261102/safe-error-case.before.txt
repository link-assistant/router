// Exact exception/source-epoch cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {ownSourceFailureField} from '../source-error-fields-20261102.mjs';
import {installFreshSourceProposal} from '../unit-runtime-materialization.mjs';
import {knownProtectedSourceErrorSuccessor} from '../protected-source-errors-20261102-successor.mjs';
import {knownProtectedSourceInstallationSuccessor} from '../protected-source-installation-20261102-successor.mjs';
const limits={timeout:60000,concurrency:false};
test('error-code inspection reads only own data and never invokes getters proxies or prototypes',limits,()=>{
 let hits=0;const accessor=Object.defineProperty({},'code',{get(){hits++;throw Error('getter');}}),proxy=new Proxy({}, {getOwnPropertyDescriptor(){hits++;throw Error('trap');},get(){hits++;throw Error('trap');}});
 for(const value of [undefined,null,false,0,'',accessor,proxy,Object.create({code:'ENOENT'}),Object.freeze(Error('original'))])assert.equal(ownSourceFailureField(value,'code'),undefined);
 assert.equal(ownSourceFailureField(Object.freeze({code:'ENOENT'}),'code'),'ENOENT');assert.equal(hits,0);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('frozen stat failure'))])test('policy parent stat preserves original thrown value '+String(primary),limits,t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-source-error-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const plan={schema:'independent-source-error-case',root,baseRevision:null,inputs:[],outputs:[]},stat=fs.lstatSync;let called=false,caught=false,produced=false;
 const mock=t.mock.method(fs,'lstatSync',(path,...args)=>{if(String(path)===join(root,'translation')){called=true;throw primary;}return stat(path,...args);});syncBuiltinESMExports();
 try{try{installFreshSourceProposal(JSON.stringify(plan),()=>{produced=true;return plan;});}catch(error){caught=true;assert.strictEqual(error,primary);}}finally{mock.mock.restore();syncBuiltinESMExports();}
 assert.equal(called,true);assert.equal(caught,true);assert.equal(produced,false);
});
test('both original policy epochs retain the exact safe-error successor without rewriting frozen images',limits,()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url)),path='tools/translation/unit-runtime-materialization.mjs',before=fs.readFileSync(new URL('../source-profiles/protected-source-errors-20261102/unit-before.mjs.txt',import.meta.url),'utf8'),current=fs.readFileSync(new URL('../unit-runtime-materialization.mjs',import.meta.url),'utf8');
 const direct=knownProtectedSourceErrorSuccessor({root,path,before});assert.equal(direct.currentAfter,current);assert.equal(direct.after,fs.readFileSync(new URL('../source-profiles/protected-source-errors-20261102/unit-after.mjs.txt',import.meta.url),'utf8'));assert.equal(direct.laterHistories.length,1);assert.equal(direct.laterHistories[0].after,fs.readFileSync(new URL('../source-profiles/protected-staged-entries-20261102/unit.before.txt',import.meta.url),'utf8'));assert.equal(direct.laterHistories[0].currentAfter,current);const staged=direct.laterHistories[0].laterHistories[0];assert.equal(staged.before,direct.laterHistories[0].after);assert.equal(staged.after,current);assert.equal(staged.currentAfter,current);assert.equal(staged.inverse,staged.before);assert.equal(staged.history.inverse,staged.before);assert.deepEqual(staged.stages.map(row=>row.phase),['language','repository']);assert.equal(direct.history.inverse,before);assert.deepEqual(direct.stages.map(row=>row.phase),['language','repository']);
 const original=fs.readFileSync(new URL('../source-profiles/protected-source-installation-20261102/unit-before.mjs.txt',import.meta.url),'utf8'),whole=knownProtectedSourceInstallationSuccessor({root,path,before:original});assert.equal(whole.after,before);assert.equal(whole.currentAfter,current);assert.equal(whole.laterHistories.length,1);assert.equal(whole.laterHistories[0].currentAfter,current);assert.equal(whole.laterHistories[0].after,direct.after);assert.equal(whole.laterHistories[0].inverse,before);assert.equal(knownProtectedSourceErrorSuccessor({root,path,before:before+'\n'}),null);
});
