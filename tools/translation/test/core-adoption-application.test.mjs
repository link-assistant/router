import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {proposeCoreAdoptionSequence} from '../propose-core-adoption-corpus.mjs';
import {openCoreAdoptionGzipPackets} from '../core-adoption-packet-storage.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {applyReviewedCoreAdoption,recoverReviewedCoreAdoption} from '../apply-reviewed-core-adoption.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const digest=data=>createHash('sha256').update(data).digest('hex');
const text=value=>JSON.stringify(value)+'\n';
const ORIGINAL='pub mod translation_core;\nfn picked(value: &crate::translation_core::Json) -> crate::translation_core::Maybe<&crate::translation_core::Str> { value.get("name").and_then(crate::translation_core::Json::as_str) }\n';
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:128*1024**2,timeout:20000});
function write(path,value){fs.mkdirSync(dirname(path),{recursive:true});
fs.writeFileSync(path,typeof value==='string'?value:text(value));
}
function walk(directory,relative=''){const rows=[];
for(const name of fs.readdirSync(directory).sort()){const full=join(directory,name),local=relative+name;
if(fs.statSync(full).isDirectory())rows.push(...walk(full,local+'/'));
else rows.push(local);
}return rows;
}
function snapshot(root,run,head){const names=git(root,'ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','tools/translation','scripts').split('\0').filter(Boolean).sort();
const prefix='packages/javascript/node_modules/typescript/';
for(const name of walk(join(root,prefix)))names.push(prefix+name);
const inputs=[],retained=[];
for(const path of names){const raw=fs.readFileSync(join(root,path)),sha256=digest(raw),row={path,bytes:raw.length,sha256};
inputs.push(row);
write(join(run,'input-blobs',sha256+'.bin'),raw.toString());
retained.push({...row,snapshot:'input-blobs/'+sha256+'.bin',physicalPresent:true});
}return {inputs,retained,sourceHead:head};
}
// Independently check fixture storage/CST/full equations and inverse before
// selecting report bytes. This exercises operational authorization/data joins;
// it does not replace the production V3 namespace/producer reviewer or qualify
// real Router application coverage. Root must receive that real integration.
function fixtureReview(run,root,head,capture,expectedChanged=1){const storage=openCoreAdoptionGzipPackets(join(run,'migration-proposal')),index=storage.index;
assert.equal(index.sourceRoot,root);const load=ref=>{const raw=storage.read(ref);
return ref.kind==='json'?JSON.parse(raw):raw.toString();
};
for(const ref of index.packets)load(ref);
const original=new Map(index.inputs.map(ref=>{const row=load(ref);
return [row.path,row.source];
}));
const proposalByPath=new Map();
for(const stage of index.stages)for(const ref of stage.packets.proposals){const p=load(ref);
assert.equal(p.before.source,original.get(p.file));
const selected=[...p.selections].sort((a,b)=>a.span[0]-b.span[0]);
assert.equal(selected.length,p.stages[0].edits.length);
for(let at=0;
at<selected.length;
at++){const item=selected[at],[input,payload]=item.locals,receiver=item.receiver.source;
assert.equal(p.before.source.slice(...item.receiver.span),receiver);
assert.equal(item.member,'as_str');
const language='{ let '+input+' = '+receiver+'; if let ::core::option::Option::Some('+payload+') = '+input+' { ::serde_json::Value::as_str('+payload+') } else { ::core::option::Option::None } }';
const repository='{ let '+input+' = '+receiver+'; if let crate::translation_core::Maybe::Some('+payload+') = '+input+' { crate::translation_core::Json::as_str('+payload+') } else { crate::translation_core::Maybe::None } }';
assert.equal(p.stages[0].edits[at].expected,p.before.source.slice(...item.span));
assert.equal(p.stages[0].edits[at].replacement,language);
assert.equal(p.edits[at].replacement,repository);
}for(const step of p.stages){let restored=step.after.source;
for(const part of [...step.mapping].reverse())if(part.kind==='substitution'){assert.equal(restored.slice(...part.after),part.replacement);
restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);
}assert.equal(restored,step.before.source);
for(const endpoint of [step.before,step.after]){const actual=transportConcreteSyntaxMeta(endpoint.meta);
assert.equal(actual.source,endpoint.source);
assert.equal(actual.meta,endpoint.meta);
}}proposalByPath.set(p.file,p);
}const files=[];
for(const c of index.changes){const p=proposalByPath.get(c.path),raw=storage.read(c.source);
assert.equal(raw.toString(),p.after.source);
assert.equal(digest(p.before.source),c.beforeSha256);
assert.equal(digest(raw),c.afterSha256);
files.push({path:c.path,beforeSha256:c.beforeSha256,afterSha256:c.afterSha256,bytes:raw.length,producerSource:join(run,'migration-proposal',c.source.path+'.gz'),storageEncoding:'gzip',logicalPacket:c.source,storedPacket:storage.storage.packets.find(row=>row.path===c.source.path)});
}storage.verify();
assert.equal(index.sequence,'json-readers');
assert.equal(files.length,expectedChanged);
const snapshots={};
for(const phase of ['before','after']){write(join(run,'full-input-snapshots-'+phase+'.json'),{sourceHead:head,files:capture.retained});
write(join(run,'all-rust-cargo-'+phase+'.json'),{sourceHead:head,files:capture.retained.filter(row=>row.path.endsWith('.rs')||['Cargo.toml','Cargo.lock'].includes(row.path))});
snapshots[phase]=digest(fs.readFileSync(join(run,'full-input-snapshots-'+phase+'.json')));
snapshots['rust-'+phase]=digest(fs.readFileSync(join(run,'all-rust-cargo-'+phase+'.json')));
}const indexSha256=digest(fs.readFileSync(join(run,'migration-proposal/index.json')));
const report={schema:'complete-json-readers-gzip-producer-review-v1',sourceHead:head,indexSha256,capturedInputsSha256:digest(fs.readFileSync(join(run,'inputs.json'))),capturedInputs:capture.inputs.length,sourceFiles:original.size,packets:index.packets.length,packetBytes:index.packetBytes,changedFiles:files.length,completeFullPacketBytesAndSourceChainsChecked:true,fullUtf16Utf8LeafGroupParentPartitionsChecked:true,allCompleteSourceInversesChecked:true,completeReaderEquationsAndGeneratedPathBindingsChecked:true,semanticAdmission:false,retainedSnapshotDigests:snapshots,sourceClosure:{fixtureOnly:true,actualApplicationCoverage:false}};
write(join(run,'review-v2/review.json'),report);
write(join(run,'review-v2/installation-plan.json'),{indexSha256,files,selections:[],edits:[]});
write(join(run,'review-monitor-v2/receipt.json'),{sourceHead:head,exitCode:0,resourceReason:null,reviewerQualified:true,finalSourceJoinsComplete:true,finalSourceJoins:{allFreshJoinsPassed:true}});
return {indexSha256,reviewSha256:digest(fs.readFileSync(join(run,'review-v2/review.json'))),planSha256:digest(fs.readFileSync(join(run,'review-v2/installation-plan.json'))),after:storage.read(index.changes[0].source).toString()};
}
function counterfeitCanonical(f){const root=join(f.run,'migration-proposal'),index=JSON.parse(fs.readFileSync(join(root,'index.json'))),manifest=JSON.parse(fs.readFileSync(join(root,'packet-storage.json'))),storage=openCoreAdoptionGzipPackets(root),ref=index.stages[0].packets.proposals[0],row=JSON.parse(storage.read(ref));
const previous=row.before.meta,doc=JSON.parse(previous);
doc.nodes.find(n=>n[0]==='token')[1]='counterfeit';
const changed=JSON.stringify(doc);
for(const endpoint of [row.before,row.stages[0].before]){assert.equal(endpoint.meta,previous);
endpoint.meta=changed;
}const raw=Buffer.from(text(row)),packed=gzipSync(raw),delta=raw.length-ref.bytes;
const logical=index.packets.find(p=>p.path===ref.path);
for(const target of [ref,logical]){target.bytes=raw.length;
target.sha256=digest(raw);
}const stored=manifest.packets.find(p=>p.path===ref.path);
Object.assign(stored,{rawBytes:raw.length,rawSha256:digest(raw),bytes:packed.length,sha256:digest(packed)});
fs.writeFileSync(join(root,stored.file),packed);
index.packetBytes+=delta;
write(join(root,'index.json'),index);
manifest.index={path:'index.json',bytes:Buffer.byteLength(text(index)),sha256:digest(text(index))};
write(join(root,'packet-storage.json'),manifest);
const report=JSON.parse(fs.readFileSync(join(f.run,'review-v2/review.json'))),plan=JSON.parse(fs.readFileSync(join(f.run,'review-v2/installation-plan.json')));
report.indexSha256=plan.indexSha256=digest(text(index));
report.packetBytes=index.packetBytes;
write(join(f.run,'review-v2/review.json'),report);
write(join(f.run,'review-v2/installation-plan.json'),plan);
return {...f.options,indexSha256:report.indexSha256,reviewSha256:digest(text(report)),planSha256:digest(text(plan))};
}
async function fixture(callback,configuration={}){const home=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-reviewed-application-'))),root=join(home,'source'),run=join(home,'run'),temporary=join(home,'producer-temp');
try{fs.mkdirSync(root);
fs.mkdirSync(run);
fs.mkdirSync(temporary);
write(join(root,'.gitignore'),'packages/javascript/node_modules/\n');
for(const path of ['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml','Cargo.lock'])write(join(root,path),fs.readFileSync(join(ROOT,path),'utf8'));
write(join(root,'src/lib.rs'),ORIGINAL+(configuration.twoTargets?'mod second;\n':''));
if(configuration.twoTargets)write(join(root,'src/second.rs'),ORIGINAL.replace('pub mod translation_core;\n','').replace('fn picked(','fn second_picked('));
const compiler=process.env.ROUTER_TRANSLATION_TSC?dirname(dirname(resolve(process.env.ROUTER_TRANSLATION_TSC))):join(ROOT,'packages/javascript/node_modules/typescript');
assert.equal(JSON.parse(fs.readFileSync(join(compiler,'package.json'))).version,'5.9.3');
fs.cpSync(compiler,join(root,'packages/javascript/node_modules/typescript'),{recursive:true,dereference:true});
assert.equal(walk(join(root,'packages/javascript/node_modules/typescript')).length,132);
git(root,'init','-q');
git(root,'-c','core.hooksPath=/dev/null','add','.');
git(root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','commit.gpgsign=false','-c','user.name=Source fixture','-c','user.email=source-fixture@example.invalid','commit','-qm','complete fixture originals');
const head=git(root,'rev-parse','HEAD').trim(),capture=snapshot(root,run,head);
write(join(run,'inputs.json'),{sourceHead:head,inputs:capture.inputs});
write(join(run,'proposal.inputs-after.json'),{sourceHead:head,inputs:capture.inputs});
write(join(run,'external-temporary-root.json'),{path:temporary,outsideSourceRoot:true});
const produced=await proposeCoreAdoptionSequence({root,output:join(run,'migration-proposal')},'json-readers','gzip');
assert.equal(produced.complete,true);
assert.equal(git(root,'status','--porcelain'),'');
write(join(run,'receipt.json'),[{sourceHead:head,exitCode:0,resourceReason:null,inputsUnchanged:true,headUnchanged:true,cleanAfter:true,sourceGuardsAfterFailureStatus:'complete-fresh-byte-rejoin'}]);
write(join(run,'review/review.json'),{oldFailedReview:true});
write(join(run,'review-monitor/receipt.json'),{exitCode:-9,reviewerQualified:false});
if(configuration.controller)write(join(run,'review-monitor-v2/external-temporary-roots.json'),{paths:[]});
const selected=fixtureReview(run,root,head,capture,configuration.twoTargets?2:1);
return await callback({home,root,run,head,...selected,options:{root,run,head,reviewDirectory:'review-v2',reviewMonitorDirectory:'review-monitor-v2',output:join(home,'application'),indexSha256:selected.indexSha256,reviewSha256:selected.reviewSha256,planSha256:selected.planSha256}});
}finally{fs.rmSync(home,{recursive:true,force:true});
}}

test('actual reader producer packets apply exact full source and explicit recovery restores original bytes',{timeout:60000},()=>fixture(async f=>{const result=await applyReviewedCoreAdoption(f.options);
assert.equal(result.changedFiles,1);
const selectedState=JSON.parse(fs.readFileSync(join(result.output,'application-state.json')));
assert.equal(selectedState.selection.reviewDirectory,'review-v2');
assert.equal(selectedState.selection.reviewMonitorDirectory,'review-monitor-v2');
assert.equal(result.semanticAdmission,false);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),f.after);
assert.notEqual(f.after,ORIGINAL);
const state=fs.readFileSync(join(result.output,'application-state.json'));
assert.equal(JSON.parse(state).allFilesAtomic,false);
const recovery=await recoverReviewedCoreAdoption({application:result.output,output:join(f.home,'recovery'),stateSha256:digest(state)});
assert.equal(recovery.complete,true);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
assert.equal(git(f.root,'status','--porcelain'),'');
assert.ok(fs.existsSync(join(result.output,'application-state.json')));
}));

