// Review complete native/CST source equations before installing a generated fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareGuardedProofScanCostReceivingImports} from '../../tools/translation/prepare-guarded-proof-receiving-imports.mjs';
import {assertGuardedProofLexingInputsFresh} from '../../tools/translation/prepare-guarded-proof-lexing.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const root=process.cwd(),plan=prepareGuardedProofScanCostReceivingImports({root}),row=plan.files[0],hash=value=>createHash('sha256').update(value).digest('hex'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(plan.files.length,1);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeBodyChanged,false);assert.equal(plan.originalEightCasesAndDeadlinesUnchanged,true);assert.equal(plan.receivingExecuted,false);
assert.equal(execFileSync('git',['show','HEAD:'+row.path],{encoding:'utf8'}),row.before);assert.notEqual(row.before,row.after);assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));
const [selection]=row.selections;assert.equal(row.selections.length,1);assert.equal(selection.owner,'fixture');assert.equal(selection.expected,"'original-lexing-intrinsics.mjs'");assert.equal(selection.replacement,'"guarded-proof-lexing-intrinsics.mjs"');
assert.equal(row.after,row.before.slice(0,selection.span[0])+selection.replacement+row.before.slice(selection.span[1]));assert.equal(row.nativeInverse,row.before);assert.equal(row.inverse,row.before);
function cases(source){const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),values=[];assert.equal(file.parseDiagnostics.length,0);function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='test'&&ts.isStringLiteral(node.arguments[0]))values.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return values;}
assert.equal(cases(row.before).length,8);assert.deepEqual(cases(row.before),cases(row.after));
assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);let source=row.before;
for(const stage of row.stages){assert.equal(stage.before,source);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,source);for(const key of ['languageRules','repositoryRules'])for(const rule of stage.sequence[key])for(const edit of rule.edits){assert.deepEqual(edit.span,[0,source.length]);assert.equal(edit.expected,source);source=edit.replacement;}assert.equal(source,stage.after);}assert.equal(source,row.after);
assertGuardedProofLexingInputsFresh(plan.guarded);assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.before);
const result={schema:'independent-complete-scan-cost-relocation-review-v1',plan,typescript:ts.version,wholeTestBodiesEqual:true,sourceAuthority:false,rustExecuted:false};
const bytes=Buffer.from(JSON.stringify(result)+'\n');assert.ok(bytes.length<64*1024*1024);const output=resolve(root,'ci-logs/issue-784-restart-2/scan-cost-relocation-complete-source-review.json.gz');writeFileSync(output,gzipSync(bytes),{flag:'wx'});assert.ok(gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(bytes));
assertGuardedProofLexingInputsFresh(plan.guarded);assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.before);writeFileSync(resolve(root,row.path),row.after);assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.after);
console.log(JSON.stringify({installed:true,outputs:1,completeCasesPreserved:8,originalDeadlinesPreserved:true,typescript:ts.version,reviewLogicalBytes:bytes.length,reviewSha256:hash(bytes),runtimeQualified:false}));
