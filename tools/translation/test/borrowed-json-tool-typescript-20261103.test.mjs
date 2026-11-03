// Complete source ancestry cases only; execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeBorrowedJsonToolTypeScriptSources} from '../borrowed-json-tool-typescript-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('strict JSON facade adoption retains complete six-parent before/after source and both phase inverses',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolTypeScriptSources();assert.equal(proposal.files.length,6);for(const row of proposal.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);assert.equal(stage.history.inverse,stage.before);}}assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
});
