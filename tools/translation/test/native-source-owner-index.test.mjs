// Independent original-boundary source cases. All remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {prepareNativeSubstitutionCopy,withNativeSubstitutionOperation} from '../prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOwnerIndexSources} from '../prepare-native-source-owner-index-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){const root=mkdtempSync(join(tmpdir(),'router-owner-index-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'profiles'));let sequence=0;return {root,write:source=>writeFileSync(join(root,'caller.mjs'),source),prepare(source,languageEdits,repositoryEdits=[]){const id='owner-index-'+sequence++,archive='profiles/'+id+'.gz',packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[{path:'caller.mjs',source,bytes:Buffer.byteLength(source),sha256:hash(source),languageEdits,repositoryEdits}]}));writeFileSync(join(root,archive),packed);return ()=>prepareNativeSubstitutionCopy({root,archive,pin:hash(packed),id});}};}
function edit(source,expected,replacement,owner,start=source.indexOf(expected)){return {start,end:start+expected.length,expected,replacement,owner};}
test('the original 128-edit domain retains individual actual native spans complete outputs and both inverses',limits,t=>{
 const api=fixture(t),values=Array.from({length:128},(_,index)=>String(index)),prefix='export function chosen(){return [',source=prefix+values.join(',')+'];}\n';let position=prefix.length;const edits=values.map(value=>{const row=edit(source,value,String(Number(value)+1),{kind:'function',name:'chosen'},position);position+=value.length+1;return row;}),after=prefix+values.map(value=>String(Number(value)+1)).join(',')+'];}\n';api.write(after);const result=api.prepare(source,edits)();assert.equal(result.files[0].currentAfter,after);assert.equal(result.files[0].nativeSelections.language.length,128);assert.equal(result.files[0].inverse,source);assert.equal(result.files[0].stages[0].inverse,source);assert.equal(result.files[0].stages[1].inverse,after);for(let index=0;index<edits.length;index++)assert.deepEqual(result.files[0].nativeSelections.language[index].editSpan,[edits[index].start,edits[index].end]);assert.equal(result.semanticAuthority,false);assert.equal(result.receivingExecuted,false);
});
test('a repeated query cannot authorize a stale literal escaped owner ambiguous definition or overlapping edit',limits,t=>{
 const api=fixture(t),source='export function chosen(){return 1;}\nexport function other(){return 2;}\n';api.write(source);
 const valid=edit(source,'1','1',{kind:'function',name:'chosen'});for(const edits of [
  [valid,{...valid,expected:'9'}],
  [valid,edit(source,'2','2',{kind:'function',name:'chosen'})],
  [valid,{...valid}],
  [edit(source,'1','1',{kind:'function',name:'missing'})],
 ])assert.throws(()=>api.prepare(source,edits)(),/span|owner|nonoverlapping/u);
 const duplicate='export function chosen(){return 1;}function outer(){function chosen(){return 2;}return chosen();}';api.write(duplicate);assert.throws(()=>api.prepare(duplicate,[edit(duplicate,'1','1',{kind:'function',name:'chosen'})])(),/unique native-selected/u);
});
test('native call names arguments paths import declarations and variable owners retain their exact domains',limits,t=>{
 const api=fixture(t),source='import {test} from "./runtime.mjs";\nconst value=1;\nclass Owner{}\ntest("first",()=>value);test("second",()=>value);\nconst api={run:()=>value};api.run();\nexport {value,Owner};\n';api.write(source);
 const queries=[edit(source,'./runtime.mjs','./runtime.mjs',{kind:'import',name:'./runtime.mjs'}),edit(source,'value=1','value=1',{kind:'variable',name:'value'}),edit(source,'class Owner{}','class Owner{}',{kind:'class',name:'Owner'}),edit(source,'"first"','"first"',{kind:'call',name:'test',argument:'first'}),edit(source,'"second"','"second"',{kind:'call',name:'test',argument:'second'}),edit(source,'api.run()','api.run()',{kind:'call-path',name:'api.run'})],result=api.prepare(source,queries)();assert.equal(result.files[0].nativeSelections.language.length,queries.length);assert.equal(result.files[0].currentAfter,source);
 for(const owner of [{kind:'call',name:'test',argument:'missing'},{kind:'call-path',name:'api.missing'},{kind:'variable',name:'Owner'},{kind:'class',name:'value'}])assert.throws(()=>api.prepare(source,[edit(source,'1','1',owner)])(),/unique native-selected/u);
});
test('temporary owner syntax cannot survive physical changes or bypass complete module-end guards',limits,t=>{
 const api=fixture(t),source='export function chosen(){return 1;}\n',after='export function chosen(){return 2;}\n',plan=api.prepare(source,[edit(source,'1','2',{kind:'function',name:'chosen'})]);api.write(after);withNativeSubstitutionOperation(()=>{plan();api.write('export function changed(){return 2;}\n');assert.throws(()=>plan(),/physical/u);api.write(after);plan();});
 api.write(source);const append={start:source.length,end:source.length,expected:'',replacement:'\n',owner:{kind:'end-of-module'}};assert.equal(api.prepare(source,[],[append])().files[0].currentAfter,source+'\n');assert.throws(()=>api.prepare(source,[],[{...append,start:0,end:0}])(),/module-end/u);
});
test('complete original helper and successor copies retain ordered native substitutions and full CST inverses',limits,()=>{
 const plan=prepareNativeSourceOwnerIndexSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
