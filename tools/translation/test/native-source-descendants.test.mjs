// Independent source-history regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
import {nativeSourceHistoryFiles,collectNativeSourceDescendants} from '../native-source-descendants.mjs';
import {prepareTransitiveSourceHistory} from '../prepare-transitive-source-history.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex'),source=value=>'export function value(){return '+value+';}\n';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-source-descendants-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,text)=>writeFileSync(join(root,path),text);mkdirSync(join(root,'profiles'));write('root.mjs',source(2));write('middle.mjs',source(1));
 const recipe=(id,path,before,after,{originalPath}={})=>{
  const expected='return '+before+';',replacement='return '+after+';',text=source(before),row={path,source:text,bytes:Buffer.byteLength(text),sha256:hash(text),languageEdits:[{start:text.indexOf(expected),end:text.indexOf(expected)+expected.length,expected,replacement,owner:{kind:'function',name:'value'}}],repositoryEdits:[]};if(originalPath)row.originalPath=originalPath;
  const packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[row]})),archive='profiles/'+id+'.json.gz';write(archive,packed);return laterPlans=>prepareNativeSubstitutionCopy({root,archive,pin:hash(packed),id,laterPlans:laterPlans??[]});
 };return {root,write,recipe};
}
test('complete descendant source edits cross an intermediate plan without changing any direct file membership',limits,t=>{
 const api=fixture(t),leaf=api.recipe('leaf','root.mjs',1,2)(),middle=api.recipe('middle','middle.mjs',0,1)([leaf]),root=api.recipe('root','root.mjs',0,1)([middle]);assert.equal(leaf.files.length,1);assert.equal(middle.files.length,1);assert.equal(root.files.length,1);assert.equal(middle.descendantFiles.length,1);assert.equal(middle.descendantFiles[0].before,source(1));assert.equal(root.files[0].currentAfter,source(2));assert.equal(root.files[0].inverse,source(0));assert.equal(root.files[0].laterHistories[0].equation.inverse,source(1));assert.equal(root.descendantFiles.length,1);assert.equal(root.descendantFiles[0].path,'middle.mjs');assert.equal(root.receivingExecuted,false);assert.deepEqual(nativeSourceHistoryFiles(root).map(row=>row.path),['root.mjs','middle.mjs']);
});
test('fresh complete descendant physical sources and original snapshots remain mandatory at every ancestor return',limits,t=>{
 const api=fixture(t);api.write('original-root.mjs.txt',source(1));const leaf=api.recipe('leaf','root.mjs',1,2,{originalPath:'original-root.mjs.txt'})(),middle=api.recipe('middle','middle.mjs',0,1);api.write('root.mjs',source(2)+'// changed\n');assert.throws(()=>middle([leaf]),/descendant physical source changed/u);api.write('root.mjs',source(2));api.write('original-root.mjs.txt',source(1)+'// changed\n');assert.throws(()=>middle([leaf]),/descendant original implementation changed/u);
});
test('copied source metadata cannot hide duplicate paths sparse arrays accessors or a broken full inverse',limits,t=>{
 const api=fixture(t),leaf=api.recipe('leaf','root.mjs',1,2)();assert.throws(()=>nativeSourceHistoryFiles({...leaf,descendantFiles:leaf.files}),/unique/u);assert.throws(()=>nativeSourceHistoryFiles({...leaf,files:Array(1)}),/own/u);const bad=structuredClone(leaf);bad.files[0].inverse+='changed';assert.throws(()=>nativeSourceHistoryFiles(bad),/inverse/u);let calls=0;const accessor={...leaf};Object.defineProperty(accessor,'files',{get(){calls++;return leaf.files;},enumerable:true});assert.throws(()=>nativeSourceHistoryFiles(accessor),/accessor/u);assert.equal(calls,0);assert.throws(()=>collectNativeSourceDescendants([new Proxy(leaf,{})],new Set()),/ordinary/u);
});
test('an ancestor that edits the same file still rechecks the forwarded child original snapshot',limits,t=>{
 const api=fixture(t);api.write('original-root.mjs.txt',source(1));const leaf=api.recipe('leaf','root.mjs',1,2,{originalPath:'original-root.mjs.txt'})(),middle=api.recipe('middle','middle.mjs',0,1)([leaf]),root=api.recipe('root','root.mjs',0,1);api.write('original-root.mjs.txt',source(1)+'// changed\n');assert.throws(()=>root([middle]),/descendant original implementation changed/u);
});
test('the original complete source-copy implementation and native function selections remain available',limits,()=>{
 const plan=prepareTransitiveSourceHistory();assert.equal(plan.files.length,2);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const producer=plan.files.find(row=>row.path.endsWith('/prepare-native-substitution-copy.mjs'));assert.ok(producer.originalPath.endsWith('/originals/prepare-native-substitution-copy.mjs.txt'));assert.ok(producer.before.includes('const candidates=later.files.filter'));assert.ok(producer.after.includes('const candidates=nativeSourceHistoryFiles(later).filter'));
});
