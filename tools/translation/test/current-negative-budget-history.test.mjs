import test from 'node:test';
import assert from 'node:assert/strict';
import {readNativeProofFormatSourceHistory as readFileSync} from './native-proof-format-source-history.mjs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {deriveCurrentNegativeBudgetProofHistory} from '../prepare-negative-budget-proof-json.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const path='tools/translation/test/fixtures/native-proof-json-format.mjs';
const actual=()=>readFileSync(new URL('./fixtures/native-proof-json-format.mjs',import.meta.url),'utf8');
function predecessor(){
 const source=actual(),ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);
 const declarations=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='restoreCurrentNegativeBudgetProofConsumerSource');
 assert.equal(declarations.length,1);
 const marker='\n// The later operation-byte bridge keeps its complete original default call.\n',at=source.indexOf(marker);
 assert.ok(at>0);assert.equal(source.indexOf(marker,at+1),-1);
 assert.equal(declarations[0].end,source.trimEnd().length);
 const owner=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='statelessProofConsumerSource'),first=owner.body.statements[0];
 assert.equal(first.getText(file),'source=restoreCurrentNegativeBudgetProofConsumerSource(source,retain);');
 const call=' source=restoreCurrentNegativeBudgetProofConsumerSource(source,retain);\n';
 assert.equal(source.slice(first.getFullStart()+1,first.end+1),call);
 const withoutAppend=source.slice(0,at),before=withoutAppend.slice(0,first.getFullStart()+1)+withoutAppend.slice(first.end+1);
 return {source,before,ts};
}

test('current negative-budget history reproduces the complete physical fixture and both source phases',{timeout:60000},()=>{
 const {source,before,ts}=predecessor();
 assert.equal(createHash('sha256').update(source).digest('hex'),'00fb351cb0831fd61ccf62c6c50f30a9f77935732e9affb90a110962b2b0056a');
 const result=deriveCurrentNegativeBudgetProofHistory(before);
 assert.equal(result.original,before);assert.equal(result.inverse,before);assert.equal(result.after,source);
 assert.equal(transportConcreteSyntaxMeta(result.beforeMeta).source,before);
 assert.equal(transportConcreteSyntaxMeta(result.afterMeta).source,source);
 assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
 assert.equal(result.nativeSelections.length,2);
 assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.runtimeAuthority,false);
 const parse=value=>ts.createSourceFile(path,value,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),old=parse(before),current=parse(source);
 for(const node of old.statements){
  if(!ts.isFunctionDeclaration(node)||node.name?.text==='statelessProofConsumerSource')continue;
  const matches=current.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text===node.name.text);
  assert.equal(matches.length,1);assert.equal(matches[0].getText(current),node.getText(old));
 }
 assert.equal(actual(),source);
});

test('changed complete history append call and malformed source refuse before a proposal',{timeout:60000},()=>{
 const {source,before}=predecessor();
 assert.throws(()=>deriveCurrentNegativeBudgetProofHistory(source),/one complete preceding negative-budget history/);
 assert.throws(()=>deriveCurrentNegativeBudgetProofHistory(before.replace('restore-negative-budget-factory','foreign-negative-budget-factory')),/one complete preceding negative-budget history/);
 assert.throws(()=>deriveCurrentNegativeBudgetProofHistory(before.replace('source=restoreNegativeBudgetProofConsumerSource(source,retain);','source=restoreNegativeBudgetProofConsumerSource(source);')),/actual original first history call/);
 assert.throws(()=>deriveCurrentNegativeBudgetProofHistory(before+'\nexport function broken( {'),/complete native grammar/);
 assert.throws(()=>deriveCurrentNegativeBudgetProofHistory(null),/complete receiving history source/);
 assert.equal(actual(),source);
});
