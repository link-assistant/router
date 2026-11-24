// One finite complete-graph diagnostic. It grants no compiler or CI authority.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import * as current from '../../tools/translation/derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {trackedSource} from '../../tools/translation/source-corpus.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';

const [prefix,...rest]=process.argv.slice(2);
if(rest.length||!prefix?.startsWith('ci-logs/issue-784-restart-2/'))throw Error('Task evidence prefix required');
const hash=value=>createHash('sha256').update(value).digest('hex');
const base=new URL('../../tools/translation/',import.meta.url);
const profile=new URL('source-profiles/derive-path-index-reentry/',base);
const manifestBytes=readFileSync(new URL('manifest.json',profile));
assert.equal(hash(manifestBytes),'4352d05424c56ab78a6b0620f236253b4b324630b34b9c78ed089bfc17389405');
const manifest=JSON.parse(manifestBytes),packed=readFileSync(new URL(manifest.archive,profile));
assert.equal(hash(packed),manifest.archiveSha256);
const before=gunzipSync(packed,{maxOutputLength:262144});
assert.equal(hash(before),manifest.sha256);
const directory=mkdtempSync(join(tmpdir(),'router-finite-derive-comparison-'));
try{
 const oldPath=join(directory,'complete-original.mjs'),relocations=[];
 const relocated=before.toString().replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{
  const target=new URL(path,base).href;relocations.push({path,target});return 'from '+quote+target+quote;
 });
 assert.equal(relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{
  const row=relocations.find(row=>row.target===target);return row?'from '+quote+row.path+quote:whole;
 }),before.toString());
 writeFileSync(oldPath,relocated);
 const previous=await import(pathToFileURL(oldPath).href),root=process.cwd();
 const cargo={manifest:readFileSync(rustPackageSourcePath(root,'Cargo.toml'),'utf8'),
  lock:readFileSync(rustPackageSourcePath(root,'Cargo.lock'),'utf8')};
 const dependencies=loadDeriveDependencyProof(cargo);
 const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{encoding:'utf8',maxBuffer:4*1024*1024})
  .split('\0').filter(Boolean);
 assert.ok(paths.length>=804&&paths.length<=2048);
 const graph=resolveModuleGraph({entry:rustPackageSourcePath(root,'src/lib.rs'),paths,
  readSource:path=>trackedSource(root,path),compilationProfile:PRODUCTION_PROFILE});
 const results=[],encoded=[];
 for(const [name,implementation] of [['before',previous],['after',current]]){
  const started=performance.now();
  const context=implementation.createDeriveFootprintContext({modules:graph.modules,dependencies,
   compilationProfile:PRODUCTION_PROFILE});
  const milliseconds=performance.now()-started,raw=JSON.stringify(context);
  assert.ok(Buffer.byteLength(raw)<=64*1024*1024);
  const compressed=gzipSync(raw);assert.ok(compressed.length<=6*1024*1024);
  const path=prefix+'-'+name+'.json.gz';writeFileSync(path,compressed,{flag:'wx'});
  assert.equal(gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).toString(),raw);
  results.push({name,milliseconds,bytes:Buffer.byteLength(raw),sha256:hash(raw),
   packedBytes:compressed.length,certificates:context.certificates.length,
   diagnostics:context.diagnostics.length});
  encoded.push(raw);console.log(JSON.stringify(results.at(-1)));
 }
 assert.equal(encoded[0],encoded[1]);
 const result={schema:'finite-complete-derive-path-comparison-v1',node:process.version,
  paths:paths.length,modules:graph.modules.length,results,
  beforeSha256:hash(before),afterSha256:hash(readFileSync(new URL('derive-footprints.mjs',base))),
  order:['before','after'],repetitions:1,controlledPerformanceQualification:false,
  receivingTestsReplaced:false,productionExecutableGain:0};
 writeFileSync(prefix+'-receipt.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}finally{rmSync(directory,{recursive:true,force:true});}
