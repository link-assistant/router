// Source-only preparation. Every complete output retains fresh native checks.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
import {transportConcreteSourcePhases} from './concrete-sequential-equations.mjs';
import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE=new URL('./source-profiles/candidate-binding-batches/',import.meta.url);
const MANIFEST='71cd2ad366b10fa24a540fa7d20810dd63c89245656ec6fc875cfe8326802703';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Candidate binding source: '+message);};
export function prepareCandidateBindingBatches({root=ROOT}={}){
 root=resolve(root);const originalManifest=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(originalManifest)!==MANIFEST)fail('complete source manifest differs');
 const manifest=JSON.parse(originalManifest),ts=ownershipCompiler(),files=[],inputs=[];
 if(manifest.schema!=='candidate-binding-batches-originals-v1'||manifest.sources.length!==8)
  fail('complete source universe differs');
 for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,PROFILE));
  if(packed.length!==input.archiveBytes||hash(packed)!==input.archiveSha256)
   fail('complete original source archive differs');
  const bytes=gunzipSync(packed,{maxOutputLength:262144});
  if(bytes.length!==input.bytes||hash(bytes)!==input.sha256)fail('complete original source differs');
  const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(hash(before)!==input.sha256)fail('complete original Unicode differs');
  const evolution=derivePinnedRepositorySourceEvolution(ts,{path:input.path,source:before,
   profile:new URL(input.rules,PROFILE),profileSha256:input.rulesSha256});
  const after=evolution.after,current=readFileSync(resolve(root,input.path),'utf8');
  if(current!==before&&current!==after)fail('unregistered complete physical source');
  const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'JavaScript'}]);
  if(evolution.inverse!==before||equation.before!==before||equation.after!==after
   ||equation.inverse!==before)fail('complete source/CST inverse differs');
  files.push({path:input.path,before,after,current,evolution,equation,
   beforeSha256:hash(before),afterSha256:hash(after)});inputs.push({input,packed});
 }
 const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));
 for(const [at,row]of files.entries()){
  row.nativeBindings=bindings[at];const {input,packed}=inputs[at];
  if(readFileSync(resolve(root,row.path),'utf8')!==row.current
   ||!readFileSync(new URL(input.archive,PROFILE)).equals(packed)
   ||hash(readFileSync(new URL(input.rules,PROFILE)))!==input.rulesSha256)
   fail('complete source input changed during native checks');
 }
 if(!readFileSync(new URL('manifest.json',PROFILE)).equals(originalManifest))fail('manifest changed');
 return {schema:'candidate-binding-batches-source-v1',typescriptVersion:ts.version,files,
  newAcrossInvocationCache:false,sourceAuthority:false,semanticAuthority:false,
  runtimeAuthority:false,performanceQualified:false,productionExecutableGain:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);
 if(rest.length||!['--write','--check','--emit'].includes(mode))fail('use --write|--check|--emit');
 const plan=prepareCandidateBindingBatches();
 for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)
  fail('physical source changed before installation');
 if(mode==='--emit')console.log(JSON.stringify(plan));
 else{
  for(const row of plan.files){
   if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
   else if(row.current!==row.after)fail('complete derived source is stale');
  }
  console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
   files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),performanceQualified:false}));
 }
}