test('review and plan pins select exact independent data rather than a copied approval flag',{timeout:60000},()=>fixture(async f=>{const path=join(f.run,'review-v2/review.json'),value=JSON.parse(fs.readFileSync(path));
value.reviewed=true;
write(path,value);
await assert.rejects(applyReviewedCoreAdoption(f.options),/artifact changed/);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
assert.ok(!fs.existsSync(f.options.output));
}));

test('incomplete or failed actual producer and review receipts cannot apply any source',{timeout:60000},()=>fixture(async f=>{const path=join(f.run,'receipt.json'),original=fs.readFileSync(path);
write(path,[{exitCode:-9,resourceReason:'free-below-2GiB'}]);
await assert.rejects(applyReviewedCoreAdoption(f.options),/successful complete producer/);
fs.writeFileSync(path,original);
write(join(f.run,'review-monitor-v2/receipt.json'),{exitCode:0,reviewerQualified:false});
await assert.rejects(applyReviewedCoreAdoption(f.options),/successful independent review/);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
}));

test('original physical bytes Git source HEAD and source inventory are freshly rejoined',{timeout:60000},()=>fixture(async f=>{write(join(f.root,'src/lib.rs'),ORIGINAL+'// later edit\n');
await assert.rejects(applyReviewedCoreAdoption(f.options),/clean original/);
write(join(f.root,'src/lib.rs'),ORIGINAL);
write(join(f.root,'src/new.rs'),'fn extra(){}\n');
await assert.rejects(applyReviewedCoreAdoption(f.options),/clean original/);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
}));

