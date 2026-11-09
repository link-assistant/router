import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareRuntimeImportPhasedData} from '../prepare-runtime-import-phased-data.mjs';
import {prepareOwnedRuntimeImportEdges,composeOwnedRuntimeImportEdges} from '../prepare-owned-runtime-import-current.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('runtime import source equation preserves complete original APIs and both native/CST inverses',{timeout:60000},()=>{
 const plan=prepareRuntimeImportPhasedData(),row=plan.file,ts=ownershipCompiler();
 assert.equal(readFileSync(new URL('../prepare-owned-runtime-import-edges.mjs',import.meta.url),'utf8'),row.after);
 assert.equal(row.equation.inverse,row.original);assert.equal(row.equation.before,row.original);assert.equal(row.equation.after,row.after);
 assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
 }
 function bodies(source){
  const file=ts.createSourceFile('runtime-import-source.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);
  return file.statements.filter(node=>ts.isFunctionDeclaration(node)&&!['equation','composeOwnedRuntimeImportEdges'].includes(node.name.text)).map(node=>({name:node.name.text,source:node.getText(file)}));
 }
 assert.deepEqual(bodies(row.after),bodies(row.original));
 assert.equal(plan.originalPublicPreparationUnchanged,true);assert.equal(plan.originalRuntimeIssuersUnchanged,true);assert.equal(plan.semanticAuthority,false);
});

test('actual source composition keeps complete original outputs while Bun retains its original runtime refusal',{timeout:60000},()=>{
 const ts=ownershipCompiler(),before=ownershipCompilerRuntimeNativeCurrent(ts);
 if(process.versions.bun){
  assert.equal(before,false);
  assert.throws(()=>prepareOwnedRuntimeImportEdges(),{name:'TypeError',message:'Owned runtime import source: actual compiler callable source is absent: Debug.shouldLog'});
 }
 const joined=composeOwnedRuntimeImportEdges({}),expected=new Map([
  ['tools/translation/js-to-rust/owned-core-source.mjs','ebd45c97808dbe473fcbc77c1663bcd0168953dfa25e16c305878f5736e6d2d9'],
  ['scripts/regenerate-js-first.mjs','f471e9ff097584ec47212fa52054b68e6bdc187e6029785c2b7f9e841044d290'],
  ['tools/translation/js-to-rust/vendor/module-syntax.mjs','5587f9b51453bd4fd13a7a1383d96a96d19d7bf55bf46a66f5ed21b916172d36'],
  ['tools/translation/js-to-rust/native-typescript.mjs','b0e9ed69588b445686802b67cd5e71a51f43921f6797a2c0304438eee7d7793b']]);
 assert.deepEqual(new Set(Object.keys(joined.sources)),new Set(expected.keys()));
 for(const [path,sha]of expected){
  const row=joined.sources[path];assert.equal(row.current,row.after);assert.equal(hash(row.after),sha);
  if(path==='tools/translation/js-to-rust/native-typescript.mjs'){assert.equal(row.sourceHistory[0].afterSha256,'46ec636ff5c2ffa3ec3dfd8dfbc7b73f7a01b171286cf6d5c78b3320726d8208');assert.equal(row.sourceHistory[1].before,row.sourceHistory[0].after);assert.equal(row.sourceHistory[1].after,row.after);}
  assert.equal(row.inverse,row.before);assert.equal(row.semanticAuthority,false);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  assert.ok(row.stages.every(stage=>stage.completeInverse));
 }
 const layer=joined.layers[0];assert.equal(layer.semanticAuthority,false);assert.equal(layer.runtimeExecuted,false);assert.equal(layer.performanceQualified,false);
 const first=Object.values(joined.sources)[0];
 assert.throws(()=>composeOwnedRuntimeImportEdges({[first.path]:{after:first.before+' '}}),/complete historical predecessor differs/);
 assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),before);
});
