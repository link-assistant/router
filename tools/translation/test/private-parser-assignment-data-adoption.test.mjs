import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {preparePrivateParserAssignmentDataAdoption} from '../prepare-private-parser-assignment-data-adoption.mjs';
const target=new URL('../private-parser-execution.mjs',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');

test('emit-only original-module proposal retains old DATA all noncall bytes complete native phases and inverses',{timeout:60000},()=>{
 const before=readFileSync(target,'utf8'),plan=preparePrivateParserAssignmentDataAdoption(),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(row.path,'tools/translation/private-parser-execution.mjs');assert.equal(row.before,before);assert.equal(row.current,before);assert.equal(row.inverse,before);assert.equal(row.selection.independentNativeInverse,before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(plan.defaultChanged,false);assert.equal(plan.proposedDefaultChanged,true);assert.equal(plan.installed,false);assert.equal(plan.receivingQualified,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.publicAPIChanged,false);
 assert.deepStrictEqual(row.selection.owners.map(owner=>owner.name),['execute','lexPrivateConcreteSources']);assert.equal(row.selection.edits.length,3);assert.ok(row.selection.edits.every(edit=>edit.expected==='data'&&edit.replacement==='assignmentData'));assert.equal(row.selection.oldDataUnchanged,true);assert.equal(row.selection.allOtherOriginalBytesUnchanged,true);assert.equal(row.selection.existingPrivateCompilationStateUnchanged,true);
 for(const name of ['append','route']){const phase=row.steps[name];assert.equal(phase.inverse,phase.before);assert.ok(phase.beforeMeta);assert.ok(phase.afterMeta);}
 assert.equal(row.steps.append.before,before);assert.equal(row.steps.append.after,row.steps.route.before);assert.equal(row.steps.route.after,row.after);assert.equal(row.phases.language.before,before);assert.equal(row.phases.language.after,row.after);assert.equal(row.phases.language.inverse,before);assert.equal(row.phases.repository.before,row.after);assert.equal(row.phases.repository.after,row.after);assert.equal(row.phases.repository.inverse,row.after);assert.equal(row.sequence.languageRules.length,2);assert.equal(row.sequence.repositoryRules.length,1);
 for(const input of plan.inputs){assert.equal(hash(readFileSync(new URL('../../../'+input.path,import.meta.url))),input.sha256);assert.ok(input.identity.ino);}
 assert.equal(readFileSync(target,'utf8'),before,'proposal construction never installs the proposed original-module bytes');
});

test('proposal CLI rejects write and check modes without changing the original physical executor',{timeout:60000},()=>{
 const before=readFileSync(target),producer=fileURLToPath(new URL('../prepare-private-parser-assignment-data-adoption.mjs',import.meta.url));
 for(const mode of ['--write','--check']){const run=spawnSync(process.execPath,[producer,mode],{encoding:'utf8',timeout:12500,maxBuffer:8*1024*1024});assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.notEqual(run.status,0);assert.match(run.stderr,/emit-only proposal; use --emit/u);assert.equal(run.stdout,'');assert.deepStrictEqual(readFileSync(target),before);}
});
