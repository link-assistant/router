// Actual SCM-size resource admission SOURCE only. No SDK/case has been run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {planOrderedMapSdkCompanion} from '../ordered-text-map-callers-20261102-sdk-companion.mjs';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete original workload resource preflight never treats two oversized hot closures as qualified',{timeout:30000},()=>{
 const plan=planOrderedMapSdkCompanion({sourceRoot:root,sdkBytes:0});assert.equal(plan.sourceHead,compactSparseGit(root,['rev-parse','HEAD'],{maxBytes:1024}).trim());assert.ok(plan.files>0);assert.ok(plan.requiredBytes>=plan.logicalBytes*2);assert.equal(plan.compressionTrialled,false);assert.equal(plan.resourceQualification,'UNRUN');assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);
 if(plan.logicalBytes*2>402653184)assert.equal(plan.admissible,false);
 assert.throws(()=>planOrderedMapSdkCompanion({sourceRoot:root,sdkBytes:-1}));
});
