// Actual reviewed source producer only. Fixture storage grants no authority.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareRealSourceFixtures} from '../../tools/translation/prepare-real-source-fixtures.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {writeCompleteEvidenceJson,currentEvidenceBytes} from './complete-evidence-json.mjs';
import {completeOwnedCoreSourceFixture} from '../../tools/translation/test/complete-core-source-fixture.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const folder='tools/translation/source-profiles/real-source-fixtures/';
const files=['originals.json.gz','manifest.json','NOTICE.md'].map(name=>folder+name);
const sources=['tools/translation/prepare-real-source-fixtures.mjs','tools/translation/test/real-source-fixtures.mjs'];
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const originals=files.map(path=>{const raw=readFileSync(path);return {path,bytes:raw.length,sha256:hash(raw),contentBase64:raw.toString('base64')};});
const index=JSON.parse(Buffer.from(originals[1].contentBase64,'base64'));
if(index.currentRevision!=='b6202d02f52bff8a30b9cde4f23561aeed7d9083')throw Error('One-time reviewed preceding snapshot required; refusing to replace refreshed history');
const packed=Buffer.from(originals[0].contentBase64,'base64');
if(packed.length!==index.bytes||hash(packed)!==index.sha256)throw Error('Complete preceding archive differs');
const oldRaw=gunzipSync(packed),old=JSON.parse(oldRaw);
if(oldRaw.length!==index.rawBytes||hash(oldRaw)!==index.rawSha256)throw Error('Complete preceding source bytes differ');
const archive='docs/case-studies/issue-784/evidence/current-real-source-fixture-history.json.gz';
const equations=sources.map(path=>{
 const before=execFileSync('git',['show',head+':'+path],{encoding:'utf8',maxBuffer:2*1024*1024}),after=readFileSync(path,'utf8');
 const [equation]=transportConcreteSourcePhases([{before,middle:before,after,language:'JavaScript'}]);
 if(equation.inverse!==before)throw Error('Complete source inverse differs');
 return {path,before,after,equation};
});
const historyRaw=Buffer.from(JSON.stringify({schema:'complete-real-source-fixture-history-v1',sourceHead:head,previousRevision:index.currentRevision,originals,sourceEquations:equations})+'\n');
const history=gzipSync(historyRaw,{level:9,mtime:0});
if(!existsSync(archive)){
 if(currentEvidenceBytes()+history.length>=500000000)throw Error('Complete history storage capacity refused');
 writeFileSync(archive,history,{flag:'wx'});
 if(!gunzipSync(readFileSync(archive)).equals(historyRaw))throw Error('Complete preceding archive recovery differs');
}
for(const row of JSON.parse(gunzipSync(readFileSync(archive))).originals){
 const raw=Buffer.from(row.contentBase64,'base64');
 if(raw.length!==row.bytes||hash(raw)!==row.sha256||!raw.equals(readFileSync(row.path)))throw Error('Complete original member recovery differs');
}
const proposal=prepareRealSourceFixtures({root:process.cwd(),currentRevision:head,historyArchive:folder});
const current=JSON.parse(gunzipSync(Buffer.from(proposal.files.find(row=>row.path.endsWith('/originals.json.gz')).content,'base64')));
for(const key of ['historical','lineage'])if(JSON.stringify(current[key])!==JSON.stringify(old[key]))throw Error('Original historical record changed: '+key);
for(const row of [...old.historical.files,...old.lineage.flatMap(stage=>stage.files.flatMap(row=>[row.before,row.after]))]){
 if(JSON.stringify(current.sources[row.sourceId])!==JSON.stringify(old.sources[row.sourceId]))throw Error('Complete frozen source changed');
}
const currentCoreFiles=completeOwnedCoreSourceFixture(Object.fromEntries(current.current.files.filter(row=>row.path.startsWith('src/translation_core')).map(row=>[row.path,current.sources[row.sourceId].source])));
if(!Object.hasOwn(currentCoreFiles,'src/translation_core/base64.rs'))throw Error('Actual complete base64 source missing');
for(const [path,source]of Object.entries(currentCoreFiles))if(source!==readFileSync(rustPackageSourcePath(process.cwd(),path),'utf8'))throw Error('Actual current Core source differs');
const retained=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-real-source-fixture-proposal.json',Buffer.from(JSON.stringify({sourceHead:head,precedingArchive:archive,finalSourceEquations:equations,currentCoreFiles,proposal})+'\n'));
for(const row of proposal.files){
 if(!files.includes(row.path))throw Error('Unknown actual producer output');
 const raw=Buffer.from(row.content,row.encoding);
 if(raw.length!==row.bytes||hash(raw)!==row.sha256)throw Error('Actual complete proposed bytes differ');
 if(currentEvidenceBytes()+raw.length-readFileSync(row.path).length>=500000000)throw Error('Actual output storage capacity refused');
 writeFileSync(row.path,raw);
 if(!readFileSync(row.path).equals(raw))throw Error('Complete installed output differs');
}
console.log(JSON.stringify({sourceHead:head,precedingArchive:archive,retained,files:proposal.files.map(({path,bytes,sha256})=>({path,bytes,sha256})),historicalFiles:current.historical.files.length,currentFiles:current.current.files.length,completeCoreFiles:Object.keys(currentCoreFiles).length,historicalAndAdoptionRecordsUnchanged:true,allPriorBytesRecoverable:true,rustExecuted:false,qualified:false}));