test('changed decoded packet bytes and unlisted storage files refuse before staging',{timeout:60000},()=>fixture(async f=>{write(join(f.run,'migration-proposal/unreviewed.json.gz'),'not a packet');
await assert.rejects(applyReviewedCoreAdoption(f.options),/unlisted|inventory/);
assert.ok(!fs.existsSync(f.options.output));
fs.unlinkSync(join(f.run,'migration-proposal/unreviewed.json.gz'));
const selected=counterfeitCanonical(f);
await assert.rejects(applyReviewedCoreAdoption(selected),/concrete|Concrete|classification|partition/);
assert.ok(!fs.existsSync(f.options.output));
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
}));

test('linked original or artifact paths and reused output directories refuse',{timeout:60000},()=>fixture(async f=>{
await assert.rejects(applyReviewedCoreAdoption({...f.options,reviewDirectory:'../review-v2'}),/relative path/);
await assert.rejects(applyReviewedCoreAdoption({...f.options,reviewMonitorDirectory:'review-monitor'}),/successful independent review receipt/);
fs.mkdirSync(f.options.output);
await assert.rejects(applyReviewedCoreAdoption(f.options),/fresh physical output/);
fs.rmdirSync(f.options.output);
const path=join(f.run,'review-v2/review.json'),raw=fs.readFileSync(path),saved=join(f.home,'review-copy.json');
fs.writeFileSync(saved,raw);
fs.unlinkSync(path);
fs.symlinkSync(saved,path);
await assert.rejects(applyReviewedCoreAdoption(f.options),/linked path/);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
}));

