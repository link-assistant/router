// Independent complete successor DATA/strict-current distinction. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareNativeSourceHistory,proposeRecordedNativeSourceSuccessors} from '../native-source-history.mjs';
import {prepareNativeRootSuccessorCompositionSources} from '../prepare-native-root-successor-composition-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){const root=mkdtempSync(join(tmpdir(),'router-native-successor-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const path='rust/src/lib.rs',archive='profile/history.json.gz',before='pub fn value()->u64{1}\n',middle='pub fn value()->u64{2}\n',after='pub fn value()->u64{3}\n',write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);},row=(source,next,index)=>{const originalPath='profile/original-'+index+'.txt';write(originalPath,source);const expected=String(index+1),start=source.indexOf(expected);return {path,language:'Rust',originalPath,before:source,after:next,beforeSha256:hash(source),afterSha256:hash(next),languageEdits:[],repositoryEdits:[{span:[start,start+1],expected,replacement:String(index+2)}],ruleId:'repository:whole-source-successor-'+index};},rows=[row(before,middle,0),row(middle,after,1)],packed=gzipSync(JSON.stringify({schema:'native-complete-source-history-v1',files:rows}));write(archive,packed);write(path,after);return {root,path,archive,pin:hash(packed),before,middle,after,write};}
test('full recorded successors join exact before/after chains and preserve original sources without accepting current bytes',limits,t=>{
 const input=fixture(t),plan=proposeRecordedNativeSourceSuccessors(input),row=plan.files[0];assert.equal(row.before,input.before);assert.equal(row.after,input.after);assert.equal(row.currentAfter,input.after);assert.equal(row.inverse,input.before);assert.equal(row.historyChain.length,2);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository','language','repository']);assert.equal(plan.currentSourceAccepted,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.sourceInstalled,false);assert.equal(plan.sourceCache,false);const last=proposeRecordedNativeSourceSuccessors({...input,before:input.middle});assert.equal(last.files[0].historyChain.length,1);assert.equal(last.files[0].inverse,input.middle);
});
test('unknown current observations remain inert proposal DATA and the original strict history reader refuses them',limits,t=>{
 const input=fixture(t),unknown='this is not an accepted native root';input.write(input.path,unknown);const plan=proposeRecordedNativeSourceSuccessors(input);assert.equal(plan.files[0].current,unknown);assert.equal(plan.files[0].currentAfter,input.after);assert.equal(plan.currentSourceAccepted,false);assert.throws(()=>prepareNativeSourceHistory(input),/unknown complete native current source/u);assert.equal(readFileSync(join(input.root,input.path),'utf8'),unknown);for(const before of [unknown,input.after,input.before+' '])assert.throws(()=>proposeRecordedNativeSourceSuccessors({...input,before}));
});
test('complete pinned archives and original equation bytes remain mandatory for successor proposals',limits,t=>{
 const input=fixture(t);assert.throws(()=>proposeRecordedNativeSourceSuccessors({...input,pin:'0'.repeat(64)}));assert.throws(()=>proposeRecordedNativeSourceSuccessors({...input,path:'../escape.rs'}));input.write('profile/original-1.txt',input.middle+' ');assert.throws(()=>proposeRecordedNativeSourceSuccessors(input),/original/u);
});
test('six full source substitutions preserve original APIs, strict current checks, both sequences and exact inverse bytes',limits,()=>{const plan=prepareNativeRootSuccessorCompositionSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
