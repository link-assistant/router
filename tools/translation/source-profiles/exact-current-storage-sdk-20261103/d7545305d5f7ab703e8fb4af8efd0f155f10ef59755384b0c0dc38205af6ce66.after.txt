// Explicit complete copied SDK/actual copied compiler receiving SOURCE, UNRUN.
import {registerCompleteTypeScriptReceivingCases} from './test/complete-typescript-receiving-20261103-full.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {realpathSync,readFileSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';
import {planReadonlySourceSdkCompanion as planOrderedMapSdkCompanion} from './ordered-text-map-callers-20261102-source-storage-sdk.mjs';
import {compactSparsePhysicalCensus} from './compact-sparse-git-io-20261102.mjs';
const compilerRoot=fileURLToPath(new URL('../../',import.meta.url)),receipt=JSON.parse(readFileSync(join(compilerRoot,'ordered-text-map-callers-20261102-package.json'),'utf8')),sdkRoot=realpathSync(receipt.sdkSourceRoot),workspace=realpathSync(receipt.companionRoot),temporary=realpathSync(receipt.temporaryRoot);
if(!compilerRoot.startsWith(workspace+sep)||!sdkRoot.startsWith(workspace+sep)||!temporary.startsWith(workspace+sep))throw TypeError('Complete actual copied roots must share the original bounded receiving workspace');
registerCompleteTypeScriptReceivingCases({sourceRoot:sdkRoot,compilerRoot});
test('all receiver compiler and strict tsc commands resolve the copied complete SDK',{timeout:60000},()=>{
 assert.equal(realpathSync(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT),sdkRoot);assert.equal(realpathSync(process.env.ROUTER_ORDERED_MAP_CASE_SOURCE_ROOT),sdkRoot);for(const key of ['TMPDIR','TMP','TEMP'])assert.equal(realpathSync(process.env[key]),temporary);
 const require=createRequire(join(sdkRoot,'js/package.json'));assert.equal(require.resolve('typescript/package.json'),join(sdkRoot,'js/node_modules/typescript/package.json'));assert.equal(receipt.sdkPackage.originalInstalledSnapshotClosed,true);assert.equal(receipt.sdkPackage.tarballIntegrityVerified,false);assert.equal(receipt.sdkPackage.compilerQualified,false);
 const sdkBytes=compactSparsePhysicalCensus(receipt.sdkPackage.container,{maximum:201326592}).total,plan=planOrderedMapSdkCompanion({sourceRoot:compilerRoot,workspaceRoot:workspace});assert.equal(plan.admissible,true);assert.ok(plan.requiredBytes<=402653184);assert.ok(compactSparsePhysicalCensus(workspace,{maximum:402653184}).total<=402653184);
});