test('recovery requires exact full retained preimages and refuses subsequent unrecognized source edits',{timeout:60000},()=>fixture(async f=>{const applied=await applyReviewedCoreAdoption(f.options),state=fs.readFileSync(join(applied.output,'application-state.json'));
write(join(f.root,'src/lib.rs'),f.after+'// another maintainer edit\n');
await assert.rejects(recoverReviewedCoreAdoption({application:applied.output,output:join(f.home,'recovery'),stateSha256:digest(state)}),/unrecognized later source edit/);
assert.ok(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8').endsWith('// another maintainer edit\n'));
assert.ok(fs.existsSync(join(applied.output,'before-0.bin')));
}));

test('recovery state and saved original bytes never authorize foreign or corrupted restoration',{timeout:60000},()=>fixture(async f=>{const applied=await applyReviewedCoreAdoption(f.options),statePath=join(applied.output,'application-state.json'),state=fs.readFileSync(statePath);
await assert.rejects(recoverReviewedCoreAdoption({application:applied.output,output:join(f.home,'wrong-state'),stateSha256:'0'.repeat(64)}),/state digest/);
write(join(applied.output,'before-0.bin'),'corrupted\n');
await assert.rejects(recoverReviewedCoreAdoption({application:applied.output,output:join(f.home,'corrupt-original'),stateSha256:digest(state)}),/recovery bytes/);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),f.after);
assert.ok(fs.existsSync(statePath));
}));


