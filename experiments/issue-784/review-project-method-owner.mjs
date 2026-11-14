// Independent whole-source review before the real producer output is installed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';

const plan=prepareProjectFacadeRetention(),row=plan.files[0],recipe=row.selection.methodOwnerScope,hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.files.length,1);
assert.equal(execFileSync('git',['show','HEAD:'+row.path],{encoding:'utf8'}),row.current);
assert.equal(row.current,recipe.before+row.selection.helpers);assert.equal(row.after,recipe.after+row.selection.helpers);
assert.equal(recipe.inverse,recipe.before);assert.equal(row.selection.completeNativeInverse,row.before);assert.equal(row.inverse,row.before);assert.equal(recipe.edits.length,2);
assert.deepEqual(recipe.languageRules.map(rule=>rule.id),['javascript:link-original-method-private-parser-scope']);assert.deepEqual(recipe.repositoryRules,[]);
let source=recipe.before;for(const edit of [...recipe.edits].reverse()){assert.equal(source.slice(...edit.span),edit.expected);source=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);}assert.equal(source,recipe.after);
for(const edit of [...recipe.edits].reverse()){assert.equal(source.slice(...edit.afterSpan),edit.replacement);source=source.slice(0,edit.afterSpan[0])+edit.expected+source.slice(edit.afterSpan[1]);}assert.equal(source,recipe.before);
assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);source=row.before;
for(const stage of row.stages){assert.equal(stage.before,source);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.completeInverse,true);assert.equal(stage.inverse,source);source=stage.after;}assert.equal(source,row.after);
assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
const bytes=Buffer.from(JSON.stringify({schema:'independent-whole-project-method-owner-source-review-v1',plan,sourceAuthority:false,runtimeQualified:false})+'\n');assert.ok(bytes.length<64*1024*1024);
const output='ci-logs/issue-784-restart-2/project-method-owner-complete-source-review.json.gz';writeFileSync(output,gzipSync(bytes),{flag:'wx'});assert.ok(gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(bytes));
assert.equal(readFileSync(row.path,'utf8'),row.current);writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);
console.log(JSON.stringify({installed:true,outputs:1,nativeEdits:recipe.edits.length,wholeOriginalInverse:true,existingCallableBodiesPreserved:true,reviewLogicalBytes:bytes.length,reviewSha256:hash(bytes),runtimeQualified:false}));
