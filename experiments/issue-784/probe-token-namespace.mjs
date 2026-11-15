// One complete actual parent in a one-file diagnostic graph, never production proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../../tools/translation/derive-footprints.mjs';
import {createDeriveBangContext} from '../../tools/translation/derive-bang-context.mjs';
import {resolveModuleBindings} from '../../tools/translation/module-bindings.mjs';
const entry='rust/src/token.rs',source=readFileSync(entry,'utf8');
const manifest=readFileSync('rust/Cargo.toml','utf8'),lock=readFileSync('Cargo.lock','utf8');
if(Buffer.byteLength(source)>131072||Buffer.byteLength(manifest)+Buffer.byteLength(lock)>1048576)throw Error('Finite complete diagnostic inputs required');
const hash=value=>createHash('sha256').update(value).digest('hex'),started=performance.now();
const report=stage=>console.log(JSON.stringify({stage,elapsedMilliseconds:performance.now()-started,memory:process.memoryUsage(),diagnosticOnly:true}));
const graph=resolveModuleGraph({entry,paths:[entry],compilationProfile:PRODUCTION_PROFILE,readSource:path=>{if(path!==entry)throw Error('One complete parent only');return source;}});
const dependencies=loadDeriveDependencyProof({manifest,lock});
const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
report('before-derive-input');
const deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:graph.compilationProfile});
if(deriveContext.certificates.length>16)throw Error('Finite actual derive count required');
report('after-derive-input');
const deriveBangContext=createDeriveBangContext({deriveContext});
report('after-bang-output');
const bindings=resolveModuleBindings({modules:graph.modules,externalModules:deriveFootprintExternalModules(deriveContext),deriveContext,deriveBangContext,compilationProfile:graph.compilationProfile});
report('after-module-bindings');
const record={entry,source,sourceSha256:hash(source),manifest,lock,deriveContext,deriveBangContext,bindings,
 scope:'Complete actual token parent and genuine producers in a one-file graph. Original full-crate uncertainty is not qualified.',
 diagnosticOnly:true,installed:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record));
if(raw.length>64*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const output='ci-logs/issue-784-restart-2/token-namespace-production-parent.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Complete diagnostic readback differs');
console.log(JSON.stringify({output,completeBytes:raw.length,sha256:hash(raw),deriveInputs:deriveContext.certificates.length,bangOutputs:deriveBangContext.certificates.length,
 elapsedMilliseconds:performance.now()-started,diagnosticOnly:true,productionExecutableGain:0}));
