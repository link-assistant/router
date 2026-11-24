import {inspectVectorProposalData} from './vector-proposal-data.mjs';
// Generated complete bounded vector DATA transport; prepare-source-backed-vectors.mjs owns this file.
// Proposal-only bounded formatting storage. No application source is installed.
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {vectorPacketIO as IO} from "./vector-packet-io.mjs";
import * as gzipStorage from "./vector-packet-storage.mjs";
import {iterateSourceBackedCoreVectorCorpusPackets} from "./source-backed-vector-packets.mjs";
import {createRulePipeline} from './rule-pipeline.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {translationProgressReporter} from './translation-progress.mjs';
import {reviewSourceBackedVectorPackets} from "./review-source-backed-vector-packets.mjs";
const fail=message=>{throw new TypeError("Vector packet CLI: "+message);};
const metadataKeys=['schema','producerEffects','bindingInspections','entry','compilationProfile','inputs','rows','summary','moduleEdges','moduleDiagnostics','semanticAdmission','migrationSemantics','libraryImplementation'],excluded=['inputs','rows','bindingInspections','moduleEdges','moduleDiagnostics'];
function inspectionInverse(row,files){
 if(typeof row.path!=='string'||row.before?.source!==files[row.path]||typeof row.after?.source!=='string'||!Array.isArray(row.edits)||row.inverse!==row.before.source||row.sourceInspectionOnly!==true||row.executableAdmission!==false)fail('complete original inspection association differs');
 let current=row.after.source;for(const edit of [...row.edits].reverse()){if(!Array.isArray(edit.span)||current.slice(...edit.span)!==edit.replacement||row.before.source.slice(...edit.span)!==edit.expected)fail('inspection source substitution differs');current=current.slice(0,edit.span[0])+edit.expected+current.slice(edit.span[1]);}if(current!==row.before.source)fail('complete inspection source inverse differs');
}
function vectorStage(original,dependencies,write){
 return createRulePipeline([
  {phase:'language',rules:[{id:"rust:complete-original-vector-corpus-packet-stream",apply:()=>iterateSourceBackedCoreVectorCorpusPackets({entry:IO.rootEntry(original.root),files:original.files,compilationProfile:PRODUCTION_PROFILE,...(dependencies.inputs?{dependencyInputs:dependencies.inputs}:{})})}]},
  {phase:'repository',rules:[{id:"router:distinct-vector-schema-and-bounded-complete-gzip-packets",apply:stream=>{
   const paths=Object.keys(original.files),packets={metadata:null,rows:[],bindingInspections:[],inputs:[],moduleEdges:null,moduleDiagnostics:null},changes=[],inspected=new Set(),seen=new Set(),summary={files:paths.length,proposed:0,unchanged:0,skipped:0,selectedFunctions:0};let finalMetadata=null,drained=false;
   const arrays=new Map([['rows',packets.rows],['binding-inspections',packets.bindingInspections],['inputs',packets.inputs]]),singles=new Map([['metadata','metadata'],['module-edges','moduleEdges'],['module-diagnostics','moduleDiagnostics']]);
   function accept(raw){
    const event=IO.adoptionStreamEvent(raw),list=arrays.get(event.section),single=singles.get(event.section);if(!list&&!single||list&&event.ordinal!==list.length||single&&(event.ordinal!==0||seen.has(event.section)))fail("unknown duplicate or unordered vector packet");
    const value=JSON.parse(event.text);if(JSON.stringify(value)+'\n'!==event.text)fail("complete canonical vector packet required");
    if(event.section==='rows'){
     if(event.ordinal>=paths.length||value.path!==paths[event.ordinal]||!['proposed','unchanged','skipped'].includes(value.status)||!Array.isArray(value.origins))fail('complete physical row origin/status differs');summary[value.status]++;
     if(value.proposal){const proposal=value.proposal;if(proposal.before?.source!==original.files[value.path]||typeof proposal.after?.source!=='string'||!Array.isArray(proposal.functions)||!Array.isArray(proposal.edits)||proposal.executableAdmission!==false)fail("per-file vector source association differs");IO.assertAdoptionInverse(proposal);inspectVectorProposalData(proposal);summary.selectedFunctions+=proposal.functions.length;if((proposal.edits.length>0)!==(value.status==='proposed'))fail("vector row selection/status differs");if(proposal.after.source!==original.files[value.path])changes.push({path:value.path,beforeSha256:IO.hash(proposal.before.source),afterSha256:IO.hash(proposal.after.source),source:write.text('after/'+value.path,proposal.after.source)});}
     else if(value.status==='proposed')fail("proposed vector row has no complete source");
    }else if(event.section==='binding-inspections'){inspectionInverse(value,original.files);if(inspected.has(value.path))fail('duplicate physical inspection source');inspected.add(value.path);}
    else if(event.section==='inputs'){if(event.ordinal>=paths.length||value.path!==paths[event.ordinal]||value.source!==original.files[value.path]||value.sha256!==IO.hash(value.source))fail('complete source input/digest differs');}
    else if(event.section==='metadata'){if(JSON.stringify(value.keys)!==JSON.stringify(metadataKeys)||JSON.stringify(Object.keys(value.values??{}))!==JSON.stringify(metadataKeys.filter(key=>!excluded.includes(key)))||value.values.schema!=="router-owned-source-backed-vector-corpus-proposal-v1"||value.values.entry!==IO.rootEntry(original.root)||value.values.semanticAdmission!==false||JSON.stringify(value.values.summary)!==JSON.stringify(summary))fail("complete distinct vector metadata differs");finalMetadata=value.values;}
    else if(!Array.isArray(value))fail('complete module edge/diagnostic array required');
    const reference=write.jsonText("vector/"+event.section+(list?'/'+IO.numbered(event.ordinal):'')+'.json',event.text);if(list)list.push(reference);else packets[single]=reference;seen.add(event.section);
   }
   try{let result;for(;;){const next=stream.next();if(next.done){result=next.value;break;}accept(next.value);}stream.verify();IO.rejoin(original);dependencies.verify();
    if(!finalMetadata||packets.rows.length!==paths.length||packets.inputs.length!==paths.length||!['metadata','module-edges','module-diagnostics'].every(key=>seen.has(key))||result?.counts?.rows!==paths.length||result.counts.bindingInspections!==packets.bindingInspections.length||JSON.stringify(result.summary)!==JSON.stringify(summary))fail("incomplete vector stream EOF/census");drained=true;return {packets,changes,summary,verify:()=>stream.verify()};
   }finally{if(!drained)stream.return();}
  }}]},
 ]).run(null);
}
export function proposeSourceBackedVectorGzipPackets(input,progressInput=undefined){
 if(!['darwin','linux'].includes(process.platform))fail('POSIX physical source receiving required');const requested=IO.options(input),progress=progressInput==null?null:translationProgressReporter(progressInput);
 if(progress)progress({stage:'corpus',state:'start',phase:"vector-source-discovery"});
 const root=realpathSync(resolve(requested.root)),target=IO.destination(root,requested.output),original=IO.snapshot(root),dependencies=IO.sequenceDependencies(root),write=IO.writer(target,gzipStorage,progress);let stage="source-backed-vector";
 if(progress)progress({stage:'corpus',state:'end',phase:"vector-source-discovery",total:original.rows.length});
 try{
  IO.rejoin(original);dependencies.verify();const result=vectorStage(original,dependencies,write),next=result.value;stage='final-source-and-index';
  const dependencyInputs=dependencies.rows.map((row,at)=>write.json('dependency-inputs/'+IO.numbered(at)+'.json',row)),inputs=original.rows.map((row,at)=>write.json('inputs/'+IO.numbered(at)+'.json',row)),census=write.json('inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units});
  const index={schema:"router-source-backed-vector-packets-v1",complete:true,sequence:"source-backed-vector",entry:IO.rootEntry(root),sourceRoot:root,compilationProfile:PRODUCTION_PROFILE,limits:IO.limits,inputs,dependencyInputs,census,stages:[{name:"source-backed-vector",packets:next.packets,summary:next.summary,trace:result.trace}],changes:next.changes,packets:[...write.records],packetBytes:write.bytes,semanticAdmission:false,installation:"complete source vector proposal only; review every original source, packet and inverse before separate application; no sources are installed",sourceChain:"complete vector rows retain original physical inputs and exact edited sources; binding inspections are temporary DATA; full mappings and inverses retain every original byte",hostBoundary:'stock Node/Bun filesystem/JSON/rule runner; exclusive owned output lifetime; non-atomic source snapshots, no arbitrary concurrent same-UID writer or hostile-intrinsic-total claim',memory:'one full original graph/private producer context, normalized primitive source map and one complete per-file CST scope; no corpus proposal array; receiving resource qualification required'};
  const text=JSON.stringify(index)+'\n',prepared=write.prepareGzip(text);if(progress)progress({stage:'fingerprint',state:'start',phase:"vector-final-source-and-index"});next.verify();IO.rejoin(original);dependencies.verify();write.completeGzip(text,prepared);
  return {schema:index.schema,complete:true,output:target.physical,index:'index.json',sourceFiles:original.rows.length,changedFiles:next.changes.length,summary:next.summary,packetCount:index.packets.length,packetBytes:index.packetBytes,storedBytes:prepared.storedOutputBytes,logicalBytes:write.bytes,storageIndex:'packet-storage.json',storageSha256:prepared.sha256,semanticAdmission:false};
 }catch(error){try{write.failure(error,stage);}catch(reportFailure){const failure=new Error("vector proposal failed and its incomplete receipt could not be written");failure.cause=error;failure.reportFailure=reportFailure;throw failure;}throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const raw=process.argv.slice(2);if(raw.length===2&&raw[0]==='--review')console.log(JSON.stringify(reviewSourceBackedVectorPackets(raw[1])));
 else{const enabled=raw.at(-1)==='--progress',args=enabled?raw.slice(0,-1):raw;if(args.length!==6||args[0]!=='--root'||args[2]!=='--output'||args[4]!=='--packet-storage'||args[5]!=='gzip')fail('usage: --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY --packet-storage gzip [--progress] | --review PROPOSAL_DIRECTORY');const started=enabled?process.hrtime.bigint():null,progress=enabled?record=>process.stderr.write(JSON.stringify({...record,elapsedMilliseconds:Number((process.hrtime.bigint()-started)/1000000n)})+'\n'):undefined;console.log(JSON.stringify(proposeSourceBackedVectorGzipPackets({root:args[1],output:args[3]},progress)));}
}