// Additional operational receiving controls. The original eight callbacks above
// remain byte exact. Both controller children retain their original twenty-second
// child cap inside this whole sixty-second case; no Rust process is launched.
test('actual bounded Python controller applies and explicitly recovers selected review-v2 bytes',{timeout:60000},()=>fixture(async f=>{
const script=join(ROOT,'scripts/apply-reviewed-core-adoption.py');
const command=(mode,output,extra)=>{
const args=[script,mode,'--root',f.root,'--run',f.run,'--output',output,...extra];
const raw=execFileSync('python3',args,{encoding:'utf8',timeout:20000,maxBuffer:1024**2,env:{...process.env}});
const receipt=JSON.parse(raw);
assert.equal(receipt.complete,true);
assert.equal(receipt.RustExecuted,false);
assert.equal(receipt.processGroupEmpty,true);
assert.equal(receipt.wallCapSeconds,60);
assert.ok(receipt.finalEvidenceBudget.allocatedBytes<=384*1024**2);
assert.ok(fs.existsSync(join(output,'command.json')));
assert.ok(fs.existsSync(join(output,'resources.jsonl')));
return receipt;
};
const firstOutput=join(f.home,'controller-apply');
const first=command('apply',firstOutput,['--expected-head',f.head,'--review-directory','review-v2','--review-monitor-directory','review-monitor-v2','--review-sha256',f.reviewSha256,'--plan-sha256',f.planSha256,'--index-sha256',f.indexSha256]);
assert.equal(first.sourceInstalled,true);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),f.after);
const application=first.applicationDirectory;
const state=fs.readFileSync(join(application,'application-state.json'));
const secondOutput=join(f.home,'controller-recovery');
const second=command('recover',secondOutput,['--application',application,'--state-sha256',digest(state)]);
assert.equal(second.explicitRecoveryCompleted,true);
assert.equal(fs.readFileSync(join(f.root,'src/lib.rs'),'utf8'),ORIGINAL);
assert.equal(git(f.root,'status','--porcelain'),'');
assert.ok(fs.readFileSync(join(application,'application-state.json')).equals(state));
assert.ok(fs.existsSync(join(application,'events.jsonl')));
assert.ok(fs.existsSync(join(application,'before-0.bin')));
assert.ok(fs.existsSync(join(firstOutput,'temporary')));
assert.ok(fs.existsSync(join(secondOutput,'temporary')));
},{controller:true}));

