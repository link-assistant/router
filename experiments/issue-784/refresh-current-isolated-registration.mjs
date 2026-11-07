// Reviewed snapshot refresh using the existing complete-source producers.
// Historical bytes remain data; registration supplies no semantic authority.
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareIsolatedProjectCompiler} from '../../tools/translation/prepare-isolated-project-compiler.mjs';
import {preparePortableGitFixtureProposal,readPortableGitFixture} from '../../tools/translation/prepare-portable-git-fixtures.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const args=process.argv.slice(2);
if(args[0]!=='--install'||![1,5].includes(args.length)||args.length===5&&(args[1]!=='--label'||args[3]!=='--sha256'))throw Error('Usage: --install [--label LABEL --sha256 REVIEWED_SHA256]');
const label=args[2]??'current-isolated',reviewedSha256=args[4]??'e27443a1527875d8bd23ab85704d7eae0383711970e33f433b8cbe0d0434730d';
if(!/^[-a-z0-9]{1,64}$/.test(label)||!/^[a-f0-9]{64}$/.test(reviewedSha256))throw Error('Finite label and complete reviewed proposal SHA256 required');
const root=resolve('.'),folder='tools/translation/source-profiles/isolated-project-compiler/';
const evidence='ci-logs/issue-784-restart-2/',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const rawProposal=gunzipSync(fs.readFileSync(evidence+label+'-registry-proposal.json.gz'),{maxOutputLength:32*1024*1024});
if(hash(rawProposal)!==reviewedSha256)throw Error('Complete reviewed proposal differs');
const captured=JSON.parse(rawProposal),get=name=>{
 const row=captured.files.find(row=>row.path===name),bytes=Buffer.from(row.base64,'base64');
 if(row.bytes!==bytes.length||hash(bytes)!==row.sha256)throw Error('Complete reviewed file differs');return bytes;
};
const originalPacked=fs.readFileSync(folder+'manifest.json.gz'),original=JSON.parse(gunzipSync(originalPacked));
if(hash(originalPacked)!==captured.originalRegistrySha256)throw Error('Historical registry differs');
for(const [name,before] of [['isolated-project-batch.mjs','parent-before.mjs'],['isolated-project-driver.mjs','driver-before.mjs']])
 if(!fs.readFileSync('tools/translation/'+name).equals(get(before)))throw Error('Complete bootstrap before-source differs');
