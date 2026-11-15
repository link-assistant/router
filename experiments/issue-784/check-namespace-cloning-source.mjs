// Full-source equation and native syntax review, independent of behavioral tests.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from '../../tools/translation/concrete-source-origin-phases.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const path='tools/translation/source-scopes.mjs',fixture=new URL('../../tools/translation/test/fixtures/namespace-clone-streaming/',import.meta.url);
const row=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')).sources[0];
const before=gunzipSync(readFileSync(new URL(row.storedPath,fixture))).toString('utf8'),after=readFileSync(path,'utf8');
assert.equal(createHash('sha256').update(before).digest('hex'),row.sha256);
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
function clone(source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);
 const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='cloneSourceNamespaces');
 assert.equal(functions.length,1);return {file,node:functions[0]};
}
const old=clone(before),current=clone(after),statements=current.node.body.statements;
const added=statements.filter(node=>ts.isIfStatement(node)&&node.expression.getText(current.file)==='share');
assert.equal(added.length,1);const statement=added[0],start=statement.getFullStart(),end=statement.end;
const insertion=after.slice(start,end);
assert.equal(after.slice(0,start)+after.slice(end),before);
assert.equal(old.node.body.statements.length+1,statements.length);
const anchor=before.slice(start-100,start+100);assert.equal(anchor.length,200);
const at=100,languageRule=exactLiteralSubstitutionRule('language:stream-private-native-namespace-copy',anchor,
 anchor.slice(0,at)+insertion+anchor.slice(at),'Complete original namespace-copy boundary changed');
const phases=[{phase:'language',rules:[languageRule]},{phase:'repository',rules:[]}];
const transformed=createRulePipeline(phases).run(before);assert.equal(transformed.value,after);
const [equation]=transportConcreteNamedSourcePhases([{before,middle:after,after,language:'JavaScript',rules:[
 'language:stream-private-native-namespace-copy','repository:preserve-existing-namespace-api',
 'language:restore-complete-original-namespace-copy','repository:restore-existing-namespace-api']}]);
assert.equal(equation.inverse,before);
assert.ok(after.split('\n').length<1000);
const report={path,before,middle:after,after,inverse:before,insertion,sourceHead:row.sourceHead,
 sourceSha256:row.sha256,typescriptVersion:ts.version,trace:transformed.trace,equation,
 originalFallbackUnchanged:true,allMapsStillIndependent:true,semanticAuthority:false,runtimeParity:false,
 fullGateQualified:false,rustExecuted:false};
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-namespace-cloning-source-equation.json',Buffer.from(JSON.stringify(report)));
console.log(JSON.stringify({output,typescriptVersion:ts.version,passed:true}));