test('interrupted two-target application retains a mixed full-source state and unmodified recovery restores both',{timeout:60000},()=>fixture(async f=>{
const actualPath=join(ROOT,'tools/translation/apply-reviewed-core-adoption.mjs');
const original=fs.readFileSync(actualPath,'utf8');
let adapter=original;
const substitutions=[];
const replace=(expected,replacement)=>{
const start=adapter.indexOf(expected);
assert.ok(start>=0);
assert.equal(adapter.indexOf(expected,start+expected.length),-1);
substitutions.push({before:[start,start+expected.length],after:[start,start+replacement.length],expected,replacement});
adapter=adapter.slice(0,start)+replacement+adapter.slice(start+expected.length);
};
// Relocate the three genuine fixed imports without duplicating their helpers.
for(const path of ['./core-adoption-packet-storage.mjs','./concrete-syntax-meta.mjs','./rule-pipeline.mjs']){
replace("from '"+path+"'","from "+JSON.stringify(new URL(path,pathToFileURL(actualPath)).href));
}
const anchor="checkpoint('replace-intent',row.path);\nfs.renameSync(pending,target);";
replace(anchor,"checkpoint('replace-intent',row.path);\nif(state.rows.some(other=>other.status==='applied'))throw Error('fixture interruption after durable second intent');\nfs.renameSync(pending,target);");
let inverse=adapter;
for(const row of [...substitutions].reverse()){
assert.equal(inverse.slice(...row.after),row.replacement);
inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);
}
assert.equal(inverse,original);
const adapterPath=join(f.home,'interrupted-applicator.mjs');
fs.writeFileSync(adapterPath,adapter);
write(join(f.home,'full-adapter-source-and-inverse.json'),{original,adapter,substitutions,inverse,productionHook:false});
const issued=await import(pathToFileURL(adapterPath).href);
await assert.rejects(issued.applyReviewedCoreAdoption(f.options),/fixture interruption after durable second intent/);
const rawState=fs.readFileSync(join(f.options.output,'application-state.json'));
const state=JSON.parse(rawState);
assert.equal(state.rows.length,2);
assert.equal(state.rows[0].status,'applied');
assert.equal(state.rows[1].status,'intent');
assert.equal(state.complete,false);
assert.match(state.error,/fixture interruption/);
assert.ok(state.events.some(row=>row.kind==='failed'));
assert.ok(fs.readFileSync(join(f.root,state.rows[0].path)).equals(fs.readFileSync(join(f.options.output,state.rows[0].after))));
assert.ok(fs.readFileSync(join(f.root,state.rows[1].path)).equals(fs.readFileSync(join(f.options.output,state.rows[1].before))));
const pending=fs.readdirSync(f.options.output).filter(name=>/^replacement-[0-9]+\.bin$/.test(name));
assert.equal(pending.length,1);
const pendingBefore=fs.readFileSync(join(f.options.output,pending[0]));
assert.ok(pendingBefore.equals(fs.readFileSync(join(f.options.output,state.rows[1].after))));
const journalBefore=fs.readFileSync(join(f.options.output,'events.jsonl'));
const recovered=await recoverReviewedCoreAdoption({application:f.options.output,output:join(f.home,'mixed-recovery'),stateSha256:digest(rawState)});
assert.equal(recovered.complete,true);
for(const row of state.rows){
assert.ok(fs.readFileSync(join(f.root,row.path)).equals(fs.readFileSync(join(f.options.output,row.before))));
assert.ok(fs.existsSync(join(f.options.output,row.after)));
}
assert.equal(git(f.root,'status','--porcelain'),'');
assert.ok(fs.readFileSync(join(f.options.output,'application-state.json')).equals(rawState));
assert.ok(fs.readFileSync(join(f.options.output,'events.jsonl')).equals(journalBefore));
assert.ok(fs.readFileSync(join(f.options.output,pending[0])).equals(pendingBefore));
assert.equal(fs.readFileSync(actualPath,'utf8'),original);
},{twoTargets:true}));
