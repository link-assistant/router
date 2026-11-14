// Historical comparison DATA only; actual graph behavior stays independently tested.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-source-origin-phases.mjs';
import {deriveProjectSourceOriginAdoption} from '../prepare-project-source-origin-cst.mjs';
const path='tools/translation/project.mjs';
const profiles=[
 {url:new URL('../source-profiles/project-namespace-composition/source-rules.json',import.meta.url),
  sha256:'67fe9db0a517b6050ff9117a59c427ba880272e93a9fa90417ad61affcd74730'},
 {url:new URL('../source-profiles/namespace-progress-observer/0-rules.json',import.meta.url),
  sha256:'23eabe8f329efc2534b7da89442c3273fea75056b1d05469987124ef7ff5cf46'},
 {url:new URL('../source-profiles/project-ingress-native-boundary/source-rules.json',import.meta.url),
   sha256:'f72a45665a7592f6047daad51a082ff0a11d5b9614a699be562a480e4bac76ff'},
 {url:new URL('../source-profiles/ordinary-parser-enclosing-namespace/source-rules.json',import.meta.url),
   sha256:'a2d5b73d7c2ed51234e4eae99c0381b6f51d32f948421fb47bea757684d7531f'},
 {url:new URL('../source-profiles/project-matches-analysis/source-rules.json',import.meta.url),
   sha256:'4b4692687b1e4726bede9a861bd08b4574341f571154b00d2f66efbafd0facf7'},
];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project progress source history: '+message);};
export function restoreProjectProgressSourceHistory(source,retain=()=>{}){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144||typeof retain!=='function')
  fail('bounded complete primitive source and callback required');
 const inputs=profiles.map(row=>{
  const state=lstatSync(row.url);
  if(!state.isFile()||state.isSymbolicLink()||state.size>131072)
   fail('bounded ordinary authored profile required');
  const bytes=readFileSync(row.url);
  if(bytes.length!==state.size||hash(bytes)!==row.sha256)fail('complete authored profile differs');
  return {...row,bytes,input:JSON.parse(bytes)};
 });
 const ts=ownershipCompiler(),projectSourceOrigin=deriveProjectSourceOriginAdoption(ts,source);
 if(hash(projectSourceOrigin.before)!==inputs.at(-1).input.afterSha256)fail('unregistered complete current project source');
 let before=projectSourceOrigin.before;
 for(const {input}of [...inputs].reverse()){
  if(hash(before)!==input.afterSha256)fail('complete source history boundary differs');
  for(const edit of [...input.edits].reverse()){
   if(before.split(edit.after).length!==2)fail('complete inverse anchor differs');
   before=before.replace(edit.after,()=>edit.before);
  }
  if(hash(before)!==input.beforeSha256)fail('complete source predecessor differs');
 }
 const layers=[];let after=before;
 for(const row of inputs){
  const layer=derivePinnedRepositorySourceEvolution(ts,{
   profile:row.url,profileSha256:row.sha256,path,source:after});
  if(layer.inverse!==after)fail('complete source layer inverse differs');
  layers.push(layer);after=layer.after;
 }
 if(after!==projectSourceOrigin.before||projectSourceOrigin.inverse!==after)fail('complete forward replay differs');
 layers.push(projectSourceOrigin);after=projectSourceOrigin.current;
 if(after!==source)fail('complete source-origin forward replay differs');
 const proof={before,after,inverse:before,layers,sourceAuthority:false,
  semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
 const [equation]=transportConcreteNamedSourcePhases([{before,middle:before,
  after:source,language:'JavaScript',rules:['javascript:retain-complete-progress-predecessor',
   'router:join-complete-project-namespace-successor','javascript:restore-complete-progress-predecessor',
   'router:restore-complete-progress-predecessor']}]);
 if(equation.before!==before||equation.after!==source||equation.inverse!==before)
  fail('complete serialized concrete syntax equation differs');
 for(const row of inputs)if(!readFileSync(row.url).equals(row.bytes))
  fail('authored profile changed during derivation');
 retain('complete-project-progress-receiving-history',{path,current:source,historical:before,
  proof,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
  productionExecutableGain:0});
 return before;
}
