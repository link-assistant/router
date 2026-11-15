import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeRuntimeCompilerSelections} from '../prepare-runtime-compiler-selections.mjs';
import {proposeRuntimeCompilerLifetime} from '../prepare-runtime-compiler-lifetime.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyNativeCopiedSourceBindings} from '../source-copy-native-bindings.mjs';
import {fileURLToPath} from 'node:url';
const ts=ownershipCompiler(),path='tools/translation/prepare-owned-runtime-import-current.mjs';
const original=readFileSync(new URL('../prepare-owned-runtime-import-edges.mjs',import.meta.url),'utf8');
const before=proposeRuntimeCompilerSelections(ts,path,original).after;
const parse=source=>ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=(source,name)=>{const file=parse(source),rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(rows.length,1);return {file,node:rows[0]};};
test('fresh compiler scope copies every original statement and preserves complete CST and native inverse',{timeout:60000},()=>{
 const plan=proposeRuntimeCompilerLifetime(ts,path,before),{file,node}=declaration(plan.after,'freshRuntimeCompilerSourceData');
 assert.deepEqual([...node.body.statements].slice(0,-1).map(row=>row.getText(file)),plan.unchangedCompilerPrefix);
 assert.deepEqual(plan.retainedNames,['ts','compilerPath','compilerBytes','compilerSource','lazy','native','parentTail']);
 assert.equal(node.body.statements.at(-1).getText(file),'return {ts,compilerPath,compilerBytes,compilerSource,lazy,native,parentTail};');
 assert.equal(plan.inverse,before);assert.equal(plan.originalChecksRemoved,0);assert.equal(plan.compilerStateRetained,false);assert.equal(plan.performanceQualified,false);
 for(const source of [plan.before,plan.after]){
  assert.equal(transportConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).meta).source,source);
  assert.equal(verifyNativeCopiedSourceBindings(ts,fileURLToPath(new URL('../prepare-owned-runtime-import-current.mjs',import.meta.url)),source).nativeSemanticScopeChecked,true);
 }
 const originalOwner=declaration(before,'prepareOwnedRuntimeImportEdges'),scopedOwner=declaration(plan.after,'prepareOwnedRuntimeImportEdges');
 assert.deepEqual([...scopedOwner.node.body.statements].slice(2).map(row=>row.getText(scopedOwner.file)),[...originalOwner.node.body.statements].slice(9).map(row=>row.getText(originalOwner.file)));
});
test('scope preparation refuses changed prefix domains and references that would escape',{timeout:60000},()=>{
 for(const source of [
  before.replace('root=resolve(root);','root=resolve(root);debug();'),
  before.replace('const packed=readFileSync','compilerFile;const packed=readFileSync'),
 ])assert.throws(()=>proposeRuntimeCompilerLifetime(ts,path,source),/Runtime compiler lifetime source/);
 assert.throws(()=>proposeRuntimeCompilerLifetime(ts,path,before.replace('const packed=readFileSync',"const packed=compilerFile&&readFileSync")),/binding escapes/);
 assert.throws(()=>proposeRuntimeCompilerLifetime(ts,path,before.replace('selections=nativeCompilerSelections','selections=otherSelections')),/selection prefix differs/);
 assert.throws(()=>proposeRuntimeCompilerLifetime(ts,path,before+'\nfunction freshRuntimeCompilerSourceData(){}'),/already exists/);
 assert.throws(()=>proposeRuntimeCompilerLifetime({...ts,version:'0'},path,before),/installed compiler/);
 assert.throws(()=>proposeRuntimeCompilerLifetime(ts,path,before+'\nfunction incomplete('),/grammar differs/);
 assert.equal(proposeRuntimeCompilerLifetime(ts,path,before).inverse,before);
});
