// Historical comparison DATA only; actual graph behavior stays independently tested.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-source-origin-phases.mjs';

const path='tools/translation/project.mjs';
const profile=new URL('../source-profiles/project-namespace-composition/source-rules.json',import.meta.url);
const profileSha256='67fe9db0a517b6050ff9117a59c427ba880272e93a9fa90417ad61affcd74730';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project progress source history: '+message);};

export function restoreProjectProgressSourceHistory(source,retain=()=>{}){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144||typeof retain!=='function')
  fail('bounded complete primitive source and callback required');
 const state=lstatSync(profile);
 if(!state.isFile()||state.isSymbolicLink()||state.size>131072)
  fail('bounded ordinary authored profile required');
 const bytes=readFileSync(profile);
 if(bytes.length!==state.size||hash(bytes)!==profileSha256)fail('complete authored profile differs');
 const input=JSON.parse(bytes);
 if(hash(source)!==input.afterSha256)fail('unregistered complete current project source');
 let before=source;
 for(const edit of [...input.edits].reverse()){
  if(before.split(edit.after).length!==2)fail('complete inverse anchor differs');
  before=before.replace(edit.after,()=>edit.before);
 }
 const proof=derivePinnedRepositorySourceEvolution(ownershipCompiler(),{
  profile,profileSha256,path,source:before,
 });
 if(proof.after!==source||proof.inverse!==before)fail('complete forward replay differs');
 const [equation]=transportConcreteNamedSourcePhases([{before,middle:before,
  after:source,language:'JavaScript',rules:['javascript:retain-complete-progress-predecessor',
   'router:join-complete-project-namespace-successor','javascript:restore-complete-progress-predecessor',
   'router:restore-complete-progress-predecessor']}]);
 if(equation.before!==before||equation.after!==source||equation.inverse!==before)
  fail('complete serialized concrete syntax equation differs');
 if(!readFileSync(profile).equals(bytes))fail('authored profile changed during derivation');
 retain('complete-project-progress-receiving-history',{path,current:source,historical:before,
  proof,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
  productionExecutableGain:0});
 return before;
}
