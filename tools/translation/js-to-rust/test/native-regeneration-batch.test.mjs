import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {prepareNativeRegenerationBatch} from '../../prepare-native-regeneration-batch.mjs';
import {buildNativeTypeScript,regenerateNativeTypeScript,loadTypeScript} from '../native-typescript.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
function fixture(t){
 const path=mkdtempSync(join(tmpdir(),'router-native-regeneration-batch-'));
 t.after(()=>rmSync(path,{recursive:true,force:true}));
 mkdirSync(join(path,'js/src'),{recursive:true});
 symlinkSync(resolve(root,'js/node_modules'),join(path,'js/node_modules'),'dir');
 writeFileSync(join(path,'js/package.json'),'{"name":"native-batch-fixture","version":"1.0.0","type":"module"}\n');
 writeFileSync(join(path,'js/index.js'),'export const root = 1;\n');
 writeFileSync(join(path,'js/testing.js'),'export const testing = true;\n');
 writeFileSync(join(path,'js/catalog.json'),'{}\n');
 return path;
}
test('complete native proposal retains original public functions and both full CST source phases',{timeout:60000},()=>{
 const plan=prepareNativeRegenerationBatch();
 assert.equal(readFileSync(join(root,plan.path),'utf8'),plan.after);
 assert.equal(gunzipSync(readFileSync(new URL('../../source-profiles/native-regeneration-batch/original.mjs.gz',import.meta.url))).toString(),plan.before);
 assert.equal(plan.originalSha256,'46ec636ff5c2ffa3ec3dfd8dfbc7b73f7a01b171286cf6d5c78b3320726d8208');
 assert.equal(plan.previousSha256,'399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362');
 assert.equal(plan.previousEquation.before,plan.previousAfter);
 assert.equal(plan.previousEquation.after,plan.after);
 assert.equal(plan.previousEquation.inverse,plan.previousAfter);
 assert.deepEqual(plan.previousEquation.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of plan.previousEquation.stages){assert.equal(stage.inverse,stage.before);assert.ok(stage.beforeMeta);assert.ok(stage.afterMeta);}
 assert.match(plan.after,/function\* nativeRegenerationParsedConcreteSources\(/u);
 assert.match(plan.after,/prepareReverseConcreteParsedSourceChunks\(\[rows\.map/u);
 const ts=loadTypeScript(root);
 const exported=source=>{
  const file=ts.createSourceFile('complete.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.deepEqual(file.parseDiagnostics,[]);
  return file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))
   .map(node=>[node.name.text,source.slice(node.getStart(file),node.end)]);
 };
 const old=exported(plan.before),current=exported(plan.after);
 assert.deepEqual(current.map(row=>row[0]),old.map(row=>row[0]));
 for(const [name,source]of old)if(name!=='regenerateNativeTypeScript')assert.equal(current.find(row=>row[0]===name)[1],source,name);
 assert.equal(current.find(row=>row[0]==='regenerateNativeTypeScript')[1],old.find(row=>row[0]==='regenerateNativeTypeScript')[1]
  .replace('const artifacts = buildNativeTypeScript(sourceRoot);','const artifacts = buildNativeTypeScriptForRegeneration(sourceRoot);'));
 assert.deepEqual(plan.trace.flat().map(row=>row.phase),['language','repository']);
 assert.equal(plan.semanticAuthority,false);
});
test('bounded grouped regeneration retains all standalone output bytes and independent runtime behavior',{timeout:60000},async t=>{
 const sourceRoot=fixture(t),output=mkdtempSync(join(tmpdir(),'router-native-regeneration-output-'));
 t.after(()=>rmSync(output,{recursive:true,force:true}));
 const behavior='// complete CRLF source\r\nexport function choose(flag){return flag?"east":"west";}\r\n'+
  'export function receiver(){return this.value;}\r\nexport function asi(){return\r\n{value:1}}\r\n'+
  'export function chain(value){return value?.missing?.();}\r\n';
 writeFileSync(join(sourceRoot,'js/src/behavior.mjs'),behavior);
 // Whole comment payloads cross the private chunk target without semantic
 // projection. The sixteen additional complete modules cross its row target.
 writeFileSync(join(sourceRoot,'js/src/comments.mjs'),'/*'+'complete payload '.repeat(5000)+'*/\nexport const intact="Ω";\n');
 for(let at=0;at<16;at++)writeFileSync(join(sourceRoot,`js/src/fixture-${at}.mjs`),`export const value=${at};\n`);
 const expected=buildNativeTypeScript(sourceRoot);
 const written=regenerateNativeTypeScript(output,{sourceRoot});
 assert.equal(written.changed.length,expected.size);
 for(const [path,value]of expected)assert.ok(readFileSync(join(output,path)).equals(Buffer.from(value)),path);
 assert.deepEqual(regenerateNativeTypeScript(output,{sourceRoot,check:true}).changed,[]);
 const ts=loadTypeScript(sourceRoot),emitted=ts.transpileModule(readFileSync(join(output,'ts/src/behavior.ts'),'utf8'),
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const runtime=await import('data:text/javascript;base64,'+Buffer.from(emitted).toString('base64'));
 assert.equal(runtime.choose(true),'east');assert.equal(runtime.choose(false),'west');
 assert.equal(runtime.receiver.call({value:29}),29);assert.equal(runtime.asi(),undefined);
 assert.equal(runtime.chain(null),undefined);assert.equal(runtime.chain({}),undefined);
 // TypeScript's inference host removes the BOM. Both complete builders must
 // retain the existing snapshot refusal rather than accepting different input.
 writeFileSync(join(sourceRoot,'js/src/behavior.mjs'),'\ufeff'+behavior);
 assert.throws(()=>buildNativeTypeScript(sourceRoot),/inference source snapshot differs/);
 assert.throws(()=>regenerateNativeTypeScript(output,{sourceRoot}),/inference source snapshot differs/);
});
test('grouped CST fidelity cannot admit malformed native JavaScript',{timeout:60000},t=>{
 const sourceRoot=fixture(t);
 writeFileSync(join(sourceRoot,'js/src/malformed.mjs'),'export function broken( {\n');
 assert.throws(()=>buildNativeTypeScript(sourceRoot),/invalid authoritative JavaScript syntax/);
 assert.throws(()=>regenerateNativeTypeScript(sourceRoot),/invalid authoritative JavaScript syntax/);
});
