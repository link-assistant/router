// Source-only application adoption checks; native behavior remains CI-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {proposeBorrowedJsonToolApplicationSources} from '../borrowed-json-tool-application-20261103-profile.mjs';
import {proposeBorrowedJsonToolPredicateSourceSuccessors} from '../borrowed-json-tool-predicate-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('actual whole tool caller keeps its original input and result across native leaf adoption',()=>{
 const proposal=proposeBorrowedJsonToolApplicationSources();assert.equal(proposal.files.length,4);assert.equal(proposal.semanticAuthority,false);const original=proposeBorrowedJsonToolPredicateSourceSuccessors();
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 const caller=proposal.files.find(row=>row.path==='rust/src/openai_tools.rs'),root=proposal.files.find(row=>row.path==='rust/src/lib.rs');assert.equal(original.applicationSources.find(row=>row.path===caller.path).source,caller.before);assert.equal(original.applicationSources.find(row=>row.path===root.path).source,root.before);
 assert.match(caller.before,/fn is_translatable\(tool: &Value\) -> bool/u);assert.match(caller.after,/fn is_translatable\(tool: &Value\) -> bool/u);assert.match(caller.after,/crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable\(tool\)/u);assert.match(root.after,/pub mod borrowed_json_tool_predicate_20261103;/u);
 const oracle=proposal.files.find(row=>row.path==='rust/tests/borrowed_json_tool_predicate_20261103_test.rs');assert.match(oracle.after,/include!\("\.\.\/src\/openai_tools.rs"\)/u);assert.match(oracle.after,/pub use link_assistant_router::borrowed_json_tool_predicate_20261103;/u);
});
