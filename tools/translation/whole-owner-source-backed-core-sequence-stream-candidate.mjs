// Complete stagewise source proposals. Old full-value/default APIs are unchanged.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {coreSequenceStreamPacketIO as P,readWrittenCoreSequencePacket,assertOriginalCoreSequencePacketSource} from './core-sequence-stream-packet-io.mjs';
import {assertOriginalCoreSequenceStageSource,runOriginalCoreSequenceStage,reviewOriginalCoreSequenceStage,reviewOriginalCoreSequenceRow,originalCoreSequenceBaseGroups,originalCoreSequenceSourceDigest} from "./whole-owner-core-sequence-stage-source-candidate.mjs";
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {translationProgressReporter} from './translation-progress.mjs';
const NAMES=['formatting','matches','vectors'],SCHEMA="router-complete-whole-owner-core-sequence-stream-candidate-v1";
const fail=message=>{throw new TypeError('Source-backed core sequence stream: '+message);};
const same=(a,b)=>P.json(a)===P.json(b),own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function capture(root){
 assertOriginalCoreSequenceStageSource();assertOriginalCoreSequencePacketSource();
 const source=IO.snapshot(root),cargo=IO.sequenceDependencies(root);if(!cargo.inputs||cargo.rows.some(row=>row.absent))fail('complete actual Cargo inputs required');
 const facts={root,sourceRows:source.rows.map(row=>({path:row.path,sha256:P.hash(row.source),identity:row.identity})),sourceCensus:source.census,rootIdentity:{dev:source.rootIdentity.dev,ino:source.rootIdentity.ino,mode:source.rootIdentity.mode},cargoRows:cargo.rows};
 return {source,cargo,facts,verify(){assertOriginalCoreSequenceStageSource();assertOriginalCoreSequencePacketSource();IO.rejoin(source);cargo.verify();}};
}
function field(wire,key){
 if(!Array.isArray(wire?.record))fail('complete structural record required');const matches=wire.record.filter(row=>Array.isArray(row)&&row.length===2&&row[0]===key);if(matches.length!==1)fail('one complete structural field required');return matches[0][1];
}
function stageHeader(stage){return {schema:stage.schema,name:stage.name,entry:stage.entry,compilationProfile:stage.compilationProfile,cargo:stage.cargo,beforeSha256:stage.beforeSha256,afterSha256:stage.afterSha256,proposal:stage.proposal,semanticAdmission:false,executableCoverageGain:null};}
function mergeGroups(target,groups){for(const group of groups){let actual=target.get(group.id);if(!actual){actual={...group,selectedBy:[]};target.set(group.id,actual);}for(const name of group.selectedBy){if(actual.selectedBy.includes(name))fail('duplicate stage selection for original function');actual.selectedBy.push(name);}}}
// Keep only inverse-coordinate DATA from one complete reopened prior row.
// Its entire original row remains in storage and is independently rechecked.
function coordinateRow(row){return {proposal:row.proposal?{mapping:row.proposal.mapping}:null};}
function sortedGroups(groups){return [...groups.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}
function summary(original,final,stages,groups){return {sourceFiles:Object.keys(original).length,changedFiles:Object.keys(original).filter(path=>original[path]!==final[path]).length,candidateSelections:stages.reduce((sum,stage)=>sum+stage.summary.selectedFunctions,0),distinctCandidateFunctions:groups.size,stepSelections:stages.map(stage=>({step:stage.name,selectedFunctions:stage.summary.selectedFunctions})),functions:sortedGroups(groups)};}
function document(value,source,path){
 P.fields(value,['id','path','source','sha256','meta'],'complete source/CST document');
 if(value.path!==path||value.source!==source||value.sha256!==P.hash(source)||value.id!==P.hash(JSON.stringify([path,value.sha256]))||transportConcreteSyntaxMeta(value.meta).source!==source)fail('complete source/CST document differs');
}
function rawJSON(raw){const value=JSON.parse(raw);if(P.json(value)!==raw.toString('utf8'))fail('complete canonical JSON required');return value;}
export function proposeSourceBackedCoreSequenceStream(input,progressInput=undefined){
 const progress=translationProgressReporter(progressInput),{root,output}=P.requested(input),guard=capture(root),target=IO.destination(root,output),write=P.writer(target);
 const documents=new Map(),groups=new Map(),stages=[],original=guard.source.files;let phase='original-documents',current=original;
 const emit=(value,label)=>{const ref=write.emit(value,label),raw=readWrittenCoreSequencePacket(write,target.path,ref.packet);if(raw.toString('utf8')!==P.json(value))fail('complete written byte inverse differs');return ref;};
 const stored=ref=>rawJSON(readWrittenCoreSequencePacket(write,target.path,ref.packet));
 function refs(map){return Object.keys(map).sort().map(path=>{
  const source=map[path],sha256=P.hash(source),id=P.hash(JSON.stringify([path,sha256]));let descriptor=documents.get(id);
  if(!descriptor){const concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),value={id,path,source,sha256,meta:concrete.meta},packet=emit(value,'documents:'+documents.size);descriptor={id,path,sha256,packet};documents.set(id,descriptor);}else document(stored(descriptor.packet),source,path);
  progress({stage:'plan',state:'advance',phase:'complete-source-CST',source:path,completed:documents.size});return {path,document:id};
 });}
 function produceStage(name,before){
  phase=name;guard.verify();progress({stage:'corpus',state:'start',phase:name});guard.verify();
  // This lexical stage is deliberately never returned or retained in stages.
  const stage=runOriginalCoreSequenceStage({name,entry:IO.rootEntry(root),files:before,dependencyInputs:guard.cargo.inputs,compilationProfile:PRODUCTION_PROFILE});
  progress({stage:'corpus',state:'end',phase:name,total:stage.proposal.rows.length});guard.verify();
  const inputs=refs(stage.originalFiles),outputs=refs(stage.files),wire=P.wire(stageHeader(stage),emit,'stage:'+name);
  const rowRefs=field(field(wire,'proposal'),'rows').array;if(rowRefs?.length!==stage.proposal.rows.length)fail('complete stage row packet census differs');
  const rows=stage.proposal.rows.map((row,at)=>({path:row.path,packet:rowRefs[at]}));
  for(const row of stage.proposal.rows){if(!row.proposal?.functions.length)continue;
   const prior=stages.map(previous=>{const reference=previous.rows.find(value=>value.path===row.path);if(!reference)fail('complete prior row absent');return {name:previous.name,row:coordinateRow(stored(reference.packet))};});
   mergeGroups(groups,originalCoreSequenceBaseGroups(original,name,row,prior));
  }
  guard.verify();write.current();progress({stage:'plan',state:'end',phase:name,completed:stages.length+1,outputs:write.packets.length});guard.verify();
  return {after:stage.files,descriptor:{name,inputs,outputs,wire,rows,beforeSha256:stage.beforeSha256,afterSha256:stage.afterSha256,summary:stage.proposal.summary,complete:true}};
 }
 try{
  const originalRefs=refs(original);
  for(const name of NAMES){const completed=produceStage(name,current);current=completed.after;stages.push(completed.descriptor);}
  phase='complete-index';const finalRefs=refs(current),resultSummary=summary(original,current,stages,groups);
  const manifest={schema:SCHEMA,entry:IO.rootEntry(root),compilationProfile:PRODUCTION_PROFILE,physical:guard.facts,originalRefs,finalRefs,documents:[...documents.values()],stages,summary:resultSummary,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false,sourceCstInverseIsReverseExecution:false,newAcrossInvocationCache:false};
  progress({stage:'plan',state:'start',phase:'all-stages-EOF-and-full-packet-reopen',completed:3,outputs:write.packets.length});guard.verify();
  for(let ordinal=0;ordinal<write.packets.length;ordinal++)readWrittenCoreSequencePacket(write,target.path,ordinal);
  guard.verify();write.current();
  const index=write.complete(root,manifest);
  return {schema:SCHEMA,complete:true,output:target.physical,summary:resultSummary,packets:index.packets.length,logicalBytes:index.logicalBytes,storedBytes:index.storedBytes,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false};
 }catch(error){write.failure(error,phase);throw error;}
}
export function reviewSourceBackedCoreSequenceStream(input,progressInput=undefined){
 const progress=translationProgressReporter(progressInput),{root,output}=P.requested(input),storage=P.reader(output),guard=capture(root),manifest=storage.index.wire,used=new Set(),usedDocuments=new Set(),groups=new Map();
 P.fields(manifest,['schema','entry','compilationProfile','physical','originalRefs','finalRefs','documents','stages','summary','semanticAdmission','executableCoverageGain','applicationSourcesInstalled','sourceCstInverseIsReverseExecution','newAcrossInvocationCache'],'stream manifest');
 if(storage.index.sourceRoot!==root||manifest?.schema!==SCHEMA||manifest.semanticAdmission!==false||manifest.executableCoverageGain!==null||manifest.applicationSourcesInstalled!==false||manifest.sourceCstInverseIsReverseExecution!==false||manifest.newAcrossInvocationCache!==false||!same(manifest.physical,guard.facts)||!same(manifest.compilationProfile,PRODUCTION_PROFILE)||manifest.entry!==IO.rootEntry(root)||!Array.isArray(manifest.stages)||manifest.stages.length!==3||!Array.isArray(manifest.documents))fail('complete fixed physical source-only manifest differs');
 const docs=new Map();for(const row of manifest.documents){P.fields(row,['id','path','sha256','packet'],'document descriptor');P.fields(row.packet,['packet'],'document packet reference');if(docs.has(row.id)||!row.packet||row.id!==P.hash(JSON.stringify([row.path,row.sha256])))fail('unique original document descriptor required');docs.set(row.id,row);}
 function read(ref){P.fields(ref,['packet'],'packet reference');if(!Number.isSafeInteger(ref.packet))fail('complete packet reference required');used.add(ref.packet);return rawJSON(storage.read(ref.packet));}
 function references(refs,map){
  const paths=Object.keys(map).sort();if(!Array.isArray(refs)||refs.length!==paths.length)fail('complete ordered source reference census differs');
  for(const [at,ref]of refs.entries()){P.fields(ref,['path','document'],'source reference');const descriptor=docs.get(ref.document);if(ref.path!==paths[at]||descriptor?.path!==ref.path)fail('complete current document reference differs');document(read(descriptor.packet),map[ref.path],ref.path);usedDocuments.add(descriptor.id);}
 }
 let current=guard.source.files;references(manifest.originalRefs,current);
 function reviewStage(descriptor,before,position){
  P.fields(descriptor,['name','inputs','outputs','wire','rows','beforeSha256','afterSha256','summary','complete'],'stage descriptor');
  const name=NAMES[position];if(descriptor.name!==name||descriptor.complete!==true)fail('fixed complete stage order differs');references(descriptor.inputs,before);guard.verify();
  progress({stage:'corpus',state:'start',phase:'native-equation-'+name});guard.verify();
  const stage=runOriginalCoreSequenceStage({name,entry:manifest.entry,files:before,dependencyInputs:guard.cargo.inputs,compilationProfile:manifest.compilationProfile});
  const expected=P.wire(stageHeader(stage),(value,label)=>{
   // Wire traversal is deterministic, but document packets may precede it. Use
   // the supplied position only after comparing its full canonical structure.
   return {value,label};
  },'stage:'+name);
  function compare(actual,retained){
   if(own(actual,'value')){P.fields(retained,['packet'],'stage leaf reference');if(!Number.isSafeInteger(retained.packet))fail('complete stage leaf reference required');const row=storage.index.packets[retained.packet],text=P.json(actual.value);if(!row||row.label!==actual.label||row.bytes!==Buffer.byteLength(text)||row.sha256!==P.hash(text)||storage.read(retained.packet).toString('utf8')!==text)fail('fresh complete native stage equation differs');if(used.has(retained.packet))fail('multiply referenced native stage leaf');used.add(retained.packet);return;}
   if(!actual||!retained||!same(Object.keys(actual),Object.keys(retained)))fail('complete stage structural equation differs');
   for(const key of Object.keys(actual)){if(key==='record'){if(actual.record.length!==retained.record?.length)fail('complete record field census differs');for(let at=0;at<actual.record.length;at++){if(actual.record[at][0]!==retained.record[at][0])fail('complete record field order differs');compare(actual.record[at][1],retained.record[at][1]);}}
    else if(key==='array'){if(actual.array.length!==retained.array?.length)fail('complete stage array census differs');actual.array.forEach((value,at)=>compare(value,retained.array[at]));}
    else if(key==='map'){if(actual.map.length!==retained.map?.length)fail('complete stage map census differs');actual.map.forEach(([path,value],at)=>{if(path!==retained.map[at][0])fail('complete source map path order differs');compare(value,retained.map[at][1]);});}
    else fail('unknown native stage structural field');}
  }
  compare(expected,descriptor.wire);const checked=reviewOriginalCoreSequenceStage(stage);
  if(!same(checked.summary,descriptor.summary)||descriptor.beforeSha256!==stage.beforeSha256||descriptor.afterSha256!==stage.afterSha256)fail('complete stage summary/source digests differ');
  const rowRefs=field(field(descriptor.wire,'proposal'),'rows').array;if(!Array.isArray(descriptor.rows)||descriptor.rows.length!==stage.proposal.rows.length)fail('complete source row descriptor census differs');
  for(const [at,row]of stage.proposal.rows.entries()){
   P.fields(descriptor.rows[at],['path','packet'],'row descriptor');P.fields(descriptor.rows[at].packet,['packet'],'row packet reference');
   if(descriptor.rows[at].path!==row.path||!same(descriptor.rows[at].packet,rowRefs[at]))fail('exact source row structural reference differs');
   if(!row.proposal?.functions.length)continue;
   const prior=manifest.stages.slice(0,position).map(previous=>{const reference=previous.rows.find(value=>value.path===row.path);if(!reference)fail('complete prior row absent');return {name:previous.name,row:coordinateRow(read(reference.packet))};});
   mergeGroups(groups,originalCoreSequenceBaseGroups(guard.source.files,name,row,prior));
  }
  references(descriptor.outputs,stage.files);storage.verify();guard.verify();progress({stage:'corpus',state:'end',phase:'native-equation-'+name,completed:position+1});guard.verify();
  return stage.files;
 }
 for(let at=0;at<NAMES.length;at++)current=reviewStage(manifest.stages[at],current,at);
 references(manifest.finalRefs,current);
 const actualSummary=summary(guard.source.files,current,manifest.stages,groups);if(!same(actualSummary,manifest.summary))fail('distinct original function summary differs');
 // Complete inverse uses one retained row/CST at a time, never three decoded
 // proposals or private views issued for an earlier source map.
 for(const stage of [...manifest.stages].reverse()){
  if(originalCoreSequenceSourceDigest(current)!==stage.afterSha256)fail('complete inverse stage begins at foreign source');
  for(const reference of stage.rows){const row=read(reference.packet);if(row.path!==reference.path)fail('complete inverse physical row differs');if(!row.proposal)continue;
   const value=reviewOriginalCoreSequenceRow(stage.name,row,row.proposal.before.source);if(current[row.path]!==value.after.source)fail('complete inverse file begins at foreign source');current[row.path]=value.before.source;
  }
  if(originalCoreSequenceSourceDigest(current)!==stage.beforeSha256)fail('complete original stage inverse differs');
 }
 if(!same(current,guard.source.files)||usedDocuments.size!==docs.size||used.size!==storage.index.packets.length)fail('complete original source/document/packet inverse census differs');
 progress({stage:'plan',state:'end',phase:'independent-full-stage-inverse-and-native-equations',completed:3,outputs:used.size});storage.verify();guard.verify();
 return {schema:'router-complete-source-core-sequence-stream-readback-v1',complete:true,summary:actualSummary,packets:used.size,allPacketsDecoded:true,completeSourceInverse:true,freshNativeSourceEquations:true,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const raw=process.argv.slice(2),enabled=raw.at(-1)==='--progress',args=enabled?raw.slice(0,-1):raw;
 if(args.length!==5||!['propose','review'].includes(args[0])||args[1]!=='--root'||args[3]!=='--output')fail('usage: propose|review --root PHYSICAL_ROOT --output OUTSIDE_DIRECTORY [--progress]');
 const operation=args[0]==='propose'?proposeSourceBackedCoreSequenceStream:reviewSourceBackedCoreSequenceStream,progress=enabled?event=>process.stderr.write(JSON.stringify(event)+'\n'):undefined;
 console.log(JSON.stringify(operation({root:args[2],output:args[4]},progress)));
}
