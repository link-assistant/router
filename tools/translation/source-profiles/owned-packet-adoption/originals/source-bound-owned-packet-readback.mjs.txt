// Complete source/data readback only. Fresh original proposers keep all private
// source/tool/derive checks; this operation never grants executable admission.
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {openCoreAdoptionGzipPackets} from './core-adoption-packet-storage.mjs';
import {SOURCE_BOUND_OWNED_CORE_STAGES,proposeSourceBoundOwnedCoreStage} from './source-bound-owned-core-bulk.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
const fail=message=>{throw new TypeError('Source-bound owned packet readback: '+message);};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
function object(value,keys,label){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own '+label+' required');
 const names=Reflect.ownKeys(value);if(names.length!==keys.length||names.some(name=>typeof name!=='string'||!keys.includes(name)))fail(label+' fields differ');
 for(const name of keys){const field=Object.getOwnPropertyDescriptor(value,name);if(!field||!Object.hasOwn(field,'value'))fail(label+' accessors refused');}return value;
}
function array(value,bound,label){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>bound||Reflect.ownKeys(value).length!==value.length+1)fail('bounded dense '+label+' required');
 for(let at=0;at<value.length;at++){const field=Object.getOwnPropertyDescriptor(value,String(at));if(!field||!Object.hasOwn(field,'value'))fail(label+' holes/accessors refused');}return value;
}
function except(value,keys){return Object.fromEntries(Object.keys(value).filter(key=>!keys.includes(key)).map(key=>[key,value[key]]));}
export async function reviewSourceBoundOwnedCorePackets(output,rootInput){
 if(typeof rootInput!=='string'||!rootInput.length||rootInput.length>IO.limits.pathUnits||rootInput.includes('\0')||realpathSync(rootInput)!==resolve(rootInput))fail('actual unlinked physical source root required');
 const root=resolve(rootInput),original=IO.snapshot(root),cargo=IO.sequenceDependencies(root),reader=openCoreAdoptionGzipPackets(output),index=reader.index;
 if(!cargo.inputs||cargo.rows.some(row=>row.absent)||index.sourceRoot!==root||index.entry!==IO.rootEntry(root)||!same(index.compilationProfile,PRODUCTION_PROFILE)||typeof index.sequence!=='string'||index.sequence.length>2048||!index.sequence.startsWith('source-bound-owned:'))fail('current complete original source/Cargo/stage association differs');
 const names=index.sequence.slice('source-bound-owned:'.length).split(',');
 if(!names.length||names.length>SOURCE_BOUND_OWNED_CORE_STAGES.length||new Set(names).size!==names.length||names.some(name=>!SOURCE_BOUND_OWNED_CORE_STAGES.includes(name)))fail('fixed unique owned stage sequence required');
 if(index.packetBytes+Buffer.byteLength(JSON.stringify(index)+'\n')+Buffer.byteLength(JSON.stringify(reader.storage)+'\n')>500000000)fail('complete task evidence bound exceeded');
 array(index.stages,names.length,'stage inventory');if(index.stages.length!==names.length)fail('complete stage census differs');
 const seen=new Set();
 function packet(descriptor,path,kind,text){
  object(descriptor,['path','kind','bytes','sha256'],'logical packet');
  if(descriptor.path!==path||descriptor.kind!==kind||seen.has(path))fail('duplicate or wrong exact packet path/kind');
  const raw=reader.read(descriptor);if(raw.toString('utf8')!==text)fail('fresh complete packet differs: '+path);seen.add(path);
 }
 const json=(descriptor,path,value)=>packet(descriptor,path,'json',JSON.stringify(value)+'\n');
 function list(descriptors,values,prefix){
  array(descriptors,IO.limits.packets,'packet references');if(descriptors.length!==values.length)fail('complete section packet census differs');
  for(let at=0;at<values.length;at++)json(descriptors[at],prefix+'/'+IO.numbered(at)+'.json',values[at]);
 }
 list(index.inputs,original.rows,'inputs');list(index.dependencyInputs,cargo.rows,'dependency-inputs');
 json(index.census,'inputs/census.json',{root,rows:original.census,sourceFiles:original.rows.length,sourceUnits:original.units});
 let current=Object.assign(Object.create(null),original.files),changedFiles=0;
 for(let at=0;at<names.length;at++){
  IO.rejoin(original);cargo.verify();
  const receipt=object(index.stages[at],['name','packets','summary','trace'],'stage receipt'),name=names[at],prefix='owned/'+IO.numbered(at)+'-'+name;
  if(receipt.name!==name)fail('ordered stage identity differs');
  const proposal=await proposeSourceBoundOwnedCoreStage(name,{entry:index.entry,files:current,dependencyInputs:cargo.inputs,compilationProfile:PRODUCTION_PROFILE});
  IO.rejoin(original);cargo.verify();
  const refs=object(receipt.packets,['metadata','before','after','inputs','proposals','moduleGraph'],'whole corpus packet references'),graph=proposal.moduleGraph;
  json(refs.metadata,prefix+'/metadata.json',{keys:Object.keys(proposal),values:except(proposal,['before','after','inputs','moduleGraph','proposals'])});
  list(refs.before,Object.entries(proposal.before).map(([path,source])=>({path,source})),prefix+'/before');
  list(refs.after,Object.entries(proposal.after).map(([path,source])=>({path,source})),prefix+'/after');
  list(refs.inputs,proposal.inputs,prefix+'/inputs');
  for(const row of proposal.proposals)IO.assertAdoptionInverse(row);
  list(refs.proposals,proposal.proposals,prefix+'/proposals');
  const parts=object(refs.moduleGraph,['metadata','modules','edges','diagnostics','concreteSyntaxMeta'],'complete graph packet references');
  json(parts.metadata,prefix+'/graph/metadata.json',{keys:Object.keys(graph),values:except(graph,['modules','edges','diagnostics','concreteSyntaxMeta'])});
  list(parts.modules,graph.modules,prefix+'/graph/modules');json(parts.edges,prefix+'/graph/edges.json',graph.edges);json(parts.diagnostics,prefix+'/graph/diagnostics.json',graph.diagnostics);list(parts.concreteSyntaxMeta,graph.concreteSyntaxMeta,prefix+'/graph/concrete');
  const paths=Object.keys(current).sort();if(!same(Object.keys(proposal.before).sort(),paths)||!same(Object.keys(proposal.after).sort(),paths)||paths.some(path=>proposal.before[path]!==current[path]))fail('complete fresh stage source chain differs');
  const summary={sourceFiles:paths.length,changedFiles:paths.filter(path=>proposal.before[path]!==proposal.after[path]).length,executableCoverageGain:null};
  if(!same(receipt.summary,summary)||!same(receipt.trace,[{phase:'language',id:'owned-source-packets:retain-complete-original-'+name},{phase:'repository',id:'router:partition-complete-'+name+'-source-evidence'}]))fail('complete source stage summary/phase trace differs');
  current=Object.assign(Object.create(null),proposal.after);
 }
 const changed=Object.entries(current).filter(([path,source])=>source!==original.files[path]);array(index.changes,original.rows.length,'changed source inventory');if(index.changes.length!==changed.length)fail('complete changed source census differs');
 for(let at=0;at<changed.length;at++){
  const [path,source]=changed[at],row=object(index.changes[at],['path','beforeSha256','afterSha256','source'],'changed source');
  if(row.path!==path||row.beforeSha256!==IO.hash(original.files[path])||row.afterSha256!==IO.hash(source))fail('fresh changed source association differs');
  packet(row.source,'after/'+path,'rust-source',source);changedFiles++;
 }
 if(seen.size!==index.packets.length||index.packets.some(row=>!seen.has(row.path)))fail('unreferenced or missing complete packet evidence');
 const result={schema:'source-bound-owned-core-packet-readback-v1',complete:true,sourceFiles:original.rows.length,cargoFiles:cargo.rows.length,stages:[...names],changedFiles,packetCount:seen.size,wholeOriginalProducersReexecuted:true,completeSourceInverses:true,sourceInverseIsReverseExecution:false,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false,newAcrossInvocationCache:false};
 reader.verify();IO.rejoin(original);cargo.verify();return result;
}
