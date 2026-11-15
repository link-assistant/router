import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareSchemarsWithOutputProposal} from '../prepare-schemars-with-output.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),rootPath=fileURLToPath(root),path='tools/translation/schemars-with-context-candidate.mjs';
function substitute(source,edits){let after=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){assert.equal(after.slice(...edit.span),edit.expected);after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}let inverse=after;for(const edit of [...edits].sort((a,b)=>a.span[0]-b.span[0])){assert.equal(inverse.slice(edit.span[0],edit.span[0]+edit.replacement.length),edit.replacement);inverse=inverse.slice(0,edit.span[0])+edit.expected+inverse.slice(edit.span[0]+edit.replacement.length);}assert.equal(inverse,source);return after;}
function ordered(source,rules,inverse=false){
 for(const rule of inverse?[...rules].reverse():rules){
  const before=inverse?rule.after:rule.before,after=inverse?rule.before:rule.after;
  assert.equal(source.split(before).length,2,'one complete ordered Clone anchor');
  const at=source.indexOf(before);source=source.slice(0,at)+after+source.slice(at+before.length);
 }
 return source;
}

test('actual candidate creator copies the same native-bound byte operation and whole source equation',{timeout:60000},()=>{
 const proposal=prepareSchemarsWithOutputProposal({root:rootPath}),row=proposal.files.find(row=>row.path===path),byte=proposal.enclosingHistory.byteLayer?.files[0];assert.ok(byte,'qualify after the actual byte scope has been materialized');assert.ok(row.changes.byteScope);assert.equal(row.changes.byteScope.privateIssuerUnchanged,true);assert.equal(row.changes.byteScope.scopeCompletesBeforeReturn,true);assert.equal(row.changes.byteScope.sourceAuthority,false);assert.equal(row.current,row.after);
 assert.equal(row.changes.language.length,1);
 const constituents=row.changes.repositoryConstituents,composition=row.changes.byteScope.cloneSourceComposition;
 assert.equal(constituents.length,2);
 assert.deepEqual(constituents.map(edit=>edit.id),['complete-private-Schemars-issuer-import','same-native-byte-operation-import']);
 assert.equal(substitute(row.before,row.changes.language),row.language);
 const originalImports=substitute(row.language,constituents);
 assert.ok(composition,'the complete original import edits precede the actual Clone history');
 assert.equal(composition.schema,'clone-enclosing-ordered-source-composition-v1');
 assert.equal(composition.before,originalImports);assert.equal(composition.middle,originalImports);assert.equal(composition.inverse,originalImports);
 const authored=readFileSync(new URL('../source-profiles/clone-enclosing/source-rules.json',import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(authored).digest('hex'),'f96f44d34c432fa6608ec95dace9769499d09c169f681f482d494f7d26ed1991');
 const profile=JSON.parse(authored),selected=profile.rows.find(rule=>rule.path===byte.path);
 assert.ok(selected);assert.equal(selected.phase,'repository');assert.deepEqual(composition.rules,selected.edits);
 assert.deepEqual(composition.trace.map(rule=>rule.id),selected.edits.map(rule=>rule.id));
 assert.equal(ordered(originalImports,selected.edits),composition.after);
 assert.equal(ordered(composition.after,selected.edits,true),originalImports);
 assert.equal(composition.sourceAuthority,false);assert.equal(composition.runtimeAuthority,false);
 assert.equal(row.changes.repository.length,1);
 const [composed]=row.changes.repository;
 assert.deepEqual(composed.span,[0,row.language.length]);assert.equal(composed.expected,row.language);assert.equal(composed.replacement,composition.after);
 assert.equal(row.changes.repositoryPrefix+substitute(row.language,row.changes.repository),row.after);assert.equal(row.nativeInverse.before,row.before);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');const file=ts.createSourceFile(byte.path,byte.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const imported=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./schemars-enclosing-output-dispatch.mjs');assert.equal(imported.length,1);const node=imported[0].moduleSpecifier,edit={span:[node.getStart(file),node.end],expected:byte.after.slice(node.getStart(file),node.end),replacement:"'./schemars-with-bang-candidate.mjs'"};assert.equal(row.after,row.changes.repositoryPrefix+substitute(byte.after,[edit]));assert.equal(readFileSync(new URL(path,root),'utf8'),row.after);
 const helper=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./default-proof-byte-operation.mjs');assert.equal(helper.length,1);assert.equal(row.changes.byteScope.nativeImport.replacement.trim(),helper[0].getText(file));assert.equal(row.changes.byteScope.nativeCall.replacement,byte.nativeSelections[0].replacement);assert.equal(row.changes.byteScope.originalCall,byte.originalCall);
});

test('a copied candidate context or modified whole byte input never substitutes for the original source pin',{timeout:60000},()=>{
 const proposal=prepareSchemarsWithOutputProposal({root:rootPath}),row=proposal.files.find(row=>row.path===path),actual=readFileSync(new URL('../derive-enclosing-namespace-context.mjs',import.meta.url),'utf8');assert.ok(proposal.enclosingHistory.byteLayer);assert.notEqual(row.after,actual);
 for(const source of [row.after,actual+'\n',actual+'\nfunction unknownOperation(){}\n'])assert.throws(()=>prepareSchemarsWithOutputProposal({root:rootPath,inputSources:{'derive-enclosing-namespace-context.mjs':source}}),/whole pinned source differs/);
 assert.equal(readFileSync(new URL('../derive-enclosing-namespace-context.mjs',import.meta.url),'utf8'),actual);assert.equal(readFileSync(new URL(path,root),'utf8'),row.after);assert.equal(row.changes.byteScope.privateIssuerUnchanged,true);
});
