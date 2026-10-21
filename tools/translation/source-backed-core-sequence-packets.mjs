// Opt-in source proposals only. Packet hashes and DATA issue no source owners.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {encodeFormattingGzipPacket,SOURCE_FORMATTING_GZIP_LIMITS as GZIP} from './formatting-packet-storage.mjs';
import {proposePhysicalCoreAdoptionSequence,reviewPhysicalCoreAdoptionSequence} from './physical-core-adoption-sequence.mjs';
export const SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS=Object.freeze({...IO.limits,storedBytes:GZIP.storedBytes});
const L=SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS,RESERVE=GZIP.failureReserve;
const SCHEMA='router-source-backed-core-sequence-gzip-packets-v1',SEQUENCE='source-backed-formatting-matches-vectors';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Source-backed core sequence packets: '+message);};
const directorySame=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;
const fileSame=(a,b)=>directorySame(a,b)&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
const json=value=>{const text=JSON.stringify(value);if(typeof text!=='string')fail('complete JSON leaf required');return text+'\n';};
function fields(value,expected,label){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own '+label+' record required');
 const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
 if(names.length!==expected.length||names.some(name=>typeof name!=='string'||!expected.includes(name)||!Object.hasOwn(descriptors[name],'value')))fail('exact '+label+' fields required');
}
function requested(input){
 const options=IO.options(input),root=realpathSync(resolve(options.root));
 if(root!==resolve(options.root))fail('physical unlinked source root required');
 const output=resolve(options.output);
 if(output===root||output.startsWith(root+'/')||root.startsWith(output+'/'))fail('disjoint source and packet roots required');
 return {root,output};
}
function sources(root){
 const source=IO.snapshot(root),cargo=IO.sequenceDependencies(root);
 if(!cargo.inputs||cargo.rows.some(row=>row.absent))fail('complete package/workspace/lock inputs required');
 return {verify(){IO.rejoin(source);cargo.verify();}};
}
// Each full source/CST/inspection row is one bounded leaf. The structural wire
// retains original field order. No complete-result JSON allocation is made.
function wire(value,emit,label='complete'){
 const arrays=new Set(['documents','inputs','rows','bindingInspections','sourceRows','sourceCensus']),entries=[];
 for(const [key,part]of Object.entries(value)){
  if(part===undefined)continue;
  let item;
  if(key==='originalFiles'||key==='files')item={map:Object.entries(part).map(([path,text])=>[path,emit(text,label+'.'+key+':'+path)])};
  else if(key==='history')item={array:part.map((row,at)=>wire(row,emit,label+'.history:'+at))};
  else if(['sequence','physical','proposal'].includes(key))item=wire(part,emit,label+'.'+key);
  else if(arrays.has(key)&&Array.isArray(part))item={array:part.map((row,at)=>emit(row,label+'.'+key+':'+at))};
  else item=emit(part,label+'.'+key);
  entries.push([key,item]);
 }
 return {record:entries};
}
function writer(target){
 if(!directorySame(target.identity,lstatSync(target.parent)))fail('physical output parent changed');
 mkdirSync(target.path,{recursive:false});const identity=lstatSync(target.path),packets=[];
 let logicalBytes=0,storedBytes=0;
 function current(){if(!directorySame(identity,lstatSync(target.path))||realpathSync(target.path)!==target.physical||!directorySame(target.identity,lstatSync(target.parent)))fail('owned physical output changed');}
 function emit(value,label){
  const text=json(value);if(typeof text!=='string')fail('complete JSON leaf required');
  const bytes=Buffer.byteLength(text);if(bytes>L.packetBytes||logicalBytes+bytes>L.outputBytes-RESERVE||packets.length>=L.packets)fail('original logical packet/output/count bound');
  const encoded=encodeFormattingGzipPacket(text);
  if(storedBytes+encoded.bytes.length>L.storedBytes-RESERVE)fail('original stored output bound');
  current();const file=String(packets.length).padStart(6,'0')+'.json.gz';writeFileSync(join(target.path,file),encoded.bytes,{flag:'wx'});
  const row={file,label,bytes,sha256:hash(text),storedBytes:encoded.bytes.length,storedSha256:encoded.sha256};
  packets.push(row);logicalBytes+=bytes;storedBytes+=encoded.bytes.length;current();return {packet:packets.length-1};
 }
 return {emit,current,packets,
  complete(root,structure){
   const index={schema:SCHEMA,complete:true,sequence:SEQUENCE,sourceRoot:root,limits:L,logicalBytes,storedBytes,packets,wire:structure,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false};
   const text=json(index),bytes=Buffer.byteLength(text);
   if(bytes>L.packetBytes||logicalBytes+bytes>L.outputBytes-RESERVE||storedBytes+bytes>L.storedBytes-RESERVE)fail('complete index/output bound');
   current();writeFileSync(join(target.path,'index.json'),text,{flag:'wx'});current();return index;
  },
  failure(error,stage){
   const descriptor=error&&typeof error==='object'&&!types.isProxy(error)?Object.getOwnPropertyDescriptor(error,'message'):null;
   const message=descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='string'?descriptor.value.slice(0,4096):'unreported failure';
   const text=json({schema:SCHEMA,complete:false,sequence:SEQUENCE,stage,message,packets:packets.length,logicalBytes,storedBytes,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false});
   if(Buffer.byteLength(text)>RESERVE)fail('bounded incomplete receipt');current();writeFileSync(join(target.path,'failure.json'),text,{flag:'wx'});
  }};
}
function reader(output){
 const root=realpathSync(output);if(root!==resolve(output))fail('physical unlinked packet root required');
 const identity=lstatSync(root);if(!identity.isDirectory()||identity.isSymbolicLink())fail('physical packet directory required');
 function read(name,maximum){
  if(name!=='index.json'&&!/^[0-9]{6}\.json\.gz$/u.test(name))fail('canonical packet filename required');
  const path=join(root,name),before=lstatSync(path);
  if(!before.isFile()||before.isSymbolicLink()||before.size>maximum)fail('bounded regular packet required');
  const bytes=readFileSync(path);if(!fileSame(before,lstatSync(path))||bytes.length!==before.size)fail('packet changed during read');return {bytes,identity:before};
 }
 const control=read('index.json',L.packetBytes);let index;
 try{index=JSON.parse(control.bytes);}catch{fail('complete canonical JSON index required');}
 if(json(index)!==control.bytes.toString('utf8'))fail('canonical index/unique keys required');
 fields(index,['schema','complete','sequence','sourceRoot','limits','logicalBytes','storedBytes','packets','wire','semanticAdmission','executableCoverageGain','applicationSourcesInstalled'],'index');
 if(index.schema!==SCHEMA||index.sequence!==SEQUENCE||index.complete!==true||index.semanticAdmission!==false||index.executableCoverageGain!==null||index.applicationSourcesInstalled!==false||json(index.limits)!==json(L))fail('fixed source-only sequence/limits required');
 if(!Array.isArray(index.packets)||index.packets.length>L.packets)fail('original packet count bound');
 let logicalBytes=0,storedBytes=0;const listed=['index.json'],identities=[];
 for(const [at,row]of index.packets.entries()){
  fields(row,['file','label','bytes','sha256','storedBytes','storedSha256'],'packet descriptor');
  if(row.file!==String(at).padStart(6,'0')+'.json.gz'||typeof row.label!=='string'||row.label.length>L.pathUnits*4||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>L.packetBytes||!Number.isSafeInteger(row.storedBytes)||row.storedBytes<0||row.storedBytes>L.storedBytes||![row.sha256,row.storedSha256].every(value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value)))fail('bounded complete packet descriptor required');
  const state=lstatSync(join(root,row.file));if(!state.isFile()||state.isSymbolicLink()||state.size!==row.storedBytes)fail('complete stored packet census differs');
  identities.push(state);listed.push(row.file);logicalBytes+=row.bytes;storedBytes+=row.storedBytes;
 }
 if(index.logicalBytes!==logicalBytes||index.storedBytes!==storedBytes||logicalBytes+control.bytes.length>L.outputBytes-RESERVE||storedBytes+control.bytes.length>L.storedBytes-RESERVE)fail('complete aggregate output bound');
 function verify(){
  if(!directorySame(identity,lstatSync(root))||realpathSync(root)!==root||json(readdirSync(root).sort())!==json([...listed].sort()))fail('complete physical packet directory differs');
  const current=read('index.json',L.packetBytes);if(!fileSame(current.identity,control.identity)||!current.bytes.equals(control.bytes))fail('complete index changed');
  for(const [at,row]of index.packets.entries())if(!fileSame(identities[at],lstatSync(join(root,row.file))))fail('complete stored packet identity changed');
 }
 verify();
 return {index,verify,read(at){
  const row=index.packets[at];if(!row)fail('actual packet ordinal absent');
  const packed=read(row.file,L.storedBytes);if(!fileSame(packed.identity,identities[at])||hash(packed.bytes)!==row.storedSha256)fail('complete compressed packet differs');
  let decoded;try{decoded=gunzipSync(packed.bytes,{maxOutputLength:Math.max(1,row.bytes)});}catch{fail('decoded gzip/packet bound differs');}
  if(decoded.length!==row.bytes||hash(decoded)!==row.sha256)fail('complete decoded packet differs');
  let value;try{value=JSON.parse(decoded);}catch{fail('complete JSON packet required');}
  if(json(value)!==decoded.toString('utf8'))fail('canonical packet/unique keys required');return decoded;
 }};
}
/** Fixed current native sequence; no caller-provided rule or verifier is used. */
export function proposeSourceBackedCoreSequencePackets(input){
 const {root,output}=requested(input),target=IO.destination(root,output),guard=sources(root),write=writer(target);let stage='native-complete-proposal';
 try{
  const actual=proposePhysicalCoreAdoptionSequence(root);stage='complete-packets';
  const structure=wire(actual,write.emit);guard.verify();write.current();const index=write.complete(root,structure);guard.verify();
  return {schema:SCHEMA,complete:true,sequence:SEQUENCE,output:target.physical,sourceFiles:actual.sequence.summary.sourceFiles,changedFiles:actual.sequence.summary.changedFiles,candidateSelections:actual.sequence.summary.candidateSelections,distinctCandidateFunctions:actual.sequence.summary.distinctCandidateFunctions,packets:index.packets.length,logicalBytes:index.logicalBytes,storedBytes:index.storedBytes,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false};
 }catch(error){write.failure(error,stage);throw error;}
}
/** Full readback plus fresh genuine source equations, never saved authority. */
export function reviewSourceBackedCoreSequencePackets(input){
 const {root,output}=requested(input),storage=reader(output),guard=sources(root);
 if(storage.index.sourceRoot!==root)fail('actual physical source root differs');
 // Regenerate the complete sequence with fresh graphs/private inspection and
 // Cargo at every phase. Compare one decoded leaf at a time, avoiding a second
 // complete detached CST tree alongside the genuine current proposal.
 const actual=proposePhysicalCoreAdoptionSequence(root);let ordinal=0;
 const structure=wire(actual,(value,label)=>{
  const row=storage.index.packets[ordinal],expected=json(value);
  if(!row||row.label!==label||row.bytes!==Buffer.byteLength(expected)||row.sha256!==hash(expected)||!storage.read(ordinal).equals(Buffer.from(expected)))fail('fresh complete native source equation differs');
  return {packet:ordinal++};
 });
 if(ordinal!==storage.index.packets.length||json(structure)!==json(storage.index.wire))fail('complete native structural equation differs');
 const reviewed=reviewPhysicalCoreAdoptionSequence(actual,root);storage.verify();guard.verify();
 return {schema:'router-source-backed-core-sequence-gzip-readback-v1',sequence:SEQUENCE,complete:true,packets:ordinal,allPacketsDecoded:true,freshNativeSourceEquations:true,completeSourceInverse:reviewed.completeSourceInverse,summary:reviewed.summary,semanticAdmission:false,executableCoverageGain:null,applicationSourcesInstalled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==5||!['propose','review'].includes(args[0])||args[1]!=='--root'||args[3]!=='--output')fail('usage: propose|review --root PHYSICAL_SOURCE_ROOT --output OUTSIDE_PACKET_DIRECTORY');
 const operation=args[0]==='propose'?proposeSourceBackedCoreSequencePackets:reviewSourceBackedCoreSequencePackets;
 console.log(json(operation({root:args[2],output:args[4]})).trimEnd());
}
