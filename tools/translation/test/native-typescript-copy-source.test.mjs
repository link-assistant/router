// Independent typed source construction. SOURCE ONLY; all new cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
import {prepareNativeTypeScriptCopySources} from '../prepare-native-typescript-copy-sources.mjs';
import {nativeSourceHistoryLanguage} from '../native-source-descendants.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function draft(t,path){
 const root=mkdtempSync(join(tmpdir(),'router-native-typed-source-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const typed=/\.(?:ts|mts|cts)$/u.test(path),before=typed?'// Unicode source: 🦀\nexport type Value = Readonly<{value:bigint}>;\nexport function pick(input:Value):bigint{return input.value;}\n':'// Unicode source: 🦀\nexport function pick(input){return input.value;}\n',from='return input.value;',middle='return input.value + 1n;',after='return (input.value + 1n);',start=before.indexOf(from),languageEdits=[{start,end:start+from.length,expected:from,replacement:middle,owner:{kind:'function',name:'pick'}}],intermediate=before.replace(from,middle),repositoryEdits=[{start:intermediate.indexOf(middle),end:intermediate.indexOf(middle)+middle.length,expected:middle,replacement:after,owner:{kind:'function',name:'pick'}}],id='receiving:typed-source-copy-v1',archive='profile/originals-and-rules.json.gz',packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[{path,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),languageEdits,repositoryEdits}]}));mkdirSync(dirname(join(root,path)),{recursive:true});mkdirSync(join(root,'profile'));writeFileSync(join(root,path),before);writeFileSync(join(root,archive),packed);return {root,archive,pin:hash(packed),id,before,expected:before.replace(from,after),path};
}
for(const path of ['src/caller.mjs','ts/src/caller.ts','ts/src/caller.mts','ts/src/caller.cts'])test(path+' complete native source owners preserve actual language syntax UTF16 spans both phases and inverses',limits,t=>{
 const input=draft(t,path),plan=prepareNativeSubstitutionCopy(input);assert.equal(plan.files.length,1);const row=plan.files[0];assert.equal(row.before,input.before);assert.equal(row.after,input.expected);assert.equal(row.inverse,input.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.nativeBindings.strictTypecheck,false);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(readFileSync(join(input.root,input.path),'utf8'),input.before);assert.equal(nativeSourceHistoryLanguage(path),path.endsWith('.mjs')?'JavaScript':'TypeScript');
});
test('four complete implementation equations retain native owners CST histories and original inverses',limits,()=>{const plan=prepareNativeTypeScriptCopySources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
