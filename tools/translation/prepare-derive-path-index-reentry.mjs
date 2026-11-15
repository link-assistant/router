// Development source DATA. Every private source/semantic join remains fresh.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
import {transportConcreteSourcePhases} from './concrete-sequential-equations.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE=new URL('./source-profiles/derive-path-index-reentry/',import.meta.url);
const PATH='tools/translation/derive-footprints.mjs';
const MANIFEST='4352d05424c56ab78a6b0620f236253b4b324630b34b9c78ed089bfc17389405';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Derive path index source: '+message);};

export function prepareDerivePathIndexReentry({root=ROOT}={}){
 root=resolve(root);
 const manifestBytes=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(manifestBytes)!==MANIFEST)fail('complete original manifest differs');
 const manifest=JSON.parse(manifestBytes),packed=readFileSync(new URL(manifest.archive,PROFILE));
 if(manifest.schema!=='derive-path-index-reentry-original-v1'||manifest.path!==PATH
  ||packed.length!==manifest.archiveBytes||hash(packed)!==manifest.archiveSha256)
  fail('complete original archive differs');
 const bytes=gunzipSync(packed,{maxOutputLength:262144});
 if(bytes.length!==manifest.bytes||hash(bytes)!==manifest.sha256)fail('complete original bytes differ');
 const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);
 if(hash(before)!==manifest.sha256)fail('complete original Unicode differs');
 const ts=ownershipCompiler();
 const evolution=derivePinnedRepositorySourceEvolution(ts,{
  profile:new URL('source-rules.json',PROFILE),profileSha256:manifest.rulesSha256,
  path:PATH,source:before,
 });
 const after=evolution.after,current=readFileSync(resolve(root,PATH),'utf8');
 if(current!==before&&current!==after)fail('physical source is neither complete predecessor nor successor');
 const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'JavaScript'}]);
 if(evolution.inverse!==before)fail('complete source inverse differs');
 if(equation.before!==before||equation.after!==after||equation.inverse!==before)
  fail('complete reparsed CST source differs');
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,PATH),equation.after);
 if(readFileSync(resolve(root,PATH),'utf8')!==current
  ||!readFileSync(new URL('manifest.json',PROFILE)).equals(manifestBytes)
  ||hash(readFileSync(new URL('source-rules.json',PROFILE)))!==manifest.rulesSha256
  ||!readFileSync(new URL(manifest.archive,PROFILE)).equals(packed))
  fail('complete source inputs changed during preparation');
 return {schema:'derive-path-index-reentry-source-v1',typescriptVersion:ts.version,
  files:[{path:PATH,before,after:equation.after,current,beforeSha256:hash(before),afterSha256:hash(after),
   equation,evolution,nativeBindings}],sourceAuthority:false,semanticAuthority:false,
  runtimeAuthority:false,productionExecutableGain:0};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);
 if(rest.length||!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=prepareDerivePathIndexReentry();
 for(const row of plan.files){
  if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('physical source changed before installation');
  if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
  else if(row.current!==row.after)fail('complete generated source is stale');
 }
 console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
  files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
