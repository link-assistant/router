// Fixed explicit receiving case SOURCE, never a production coverage row.
// Imported only by the dedicated fresh-package --receive driver.
import './test/ordered-text-map-callers-20261102-canonical-cases.mjs';
import './test/ordered-text-map-callers-20261102-unit-cases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {withCurrentCanonicalMapCompiler} from './ordered-map-canonical-activation-20261102.mjs';
import {compactSparseGit} from './compact-sparse-git-io-20261102.mjs';
import {orderedTextMapUnitParentSourceData} from './ordered-text-map-callers-20261102-unit-profile.mjs';
import {orderedTextMapCanonicalParentSourceData} from './ordered-text-map-canonical-20261102-profile.mjs';
import {orderedTextMapCallerParentSourceData} from './ordered-text-map-callers-20261102-profile.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('complete current29 cohort uses original installed source without a compiler clone',{timeout:60000},()=>{
 const rows=[...orderedTextMapCallerParentSourceData(),...orderedTextMapCanonicalParentSourceData(),...orderedTextMapUnitParentSourceData()];assert.equal(rows.length,29);for(const row of rows)assert.equal(readFileSync(join(root,row.path),'utf8'),row.after);
 let calls=0;const result=withCurrentCanonicalMapCompiler({sourceRoot:root,deadline:performance.now()+60000},(token,scope)=>{calls++;assert.equal(token,null);assert.equal(scope.installedSource,true);assert.equal(scope.root,root);assert.equal(scope.sourceAuthority,false);assert.equal(scope.semanticAuthority,false);return 'actual-source-only';});assert.equal(result,'actual-source-only');assert.equal(calls,1);
});
test('receiving package has its own actual committed source tree without inheriting original authority',{timeout:60000},()=>{
 const receipt=JSON.parse(readFileSync(join(root,'ordered-text-map-callers-20261102-package.json'),'utf8')),head=compactSparseGit(root,['rev-parse','--verify','HEAD'],{maxBytes:1024}).trim(),tree=compactSparseGit(root,['rev-parse','HEAD^{tree}'],{maxBytes:1024}).trim();
 assert.equal(head,receipt.localPackageSourceCommit);assert.equal(tree,receipt.localPackageSourceTree);assert.equal(receipt.localPackageCommitAuthority,false);assert.equal(receipt.unitCompilerExecuted,false);assert.equal(receipt.requiresFreshProcess,true);assert.equal(receipt.unitParentEquations.length,12);assert.equal(receipt.canonicalParentEquations.length,3);assert.ok(receipt.currentClosure.some(row=>row.path==='rust/tests/borrowed_standard_map_20261102_test.rs'));
 for(const name of ['rust/src/lib.rs','rust/src/openai.rs','rust/src/translation_ordered_text_map_core.rs','rust/build.rs','Cargo.toml','rust/Cargo.toml','Cargo.lock'])assert.ok(receipt.receivingNativeInputs.some(row=>row.path===name),name);
});
