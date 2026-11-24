import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
for(const [file,type,fields]of [['src/cli/emergency_args.rs','EmergencyArgs',{emergency_accept_any_token:true,emergency_allow_non_loopback:false,emergency_duration_minutes:73n}],['src/cli/management_args.rs','ManagementArgs',{allow_remote:true,lockout_failures:9n,lockout_secs:77n,exempt_loopback:false}]])test('complete unchanged '+file+' original compiler Clone shared call executes its own primitive fields',async()=>{
  const source=readFileSync(repositorySourceURL(file,root),'utf8'),result=translateProject({entry:file,paths:[file],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  if(process.env.ROUTER_CLONE_EVIDENCE_DIR){mkdirSync(process.env.ROUTER_CLONE_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.ROUTER_CLONE_EVIDENCE_DIR+'/original-'+type+'.json.gz',gzipSync(JSON.stringify({source,...result},null,2)+'\n'));}
  const generated=result.meta.checkedGeneratedMethods?.find(row=>row.name===type+'.clone');assert.ok(generated,JSON.stringify(result.meta.refused));assert.equal(generated.generator,'core::clone::Clone');assert.equal(generated.cloneSourceProof.selectedBranch,'has_derive_copy=false');assert.equal(generated.cloneSourceProof.noDropProof.copyAuthority,false);assert.equal(result.meta.runtimeParity,false);
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),entry=[...program.declarations.values()].find(entry=>entry.impl?.cloneSourceProof?.typePath.at(-1)===type),aliased={...result,javascript:result.javascript+`\nexport {${entry.fullName} as originalClone};`,typescript:result.typescript+`\nexport {${entry.fullName} as originalClone};`};
  await verifyTypedTargets(aliased,(_api,_result,module)=>{const input=Object.freeze({$:type,...fields}),output=module.originalClone(input);assert.deepEqual(output,input);assert.notStrictEqual(output,input);assert.notStrictEqual(module.originalClone(input),output);assert.throws(()=>module.originalClone({...input}),/immutable|frozen/i);},{childTimeoutMs:30000});
});