const temporary=fs.mkdtempSync(join(tmpdir(),'router-784-reviewed-registration-'));
const record=(path,bytes)=>({path,bytes:bytes.length,sha256:hash(bytes),base64:bytes.toString('base64')});
const installed=[];
try{
 const output=join(temporary,'proposal');
 prepareIsolatedProjectCompiler({root,revision:captured.revision,output});
 for(const row of captured.files)if(!fs.readFileSync(join(output,row.path)).equals(get(row.path)))throw Error('Independent complete proposal reproduction differs: '+row.path);
 const registry=JSON.parse(get('manifest.json'));
 for(const row of registry.sources){
  const state=fs.lstatSync(row.path),bytes=fs.readFileSync(row.path);
  if(!state.isFile()||state.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||(state.mode&0o111?'100755':'100644')!==row.mode)throw Error('Complete current physical compiler differs: '+row.path);
 }
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw Error('Lockfile TypeScript 5.9.3 required');
 const equations=transportConcreteSourcePhases([
  ['parent-before.mjs','isolated-project-batch.mjs'],['driver-before.mjs','isolated-project-driver.mjs'],
 ].map(([before,after])=>{
  for(const name of [before,after])if(ts.createSourceFile(name,get(name).toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Complete native bootstrap grammar differs');
  return {before:get(before).toString('utf8'),middle:get(before).toString('utf8'),after:get(after).toString('utf8'),language:'JavaScript'};
 }));
 const historicalPaths=[folder+'manifest.json.gz','tools/translation/isolated-project-batch.mjs','tools/translation/isolated-project-driver.mjs',
  'tools/translation/test/fixtures/portable-git/manifest.json','tools/translation/test/fixtures/portable-git/objects.json.gz','tools/translation/test/fixtures/portable-git/NOTICE.md'];
 const beforeFiles=historicalPaths.map(path=>record(path,fs.readFileSync(path)));
 const history={schema:'complete-isolated-registration-history-v1',sourceHead:original.sourceHead,files:beforeFiles,
  semanticAuthority:false,runtimeAuthority:false};
 const archive=folder+'history-'+original.sourceHead+'.json.gz',historyRaw=Buffer.from(JSON.stringify(history));
 fs.writeFileSync(archive,gzipSync(historyRaw,{level:9}),{flag:'wx'});
 if(!gunzipSync(fs.readFileSync(archive),{maxOutputLength:16*1024*1024}).equals(historyRaw))throw Error('Complete history readback differs');
 for(const [name,path] of [['manifest.json.gz',folder+'manifest.json.gz'],['isolated-project-batch.mjs','tools/translation/isolated-project-batch.mjs'],['isolated-project-driver.mjs','tools/translation/isolated-project-driver.mjs']]){
  const bytes=get(name);fs.writeFileSync(path,bytes);if(!fs.readFileSync(path).equals(bytes))throw Error('Complete installed registration differs');installed.push(record(path,bytes));
 }
 const portable=preparePortableGitFixtureProposal({root,currentRevision:captured.revision}),receiving=join(temporary,'portable');fs.mkdirSync(receiving);
 for(const row of portable.files){const bytes=Buffer.from(row.content,'base64');if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Complete portable proposal differs');fs.writeFileSync(join(receiving,row.path.split('/').at(-1)),bytes,{flag:'wx'});}
 const checked=readPortableGitFixture({folder:receiving});
 if(JSON.stringify(checked.data.registry)!==JSON.stringify(registry))throw Error('Complete genuine Git fixture registry differs');
 const previous=readPortableGitFixture();
 if(JSON.stringify(previous.data.concrete)!==JSON.stringify(checked.data.concrete))throw Error('Original concrete Git profile changed');
 for(const row of portable.files){const bytes=Buffer.from(row.content,'base64');fs.writeFileSync(row.path,bytes);if(!fs.readFileSync(row.path).equals(bytes))throw Error('Complete installed portable fixture differs');installed.push(record(row.path,bytes));}
 for(const row of registry.sources)if(hash(fs.readFileSync(row.path))!==row.sha256)throw Error('Complete current compiler changed during installation');
 const result={schema:'complete-reviewed-isolated-registration-refresh-v1',sourceHead:captured.revision,oldSourceHead:original.sourceHead,
  beforeFiles,installed,history:record(archive,fs.readFileSync(archive)),equations,portable,
  files:registry.files,totalSourceBytes:registry.totalBytes,portableObjects:checked.objects.size,
  oldConcreteProfileUnchanged:true,wholeReceivingTestsPassed:false,productionExecutableGain:0,semanticAuthority:false,runtimeParity:false};
 const raw=Buffer.from(JSON.stringify(result));if(raw.length>32*1024*1024)throw Error('Finite complete refresh evidence bound');
 const target=evidence+label+'-registration-refresh.json.gz';fs.writeFileSync(target,gzipSync(raw),{flag:'wx'});
 if(!gunzipSync(fs.readFileSync(target),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete refresh evidence readback differs');
 console.log(JSON.stringify({target,bytes:raw.length,sha256:hash(raw),files:registry.files,totalSourceBytes:registry.totalBytes,
  portableObjects:checked.objects.size,oldSourceHead:original.sourceHead,sourceHead:captured.revision,oldConcreteProfileUnchanged:true,wholeReceivingTestsPassed:false}));
}catch(error){
 const target=evidence+label+'-registration-refresh-failure.json';
 fs.writeFileSync(target,JSON.stringify({error:{message:error.message,stack:error.stack},installed},null,2)+'\n',{flag:'wx'});throw error;
}finally{fs.rmSync(temporary,{recursive:true,force:false});}
