// Three finite genuine Clone routes in a fresh process; no deadline qualification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {builtinDeriveDataInputs} from '../../tools/translation/builtin-derive-data-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../../tools/translation/builtin-derive-ast-meta.mjs';
import {liftBuiltinCloneAstRoute,validateBuiltinCloneAstOutput} from '../../tools/translation/builtin-clone-ast-route.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourcePath='tools/translation/builtin-clone-ast-route.mjs';
const sourceBefore=readFileSync(sourcePath);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(rustPackageSourcePath(process.cwd(),'Cargo.toml'),'utf8'),lock:readFileSync(rustPackageSourcePath(process.cwd(),'Cargo.lock'),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone');
const source='#[derive(Clone)]pub struct Finite{value:String}';
const context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
const certificate=context.certificates[0],input=builtinDeriveDataInputs({source,span:certificate.span});
const request={profile,entry,certificate,input,original:{dependencies,module:{source}}};
const rows=[];
for(let at=0;at<3;at++){
 const started=performance.now(),output=liftBuiltinCloneAstRoute(request),elapsedMs=performance.now()-started;
 assert.equal(validateBuiltinCloneAstOutput(output,output.branches),true);
 const encoded=JSON.stringify(output);
 rows.push({index:at,existingPrivatePlanWarm:at>0,elapsedMs,completeOutputBytes:Buffer.byteLength(encoded),completeOutputSha256:hash(encoded),frozen:Object.isFrozen(output)});
}
assert.equal(readFileSync(sourcePath).equals(sourceBefore),true);
assert.equal(new Set(rows.map(row=>row.completeOutputSha256)).size,1);
console.log(JSON.stringify({engine:process.versions,sourceSha256:hash(sourceBefore),rows,diagnosticOnly:true,semanticAuthority:false,runtimeParity:false}));
