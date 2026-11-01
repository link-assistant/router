// Deferred native CI planning DATA only. Importing performs no I/O or spawn.
// Public plans/context records never authorize Rust or semantic admission.
import {FEEDBACK_STAGES} from '../../scripts/ci-feedback-cycle.mjs';
import {types} from 'node:util';
export const NATIVE_PROFILE_ORACLE_LIMITS=Object.freeze({
 deadlineMs:1200000,sourceBytes:268435456,sourceFileBytes:33554432,sourcePaths:50000,
 rawBytes:67108864,evidenceBytes:402653184,freeReserveBytes:2147483648,
 pathBytes:4096,gitBytes:16777216,jobs:2,sampledRssBytes:3221225472,sampleMs:2000,
});
export const NATIVE_PROFILE_ORACLES=Object.freeze([Object.freeze({
 id:'persistent-output-20261101',
 module:'./persistent-output-backend-20261101-profile.mjs',
 visitor:'visitPersistentOutputSourceEquations',
 nativeSourceModule:'./persistent-output-portable-source-20261101.mjs',
 nativeSourceVisitor:'visitPortablePersistentOutputSourceEquations',
 archive:'tools/translation/source-profiles/persistent-output-backend-20261101/complete-sources.json.gz',
 archiveSha256:'987bf66da673c7b8de990ffa9ba9aff5fa6711e8be3259f061dba7f723046642',
 oracle:'rust/tests/oracles/persistent_output_backend_20261101.rs',
 target:'persistent_output_profile_oracle_20261101',
}),Object.freeze({
 id:'dynamic-primitive-output-20261101',
 module:'./dynamic-primitive-output-20261101-profile.mjs',
 visitor:'visitDynamicOutputSourceEquations',
 nativeSourceModule:'./dynamic-output-portable-source-20261101.mjs',
 nativeSourceVisitor:'visitPortableDynamicOutputSourceEquations',
 archive:'tools/translation/source-profiles/dynamic-primitive-output-20261101/complete-sources.json.gz',
 archiveSha256:'4d3d5f4ff3bceb05378f85f08993fea89170380c39c71134b0ac5a34fc8f57a3',
 oracle:'rust/tests/oracles/dynamic_primitive_output_20261101.rs',
 extraOracles:Object.freeze(['rust/tests/oracles/generalized_primitive_output_20261101.rs']),
 target:'dynamic_primitive_output_profile_oracle_20261101',
})]);
const fail=message=>{throw new TypeError('Deferred native profile CI: '+message);};
function data(value,names){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own context DATA required');
 const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))fail('exact context DATA fields required');
 return Object.fromEntries(names.map(key=>{const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('own context fields without getters required');if(field.value!==undefined&&typeof field.value!=='string')fail('primitive environment context strings required');return [key,field.value];}));
}
export function inspectNativeProfileCiContext(value){
 const context=data(value,['ci','actions','runnerEnvironment','job','repository','workflowRef','runId','runAttempt','sourceSha','checkoutSha','javascriptResult']);
 const reasons=[];
 if(context.ci!=='true'||context.actions!=='true'||context.runnerEnvironment!=='github-hosted')reasons.push('requires the designated hosted GitHub Actions job; local Rust is forbidden');
 if(context.job!=='test')reasons.push('requires the existing gated native test job');
 if(typeof context.repository!=='string'||! /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(context.repository))reasons.push('exact repository context missing');
 if(typeof context.workflowRef!=='string'||typeof context.repository!=='string'||!context.workflowRef.startsWith(context.repository+'/.github/workflows/release.yml@')||/[\0\r\n]/u.test(context.workflowRef))reasons.push('reviewed release workflow context missing');
 for(const field of ['runId','runAttempt'])if(typeof context[field]!=='string'||! /^[1-9][0-9]{0,19}$/u.test(context[field]))reasons.push('exact bounded '+field+' missing');
 if(typeof context.sourceSha!=='string'||! /^[a-f0-9]{40}$/u.test(context.sourceSha)||context.checkoutSha!==context.sourceSha)reasons.push('immutable same-source checkout missing');
 if(context.javascriptResult!=='success')reasons.push('all-eight-stage reusable JavaScript workflow must have succeeded');
 return Object.freeze({schema:'native-profile-ci-context-data-v1',eligibleContext:reasons.length===0,reasons:Object.freeze(reasons),requiredJavaScriptStages:FEEDBACK_STAGES,sourceSha:context.sourceSha,executionAuthority:false,semanticAuthority:false,runtimeParity:false});
}
export function nativeProfileOracleCommand(profileId){
 const profile=NATIVE_PROFILE_ORACLES.find(row=>row.id===profileId);if(!profile)fail('unknown native profile; no caller-defined module/target/command override');
 return Object.freeze({file:'cargo',args:Object.freeze(['test','--locked','--offline','--all-features','--jobs',String(NATIVE_PROFILE_ORACLE_LIMITS.jobs),'--test',profile.target,'--','--test-threads=1','--nocapture']),profileId:profile.id,
 preservesOriginalCommands:true,sourcePlanOnly:true,executionAuthority:false,semanticAuthority:false});
}
export function nativeProfileOracleTargetSource(profileId){
 const profile=NATIVE_PROFILE_ORACLES.find(row=>row.id===profileId);if(!profile)fail('unknown fixed native oracle');
 const leaf=profile.oracle.slice('rust/tests/'.length);
 let source='//! Installed-profile native oracle; only after all eight same-SHA JS gates.\n#[path = '+JSON.stringify(leaf)+']\nmod installed_profile_oracle;\n';for(const [at,path]of (profile.extraOracles??[]).entries()){if(!/^rust\/tests\/oracles\/[a-z0-9_]+\.rs$/u.test(path)||path===profile.oracle)fail('exact distinct closed additional native oracle required');source+='#[path = '+JSON.stringify(path.slice('rust/tests/'.length))+']\nmod installed_extra_oracle_'+at+';\n';}return source;
}
