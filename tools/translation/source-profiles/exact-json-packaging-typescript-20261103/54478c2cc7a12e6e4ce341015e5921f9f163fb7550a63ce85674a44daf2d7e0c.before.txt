// Actual installed compiler source composition case source; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withBorrowedStandardMapCompilerSources} from '../borrowed-standard-map-20261103-project.mjs';
import {proposeBorrowedJsonToolProjectSources} from '../borrowed-json-tool-project-20261103-profile.mjs';
import {proposeBorrowedJsonToolPredicateSourceSuccessors} from '../borrowed-json-tool-predicate-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('actual original complete compiler-source guard admits installed JSON packaging and retains callback primaries',{timeout:60000},()=>{
 const marker=Object.freeze({consumer:'source-only-receiving'});let calls=0;assert.equal(withBorrowedStandardMapCompilerSources(()=>{calls++;return marker;}),marker);assert.equal(calls,1);for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original callback primary'))]){let caught=false;try{withBorrowedStandardMapCompilerSources(()=>{throw primary;});}catch(error){caught=true;assert.equal(error,primary);}assert.equal(caught,true);}
});
test('whole project/adoption case sources retain complete ancestry through both substitution phases',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolProjectSources();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);assert.equal(stage.history.inverse,stage.before);}}assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
});
test('earlier uninstalled proposal afterimages join the installed target with exact inverses',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolPredicateSourceSuccessors();for(const row of proposal.files){assert.equal(row.currentAfter,readFileSync(join(ROOT,row.path),'utf8'));const later=row.laterHistories[0];assert.equal(later.before,row.after);assert.equal(later.inverse,row.after);assert.equal(later.after,row.currentAfter);assert.equal(transportConcreteSyntaxMeta(later.history.beforeMeta).source,row.after);assert.equal(transportConcreteSyntaxMeta(later.history.afterMeta).source,row.currentAfter);assert.equal(later.semanticAuthority,false);}assert.equal(proposal.privateCallerQualified,false);
});
