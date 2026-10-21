#!/usr/bin/env node
// Explicit proposal/review only. Source installation belongs to the coordinator.
import {readFileSync,writeFileSync,mkdirSync,lstatSync,realpathSync,readdirSync,statfsSync} from 'node:fs';
import {resolve,isAbsolute,join,dirname,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {STATIC_SOURCE_LIFECYCLE_LIMITS as LIMITS,writeStaticSourceLifecycleProposal} from './prepare-real-source-fixtures.mjs';
import {readStaticSourceLifecycle} from './test/real-source-fixtures.mjs';
import {prepareStrictStaticSourceProducer} from './prepare-strict-static-source-producer.mjs';
import {captureStaticSourceUniverse,assertStaticSourceUniverse,staticSourceUniverseRows,captureStaticFixtureAsset} from './static-source-universe.mjs';

const PREFIX='tools/translation/source-profiles/static-source-lifecycle/';
const NAMES=['originals.json.gz','manifest.json','NOTICE.md'];
const STRICT='tools/translation/strict-static-source-producer.mjs';
const CAPACITY=Object.freeze({initialFreeBytes:3*1024**3,reserveBytes:2*1024**3,storedOutputBytes:384*1024**2});
const SUPPORT=['tools/translation/prepare-real-source-fixtures.mjs','tools/translation/prepare-strict-static-source-producer.mjs','tools/translation/static-source-universe.mjs','tools/translation/refresh-static-source-fixtures.mjs',STRICT,'tools/translation/test/real-source-fixtures.mjs','tools/translation/fixtures/formatting-owner-frontier.json'];
const fail=message=>{throw new TypeError('Strict static fixture refresh: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function disk(root,output,initial=false,pending=0){for(const path of [root,realpathSync(dirname(output))]){const stat=statfsSync(path,{bigint:true}),free=stat.bavail*stat.bsize;if(free<BigInt(initial?CAPACITY.initialFreeBytes:CAPACITY.reserveBytes)+BigInt(pending))fail('original disk start/reserve bound');}}
function treeBytes(path){const stat=lstatSync(path);if(stat.isSymbolicLink())fail('linked proposal path');if(stat.isFile())return stat.size;if(!stat.isDirectory())fail('regular proposal tree required');let total=0;for(const name of readdirSync(path)){total+=treeBytes(join(path,name));if(total>CAPACITY.storedOutputBytes)fail('original stored evidence bound');}return total;}
function regular(path,limit=LIMITS.outputBytes){const stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)fail('bounded complete regular proposal file required');const bytes=readFileSync(path);if(bytes.length!==stat.size)fail('proposal file changed');return bytes;}
function putJson(folder,name,value){const raw=Buffer.from(JSON.stringify(value)+'\n');if(raw.length>LIMITS.outputBytes)fail('complete proposal DATA bound');const packed=gzipSync(raw,{level:6,mtime:0});writeFileSync(resolve(folder,name),packed,{flag:'wx'});return {path:name,bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,rawSha256:hash(raw)};}
function getJson(folder,row){const packed=regular(resolve(folder,row.path));if(packed.length!==row.bytes||hash(packed)!==row.sha256)fail('complete proposal packet differs');const raw=gunzipSync(packed,{maxOutputLength:LIMITS.outputBytes});if(raw.length!==row.rawBytes||hash(raw)!==row.rawSha256)fail('complete decoded proposal packet differs');return JSON.parse(raw.toString('utf8'));}
function assets(root,head){return [...NAMES.map(name=>PREFIX+name),...SUPPORT].map(path=>captureStaticFixtureAsset({root,head,path}));}
function checkAssets(root,head,expected){const current=assets(root,head);if(!same(current,expected))fail('complete original fixture/support source changed');return current;}
async function issuer(root){
 const plan=prepareStrictStaticSourceProducer({root}),row=plan.files[0];if(row.current!==row.after||readFileSync(resolve(root,STRICT),'utf8')!==row.after)fail('materialize and commit the exact native/CST strict producer first');
 const module=await import(pathToFileURL(resolve(root,STRICT)));if(typeof module.prepareStrictStaticSourceLifecycleProposal!=='function')fail('actual generated strict producer export required');return {plan,prepare:module.prepareStrictStaticSourceLifecycleProposal};
}
function independent(root,snapshot,folder){
 if(snapshot.root!==root)fail('actual source root association differs');const data=readStaticSourceLifecycle({folder});
 if(!same(data.bundle.current.files,staticSourceUniverseRows(snapshot))||data.bundle.current.sourceSetSha256!==snapshot.sourceSetSha256)fail('generated complete current source universe differs');
 for(const row of snapshot.files){const source=data.bundle.sources[row.sourceId];if(!source||source.source!==row.source||source.bytes!==row.bytes||source.gitBlob!==row.gitBlob)fail('complete generated physical/Git source join differs');}
 // The unchanged reader checked both fixed 806/808 universes, all original
 // sources, whole native CSTs, original parent/Cargo rows and every inverse.
 return {schema:data.index.schema,currentSourceSetSha256:data.bundle.current.sourceSetSha256,currentFiles:data.bundle.current.files.length,historical:data.bundle.profiles.map(row=>({revision:row.revision,sourceSetSha256:row.sourceSetSha256,files:row.files.length})),authority:data.bundle.authority};
}
function outputPath(root,output){if(typeof output!=='string'||!isAbsolute(output))fail('fresh absolute external output required');const target=resolve(output),physicalRoot=realpathSync(root);if(target===physicalRoot||target.startsWith(physicalRoot+'/')||physicalRoot.startsWith(target+'/'))fail('output overlaps source root');return target;}

function freshOutput(root,output){const target=outputPath(root,output),parent=realpathSync(dirname(target));if(resolve(parent,basename(target))!==target)fail('physical external output parent differs');try{lstatSync(target);fail('fresh nonexistent external output required');}catch(error){if(error.code!=='ENOENT')throw error;}return target;}
export async function proposeStrictStaticFixtureRefresh({root,expectedHead,output}={}){
 root=realpathSync(resolve(root));output=freshOutput(root,output);disk(root,output,true);const before=captureStaticSourceUniverse({root,expectedHead}),originalAssets=assets(root,expectedHead),issued=await issuer(root),historyArchive=resolve(root,PREFIX),proposal=issued.prepare({root,currentRevision:expectedHead,historyArchive});
 if(proposal.schema!=='router-static-source-lifecycle-proposal-v1'||proposal.subjectRevision!==expectedHead||proposal.sourceRoot!==root||!same(proposal.before,staticSourceUniverseRows(before))||!same(proposal.before,proposal.after)||proposal.files.length!==3||proposal.completeInverse!==true)fail('actual complete strict producer/source equations differ');
 const after=assertStaticSourceUniverse(before);checkAssets(root,expectedHead,originalAssets);const folder=outputPath(root,output);mkdirSync(folder,{recursive:false});
 writeStaticSourceLifecycleProposal(proposal,folder);treeBytes(folder);disk(root,output);mkdirSync(join(folder,'prior-installed'));
 for(const row of originalAssets.slice(0,3)){const name=row.path.slice(PREFIX.length),bytes=Buffer.from(row.content,'base64');if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete previous fixture bytes differ');writeFileSync(join(folder,'prior-installed',name),bytes,{flag:'wx'});treeBytes(folder);disk(root,output);}
 const review=independent(root,before,folder),changes=proposal.files.map((row,index)=>{const old=originalAssets[index],after=Buffer.from(row.content,row.encoding),prior=Buffer.from(old.content,'base64');if(row.path!==old.path||row.bytes!==after.length||row.sha256!==hash(after))fail('exact three fixture output association differs');return {path:row.path,before:old,after:{bytes:after.length,sha256:hash(after),encoding:'base64',content:after.toString('base64')},inverse:{encoding:'base64',content:prior.toString('base64'),bytes:prior.length,sha256:hash(prior)},completeInverse:true};});
 const packets=[];for(const [name,value] of [['source-freeze.json.gz',{before,after,originalAssets}],['native-source-equation.json.gz',issued.plan],['fixture-changes.json.gz',changes]]){packets.push(putJson(folder,name,value));treeBytes(folder);disk(root,output);}
 const currentPlan=prepareStrictStaticSourceProducer({root});if(!same(currentPlan,issued.plan))fail('complete native source equation changed');assertStaticSourceUniverse(before);checkAssets(root,expectedHead,originalAssets);
 const originalProposal=regular(join(folder,'proposal.json')),index={schema:'strict-static-source-fixture-refresh-DATA-v1',complete:true,root,head:expectedHead,proposalFile:{path:'proposal.json',bytes:originalProposal.length,sha256:hash(originalProposal)},packets,review,limits:LIMITS,capacity:CAPACITY,originalReadersUnchanged:true,originalHistoricalUniversesUnchanged:true,sourceInstalled:false,semanticAuthority:false,compilerClosureCaptured:false,requiresExternalCompilerAndTypeScriptFreeze:true};
 const complete=Buffer.from(JSON.stringify(index,null,2)+'\n');if(treeBytes(folder)+complete.length>CAPACITY.storedOutputBytes)fail('original stored evidence bound');disk(root,output,false,complete.length);writeFileSync(join(folder,'complete.json'),complete,{flag:'wx'});return {folder,index};
}
export async function reviewStrictStaticFixtureRefresh({root,expectedHead,output}={}){
 root=realpathSync(resolve(root));const folder=realpathSync(outputPath(root,output));outputPath(root,folder);disk(root,folder);treeBytes(folder);const index=JSON.parse(regular(join(folder,'complete.json')).toString('utf8'));
 if(index.schema!=='strict-static-source-fixture-refresh-DATA-v1'||index.complete!==true||index.root!==root||index.head!==expectedHead||!same(index.limits,LIMITS)||!same(index.capacity,CAPACITY)||index.sourceInstalled!==false||index.semanticAuthority!==false||index.packets.length!==3||index.originalReadersUnchanged!==true||index.originalHistoricalUniversesUnchanged!==true||index.compilerClosureCaptured!==false||index.requiresExternalCompilerAndTypeScriptFreeze!==true)fail('complete exact current proposal index required');
 const wanted=['source-freeze.json.gz','native-source-equation.json.gz','fixture-changes.json.gz'];if(!same(index.packets.map(row=>row.path),wanted))fail('exact complete packet census required');
 const [freeze,native,changes]=index.packets.map(row=>getJson(folder,row));if(freeze.before?.root!==root||freeze.before.head!==expectedHead)fail('complete packet source root/HEAD differs');const actual=assertStaticSourceUniverse(freeze.before);if(!same(freeze.before,freeze.after))fail('whole before/after source snapshot differs');checkAssets(root,expectedHead,freeze.originalAssets);
 const issued=await issuer(root);if(!same(issued.plan,native))fail('complete original/generated native/CST equation differs');
 const originalProposal=regular(join(folder,'proposal.json'));if(index.proposalFile?.path!=='proposal.json'||index.proposalFile.bytes!==originalProposal.length||index.proposalFile.sha256!==hash(originalProposal))fail('complete original proposal bytes differ');const proposal=JSON.parse(originalProposal.toString('utf8'));if(proposal.schema!=='router-static-source-lifecycle-proposal-v1'||proposal.sourceRoot!==root||proposal.subjectRevision!==expectedHead||!same(proposal.before,staticSourceUniverseRows(actual))||!same(proposal.before,proposal.after)||!same(proposal.limits,LIMITS)||proposal.completeInverse!==true||proposal.files.length!==3)fail('complete original proposal/source equation differs');
 if(!Array.isArray(changes)||changes.length!==3||!same(changes.map(row=>row.path),NAMES.map(name=>PREFIX+name)))fail('three complete previous/current fixture changes required');
 for(const [at,row]of changes.entries()){
  const proposed=proposal.files[at],previous=freeze.originalAssets[at],before=Buffer.from(previous.content,'base64'),after=regular(join(folder,NAMES[at])),inverse=Buffer.from(row.inverse.content,'base64');
  if(proposed.path!==row.path||proposed.bytes!==after.length||proposed.sha256!==hash(after)||!Buffer.from(proposed.content,proposed.encoding).equals(after)||!same(row.before,previous)||row.completeInverse!==true||!inverse.equals(before)||row.inverse.bytes!==before.length||row.inverse.sha256!==hash(before)||row.inverse.content!==before.toString('base64')||row.after.encoding!=='base64'||row.inverse.encoding!=='base64'||row.after.bytes!==after.length||row.after.sha256!==hash(after)||row.after.content!==after.toString('base64')||!regular(join(folder,'prior-installed',NAMES[at])).equals(before))fail('full previous/proposed fixture byte inverse differs');
 }
 const entries=readdirSync(folder).sort(),expected=[...NAMES,'proposal.json','prior-installed',...wanted,'complete.json'].sort();if(!same(entries,expected)||!same(readdirSync(join(folder,'prior-installed')).sort(),[...NAMES].sort()))fail('extra or missing proposal files');
 const result=independent(root,actual,folder);if(!same(result,index.review))fail('complete independent source/CST/inverse review changed');assertStaticSourceUniverse(freeze.before);checkAssets(root,expectedHead,freeze.originalAssets);
 treeBytes(folder);disk(root,folder);return {schema:'strict-static-source-fixture-review-DATA-v1',root,head:expectedHead,complete:true,review:result,sourceInstalled:false,semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==7||!['propose','review'].includes(args[0])||args[1]!=='--root'||args[3]!=='--expected-head'||args[5]!=='--output')fail('usage: propose|review --root ROOT --expected-head FULL_SHA --output FRESH_EXTERNAL_DIRECTORY');
 const options={root:args[2],expectedHead:args[4],output:args[6]},result=await (args[0]==='propose'?proposeStrictStaticFixtureRefresh(options):reviewStrictStaticFixtureRefresh(options));process.stdout.write(JSON.stringify(result)+'\n');
}
