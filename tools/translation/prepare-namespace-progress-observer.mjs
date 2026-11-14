// Authored diagnostic source DATA. Ordinary callback observations stay exact.
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
const PROFILE=new URL('./source-profiles/namespace-progress-observer/',import.meta.url);
const MANIFEST='96c54008bd0ad2fcff31cc84ee96c0d4518fe6fd961e3629baccfc0febb9e8bb';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Namespace observer source: '+message);};
export function prepareNamespaceProgressObserver({root=ROOT}={}){
 root=resolve(root);const manifestBytes=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(manifestBytes)!==MANIFEST)fail('complete original manifest differs');
 const manifest=JSON.parse(manifestBytes),ts=ownershipCompiler(),files=[],inputs=[];
 if(manifest.schema!=='namespace-progress-observer-originals-v1'||manifest.sources.length!==2)
  fail('complete original source universe differs');
 for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,PROFILE));
  if(packed.length!==input.archiveBytes||hash(packed)!==input.archiveSha256)
   fail('complete original archive differs');
  const bytes=gunzipSync(packed,{maxOutputLength:262144});
  if(bytes.length!==input.bytes||hash(bytes)!==input.sha256)fail('complete original bytes differ');
  const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(hash(before)!==input.sha256)fail('complete original Unicode differs');
  const evolution=derivePinnedRepositorySourceEvolution(ts,{path:input.path,source:before,
   profile:new URL(input.rules,PROFILE),profileSha256:input.rulesSha256});
  const after=evolution.after,current=readFileSync(resolve(root,input.path),'utf8');
  if(current!==before&&current!==after)fail('physical source is outside complete source equation');
  const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'JavaScript'}]);
  if(evolution.inverse!==before||equation.before!==before||equation.after!==after
   ||equation.inverse!==before)fail('complete source/CST inverse differs');
  files.push({path:input.path,before,after,current,beforeSha256:hash(before),
   afterSha256:hash(after),evolution,equation});inputs.push({input,packed});
 }
 const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({
  path:resolve(root,row.path),source:row.after})));
 for(const [at,row]of files.entries()){
  row.nativeBindings=bindings[at];const {input,packed}=inputs[at];
  if(readFileSync(resolve(root,row.path),'utf8')!==row.current
   ||!readFileSync(new URL(input.archive,PROFILE)).equals(packed)
   ||hash(readFileSync(new URL(input.rules,PROFILE)))!==input.rulesSha256)
   fail('complete source input changed across native boundary');
 }
 if(!readFileSync(new URL('manifest.json',PROFILE)).equals(manifestBytes))fail('manifest changed');
 return {schema:'namespace-progress-observer-source-v1',typescriptVersion:ts.version,files,
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);
 if(rest.length||!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=prepareNamespaceProgressObserver();
 for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)
  fail('physical source changed before installation');
 for(const row of plan.files){
  if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
  else if(row.current!==row.after)fail('complete derived source is stale');
 }
 console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
  files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
