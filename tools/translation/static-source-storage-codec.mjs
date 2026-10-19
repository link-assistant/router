// Storage fidelity only. Reconstructed data still enters every original source/CST guard.
import {createHash} from 'node:crypto';
import {assertJsonSyntax} from './canonical-json-text.mjs';
const MAX=256*1024**2,MAX_SOURCE=64*1024**2,MAX_FILE=8*1024**2,MAX_NODES=200000,MAX_CANONICAL=33554432,TAG='router-static-cst-varint-columns-v1',SCHEMA='router-static-cst-global-column-table-storage-v1';
class StorageShapeError extends TypeError {}
const assert=(condition,message)=>{if(!condition)throw new StorageShapeError(message);},json=JSON.stringify,hash=b=>createHash('sha256').update(b).digest('hex');
const documentKeys=['schema','representationLevel','language','source','sourceEncoding','status','nodes','diagnostics','authority'];
const safe=n=>Number.isSafeInteger(n)&&!Object.is(n,-0),sameKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
const ROW_TAG='router-lineage-row-v1',LITERAL_TAG='router-storage-literal-v1',SLICE_TAG='router-source-slice-v1';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const SOURCE_DELTA_TAG='router-source-delta-v1',SOURCE_LITERAL_TAG='router-source-literal-v1',MAX_SOURCE_ROWS=4096,MAX_SOURCE_EDGES=16384;
const sourceID=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
const COLUMN_ROW_TAG='router-canonical-column-row-v1',COLUMN_SLICE_TAG='router-canonical-column-slice-v1',COLUMN_LITERAL_TAG='router-canonical-column-literal-v1';
const TABLE_ROW_TAG='router-global-column-row-v1',TABLE_LITERAL_TAG='router-global-column-literal-v1';
function node(row,at,length,bytes){
 assert(Array.isArray(row)&&row.length===7&&typeof row[0]==='string'&&typeof row[1]==='string','complete7-field node required');
 for(let k=2;k<7;k++)assert(safe(row[k]),'exact safe integer coordinate required');
 assert(row[2]>=0&&row[2]<=row[3]&&row[3]<=length&&row[4]>=0&&row[4]<=row[5]&&row[5]<=bytes,'source extent required');
 assert(at===0?row[6]===-1:row[6]>=0&&row[6]<at,'actual earlier parent required');
}

function putVarint(bytes,position,value){
 assert(safe(value)&&value>=0,'bounded unsigned varint required');
 do{assert(position<bytes.length,'varint capacity bound');const next=value%128;value=Math.floor(value/128);bytes[position++]=next+(value?128:0);}while(value);
 return position;
}

function varints(bytes){
 let position=0;
 return {read(){
  let value=0,multiplier=1,count=0;
  while(true){
   assert(position<bytes.length&&count<8,'truncated or oversized varint');const byte=bytes[position++],payload=byte%128;
   assert(payload<=Math.floor((Number.MAX_SAFE_INTEGER-value)/multiplier),'varint integer overflow');value+=payload*multiplier;count++;
   if(byte<128){assert(count===1||payload!==0,'nonshortest varint');assert(safe(value),'safe decoded varint');return value;}
   assert(count<8,'varint byte bound');multiplier*=128;
  }
 },end(){assert(position===bytes.length,'trailing varint payload');}};
}

function columnVarints(columns,count){
 assert(safe(count)&&count>0&&count<=MAX_NODES&&Array.isArray(columns)&&columns.length===6,'exact bounded six-column array');
 const reads=[];let total=0;
 for(const column of columns){
  assert(typeof column==='string'&&column.length<=4*Math.ceil(count*8/3),'individual encoded column bound');
  const bytes=Buffer.from(column,'base64');assert(bytes.toString('base64')===column&&bytes.length<=count*8,'individual canonical base64 required');
  total+=bytes.length;assert(total<=count*6*8,'complete six-column binary bound');reads.push(varints(bytes));
 }
 return reads;
}

function encode(row){
 const original=row.canonical;assert(typeof original==='string'&&original.length<=MAX_CANONICAL,'bounded complete canonical string required');
 const doc=JSON.parse(original);assert(sameKeys(doc,documentKeys)&&json(doc)===original&&doc.source===row.source,'exact canonical text/source required');
 assert(Array.isArray(doc.nodes)&&doc.nodes.length>0&&doc.nodes.length<=MAX_NODES,'bounded complete nodes required');
 const byteLength=Buffer.byteLength(row.source),dictionary=[],ids=new Map(),streams=Array.from({length:6},()=>Buffer.allocUnsafe(doc.nodes.length*8)),positions=[0,0,0,0,0,0];let s16=0,s8=0;
 for(let at=0;at<doc.nodes.length;at++){
  const n=doc.nodes[at];node(n,at,row.source.length,byteLength);assert(n[2]>=s16&&n[4]>=s8,'ordered starts required');
  const pair=[n[0],n[1]],key=json(pair);let id=ids.get(key);if(id===undefined){id=dictionary.length;ids.set(key,id);dictionary.push(pair);}
  const d16=n[2]-s16,len16=n[3]-n[2],extraStart=n[4]-s8-d16,extraLength=n[5]-n[4]-len16,parentDistance=at-n[6];
  assert(extraStart>=0&&extraLength>=0&&parentDistance>0,'nonnegative UTF8 excess and earlier parent required');
  const values=[id,d16,len16,extraStart,extraLength,parentDistance];for(let column=0;column<6;column++)positions[column]=putVarint(streams[column],positions[column],values[column]);
  s16=n[2];s8=n[4];
 }
 const header={...doc,source:null,nodes:null},encoded=json([TAG,header,dictionary,doc.nodes.length,streams.map((bytes,column)=>bytes.subarray(0,positions[column]).toString('base64')),hash(original)]);
 assert(encoded.length<=MAX_CANONICAL,'encoded canonical text bound');return encoded;
}

function decode(row){
 const encoded=row.canonical;assert(typeof encoded==='string'&&encoded.length<=MAX_CANONICAL,'bounded encoded canonical required');
 const value=JSON.parse(encoded);assert(Array.isArray(value)&&value.length===6&&value[0]===TAG&&json(value)===encoded,'exact tagged transport JSON required');
 const [,header,dictionary,count,columns,digest]=value;assert(sameKeys(header,documentKeys)&&header.source===null&&header.nodes===null&&typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),'exact complete header/reference required');
 assert(safe(count)&&count>0&&count<=MAX_NODES&&Array.isArray(dictionary)&&dictionary.length>0&&dictionary.length<=count,'node/dictionary census bound');
 const pairs=new Set();for(const pair of dictionary){assert(Array.isArray(pair)&&pair.length===2&&pair.every(x=>typeof x==='string'&&x.length<=40),'exact bounded dictionary pair');const key=json(pair);assert(!pairs.has(key),'duplicate dictionary pair');pairs.add(key);}
 const reads=columnVarints(columns,count),nodes=[],bytes=Buffer.byteLength(row.source);let s16=0,s8=0,nextID=0;
 for(let at=0;at<count;at++){
  const id=reads[0].read(),d16=reads[1].read(),len16=reads[2].read(),extraStart=reads[3].read(),extraLength=reads[4].read(),distance=reads[5].read();
  assert(id<dictionary.length&&id<=nextID&&distance>0,'actual dictionary/parent reference');if(id===nextID)nextID++;
  const pair=dictionary[id],start16=s16+d16,start8=s8+d16+extraStart,n=[pair[0],pair[1],start16,start16+len16,start8,start8+len16+extraLength,at-distance];
  node(n,at,row.source.length,bytes);nodes.push(n);s16=n[2];s8=n[4];
 }
 for(const read of reads)read.end();assert(nextID===dictionary.length,'all first-seen dictionary entries consumed');
 assert(json(nodes[0])===json(['root','file',0,row.source.length,0,bytes,-1]),'exact root required');
 const canonical=json({...header,source:row.source,nodes});assert(canonical.length<=MAX_CANONICAL&&hash(canonical)===digest,'full reconstructed canonical SHA required');return canonical;
}

// Current data decoder; the unchanged measured kernel above remains an oracle.
function decodeCanonicalText(row){
 const encoded=row.canonical;assert(typeof encoded==='string'&&encoded.length<=MAX_CANONICAL,'bounded encoded canonical required');
 const value=JSON.parse(encoded);assert(Array.isArray(value)&&value.length===6&&value[0]===TAG&&json(value)===encoded,'exact tagged transport JSON required');
 const [,header,dictionary,count,columns,digest]=value;assert(sameKeys(header,documentKeys)&&header.source===null&&header.nodes===null&&typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),'exact complete header/reference required');
 assert(safe(count)&&count>0&&count<=MAX_NODES&&Array.isArray(dictionary)&&dictionary.length>0&&dictionary.length<=count,'node/dictionary census bound');
 const pairs=new Set();for(const pair of dictionary){assert(Array.isArray(pair)&&pair.length===2&&pair.every(x=>typeof x==='string'&&x.length<=40),'exact bounded dictionary pair');const key=json(pair);assert(!pairs.has(key),'duplicate dictionary pair');pairs.add(key);}
 const reads=columnVarints(columns,count),nodeParts=[],bytes=Buffer.byteLength(row.source);let s16=0,s8=0,nextID=0,firstNode=null,pending='[';
 const flush=()=>{
  // JSON string literals contain escaped lone surrogates. Verify the complete
  // UTF-16 inverse before retaining a flat chunk rather than a long string rope.
  const flat=Buffer.from(pending,'utf8').toString('utf8');assert(flat===pending,'complete literal node chunk differs');nodeParts.push(flat);pending='';
 };
 const emit=text=>{if(pending.length+text.length>65536)flush();pending+=text;};
 for(let at=0;at<count;at++){
  const id=reads[0].read(),d16=reads[1].read(),len16=reads[2].read(),extraStart=reads[3].read(),extraLength=reads[4].read(),distance=reads[5].read();
  assert(id<dictionary.length&&id<=nextID&&distance>0,'actual dictionary/parent reference');if(id===nextID)nextID++;
  const pair=dictionary[id],start16=s16+d16,start8=s8+d16+extraStart,n=[pair[0],pair[1],start16,start16+len16,start8,start8+len16+extraLength,at-distance];
  node(n,at,row.source.length,bytes);if(at===0)firstNode=n;else emit(',');emit(json(n));s16=n[2];s8=n[4];
 }
 for(const read of reads)read.end();assert(nextID===dictionary.length,'all first-seen dictionary entries consumed');
 assert(json(firstNode)===json(['root','file',0,row.source.length,0,bytes,-1]),'exact root required');
 emit(']');flush();
 // Emit every validated node in order without retaining a second full forest.
 // Header property order matches the original spread-and-overwrite serializer.
 const parts=['{'];let first=true;
 for(const [key,value]of Object.entries(header)){
  if(!first)parts.push(',');first=false;parts.push(json(key),':');
  if(key==='nodes')for(const part of nodeParts)parts.push(part);
  else parts.push(json(key==='source'?row.source:value));
 }
 parts.push('}');const canonical=parts.join('');assert(canonical.length<=MAX_CANONICAL&&hash(canonical)===digest,'full reconstructed canonical SHA required');return canonical;
}

function sliceDescriptor(row,side,field,sources){
 const before=side==='edit'&&field==='expected'||side==='inverse'&&field==='replacement',id=(before?row.before:row.after)?.sourceId,span=(before?row.edit:row.inverse)?.span;
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||!Object.hasOwn(sources,id)||!Array.isArray(span)||span.length!==2||!span.every(safe)||span[0]<0||span[1]<span[0])return null;
 const source=sources[id];if(!record(source)||typeof source.source!=='string'||span[1]>source.source.length||hash(source.source)!==id)return null;
 return [SLICE_TAG,id,span[0],span[1]];
}

function encodeLineageRow(row,sources,stats){
 if(!record(row))return [LITERAL_TAG,row];
 const encoded={...row};if(stats)stats.rows++;
 for(const side of ['edit','inverse']){
  if(!record(row[side]))continue;const part={...row[side]};
  for(const field of ['expected','replacement']){
   if(!Object.hasOwn(part,field))continue;const value=part[field],ref=sliceDescriptor(row,side,field,sources);
   if(ref&&typeof value==='string'&&sources[ref[1]].source.slice(ref[2],ref[3])===value){part[field]=ref;if(stats){stats.references++;stats.referencedUtf16Units+=value.length;}}
   else{part[field]=[LITERAL_TAG,value];if(stats)stats.literals++;}
  }encoded[side]=part;
 }return [ROW_TAG,encoded];
}

function decodeLineageRow(value,sources){
 assert(Array.isArray(value)&&value.length===2,'exact lineage storage wrapper');
 if(value[0]===LITERAL_TAG)return value[1];
 assert(value[0]===ROW_TAG&&record(value[1]),'recognized lineage row wrapper');const row=value[1],decoded={...row};
 for(const side of ['edit','inverse']){
  if(!record(row[side]))continue;const part={...row[side]};
  for(const field of ['expected','replacement']){
   if(!Object.hasOwn(part,field))continue;const value=part[field];assert(Array.isArray(value),'typed lineage value required');
   if(value.length===2&&value[0]===LITERAL_TAG){part[field]=value[1];continue;}
   const ref=sliceDescriptor(row,side,field,sources);assert(value.length===4&&ref!==null&&json(value)===json(ref),'exact current sourceID/span/role join');
   part[field]=sources[ref[1]].source.slice(ref[2],ref[3]);
  }decoded[side]=part;
 }return decoded;
}

function encodeLineage(lineage,sources,stats){
 assert(Array.isArray(lineage),'complete lineage array required');return lineage.map(stage=>{assert(record(stage)&&Array.isArray(stage.files),'complete lineage stage required');return {...stage,files:stage.files.map(row=>encodeLineageRow(row,sources,stats))};});
}

function sourcePairRow(value,stored){
 if(!stored)return record(value)?value:null;
 return Array.isArray(value)&&value.length===2&&value[0]===ROW_TAG&&record(value[1])?value[1]:null;
}

function sourcePairMetadata(row,sources){
 if(!record(row)||row.status!=='changed'||typeof row.path!=='string'||!row.path.length||row.path.length>4096||row.path.startsWith('/')||row.path.includes('\\')||row.path.includes(':')||row.path.includes('\0')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||!record(row.before)||!record(row.after))return false;
 for(const end of [row.before,row.after]){
  if(end.path!==row.path||!sourceID(end.sourceId)||!Object.hasOwn(sources,end.sourceId))return false;
  const actual=sources[end.sourceId];if(!record(actual)||!safe(end.bytes)||end.bytes<0||end.bytes>MAX_FILE||actual.bytes!==end.bytes||typeof end.gitBlob!=='string'||!/^[a-f0-9]{40}$/.test(end.gitBlob)||actual.gitBlob!==end.gitBlob)return false;
 }
 return row.before.sourceId!==row.after.sourceId;
}

function sourceEdges(sources,lineage,stored=false){
 const ids=Object.keys(sources);assert(ids.length<=MAX_SOURCE_ROWS&&Array.isArray(lineage),'bounded source/lineage census');
 const positions=new Map(ids.map((id,at)=>[id,at])),edges=new Map(),seen=new Map();let rows=0;
 for(const stage of lineage){assert(record(stage)&&Array.isArray(stage.files),'complete source-edge stage');for(const value of stage.files){
  assert(++rows<=MAX_SOURCE_EDGES,'source-edge work bound');const row=sourcePairRow(value,stored);if(!sourcePairMetadata(row,sources))continue;
  const a=row.before.sourceId,b=row.after.sourceId,parent=positions.get(a)<positions.get(b)?a:b,target=parent===a?b:a,key=target+':'+parent;
  if(!edges.has(target))edges.set(target,[]);
  // Duplicate lineage witnesses do not add content candidates. Retain every
  // witness so invalid payloads cannot manufacture the chosen source relation.
  let edge=seen.get(key);if(!edge){edge={parent,target,witnesses:[]};edges.get(target).push(edge);seen.set(key,edge);}edge.witnesses.push(value);
 }}
 for(const values of edges.values())values.sort((a,b)=>positions.get(a.parent)-positions.get(b.parent)||(a.parent<b.parent?-1:a.parent>b.parent?1:0));
 return {ids,positions,edges,rows,candidates:seen.size};
}

function validSource(id,row){return sourceID(id)&&record(row)&&typeof row.source==='string'&&safe(row.bytes)&&row.bytes>=0&&row.bytes<=MAX_FILE&&Buffer.byteLength(row.source)===row.bytes&&hash(row.source)===id;}

function fullSourceEdge(row,sources){
 if(!sourcePairMetadata(row,sources)||!validSource(row.before.sourceId,sources[row.before.sourceId])||!validSource(row.after.sourceId,sources[row.after.sourceId])||!record(row.edit)||!record(row.inverse))return false;
 const before=sources[row.before.sourceId].source,after=sources[row.after.sourceId].source;
 for(const [part,source]of [[row.edit,before],[row.inverse,after]])if(!Array.isArray(part.span)||part.span.length!==2||!part.span.every(safe)||part.span[0]<0||part.span[1]<part.span[0]||part.span[1]>source.length||typeof part.expected!=='string'||typeof part.replacement!=='string'||source.slice(...part.span)!==part.expected)return false;
 return before.slice(0,row.edit.span[0])+row.edit.replacement+before.slice(row.edit.span[1])===after&&after.slice(0,row.inverse.span[0])+row.inverse.replacement+after.slice(row.inverse.span[1])===before;
}

function commonSourceEdges(parent,source){
 let prefix=0,suffix=0;while(prefix<parent.length&&prefix<source.length&&parent[prefix]===source[prefix])prefix++;
 while(suffix<parent.length-prefix&&suffix<source.length-prefix&&parent[parent.length-1-suffix]===source[source.length-1-suffix])suffix++;
 return {prefix,suffix,middle:source.slice(prefix,source.length-suffix)};
}

function sourceTuple(parentID,parent,source){const value=commonSourceEdges(parent,source);return [SOURCE_DELTA_TAG,parentID,value.prefix,value.suffix,value.middle];}

function encodeSourceStrings(sources,lineage,statistics=null){
 const graph=sourceEdges(sources,lineage),rows=[];
 if(statistics){statistics.rows=graph.ids.length;statistics.lineageRows=graph.rows;statistics.edgeCandidates=graph.candidates;statistics.candidateComparisons=0;statistics.references=0;statistics.literalStrings=0;statistics.literalValues=0;statistics.savedJsonUtf8Bytes=0;}
 for(const id of graph.ids){const row=sources[id];if(!record(row)||!Object.hasOwn(row,'source')){rows.push([id,row]);continue;}
  const source=row.source;if(typeof source!=='string'){rows.push([id,{...row,source:[SOURCE_LITERAL_TAG,source]}]);if(statistics)statistics.literalValues++;continue;}
  let selected=null,selectedBytes=Buffer.byteLength(json(source));const literalBytes=selectedBytes;
  if(validSource(id,row))for(const edge of graph.edges.get(id)??[]){
   if(statistics)statistics.candidateComparisons++;if(!edge.witnesses.some(value=>fullSourceEdge(value,sources)))continue;
   const tuple=sourceTuple(edge.parent,sources[edge.parent].source,source),bytes=Buffer.byteLength(json(tuple));
   // Ascending original parent index is the deterministic equal-size tie break.
   if(bytes<selectedBytes){selected=tuple;selectedBytes=bytes;}
  }
  rows.push([id,selected===null?row:{...row,source:selected}]);if(statistics){if(selected===null)statistics.literalStrings++;else{statistics.references++;statistics.savedJsonUtf8Bytes+=literalBytes-selectedBytes;}}
 }
 return Object.fromEntries(rows);
}

function decodeSourceStrings(sources,lineage,statistics=null){
 const graph=sourceEdges(sources,lineage,true),restored={},selected=[];let bytes=0;const depths=new Map();
 for(const id of graph.ids){const row=sources[id];if(!record(row)||!Object.hasOwn(row,'source')){Object.defineProperty(restored,id,{value:row,enumerable:true});continue;}
  const value=row.source;let source=value,depth=0;
  if(typeof value!=='string'){
   assert(Array.isArray(value),'typed stored source value required');
   if(value.length===2&&value[0]===SOURCE_LITERAL_TAG)source=value[1];
   else{
    assert(value.length===5&&value[0]===SOURCE_DELTA_TAG&&sourceID(value[1])&&safe(value[2])&&safe(value[3])&&value[2]>=0&&value[3]>=0&&typeof value[4]==='string','exact source delta tuple required');
    const [,parentID,prefix,suffix,middle]=value,position=graph.positions.get(parentID),parent=restored[parentID];
    assert(position!==undefined&&position<graph.positions.get(id)&&Object.hasOwn(restored,parentID)&&validSource(parentID,parent),'actual earlier complete source parent required');
    assert(prefix+suffix<=parent.source.length&&prefix+suffix+middle.length<=MAX_FILE,'source delta extent bound');
    const edge=(graph.edges.get(id)??[]).find(edge=>edge.parent===parentID);assert(edge,'actual same-path lineage source relation required');
    source=parent.source.slice(0,prefix)+middle+parent.source.slice(parent.source.length-suffix);
    assert(validSource(id,{...row,source}),'complete reconstructed source SHA/length required');
    assert(json(sourceTuple(parentID,parent.source,source))===json(value),'maximal nonoverlapping source edges required');
    assert(Buffer.byteLength(json(value))<Buffer.byteLength(json(source)),'source delta must be strictly smaller than literal');
    depth=(depths.get(parentID)??0)+1;assert(depth<MAX_SOURCE_ROWS,'acyclic source depth bound');selected.push(edge);
   }
  }
  if(typeof source==='string'){bytes+=Buffer.byteLength(source);assert(bytes<=MAX_SOURCE,'complete decoded source byte bound');}
  depths.set(id,depth);Object.defineProperty(restored,id,{value:source===value?row:{...row,source},enumerable:true});
 }
 // Resolve the old lineage slice wrappers ONLY after every full source is
 // restored. A forged path/metadata/payload never supplies a storage edge.
 for(const edge of selected)assert(edge.witnesses.some(value=>fullSourceEdge(decodeLineageRow(value,restored),restored)),'complete selected lineage edge payload required');
 if(statistics){statistics.decodedReferences=selected.length;statistics.maximumReferenceDepth=Math.max(0,...depths.values());statistics.decodedSourceBytes=bytes;}
 return restored;
}

function columnDocument(text){
 if(typeof text!=='string'||text.length>MAX_CANONICAL)return null;
 let value;try{value=JSON.parse(text);}catch{return null;}
 if(!Array.isArray(value)||value.length!==6||value[0]!==TAG||json(value)!==text)return null;
 const [,header,dictionary,count,columns,digest]=value;
 if(!sameKeys(header,documentKeys)||header.source!==null||header.nodes!==null||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest)||!safe(count)||count<=0||count>MAX_NODES||!Array.isArray(dictionary)||dictionary.length===0||dictionary.length>count)return null;
 const pairs=new Set();for(const pair of dictionary){if(!Array.isArray(pair)||pair.length!==2||!pair.every(part=>typeof part==='string'&&part.length<=40))return null;const key=json(pair);if(pairs.has(key))return null;pairs.add(key);}
 try{const reads=columnVarints(columns,count);for(let at=0;at<count;at++)for(const read of reads)read.read();for(const read of reads)read.end();}catch{return null;}
 return value;
}

function chooseColumnParent(id,graph,sources,canonicalSources,stored){
 if(!validSource(id,sources[id]))return null;
 for(const edge of graph.edges.get(id)??[]){
  if(graph.positions.get(edge.parent)>=graph.positions.get(id)||!Object.hasOwn(canonicalSources,edge.parent)||!validSource(edge.parent,sources[edge.parent]))continue;
  const parent=canonicalSources[edge.parent],document=record(parent)&&Object.hasOwn(parent,'canonical')?columnDocument(parent.canonical):null;if(!document)continue;
  if(!edge.witnesses.some(value=>fullSourceEdge(stored?decodeLineageRow(value,sources):value,sources)))continue;
  return {edge,document};
 }return null;
}

function columnSliceTuple(parent,text){const {prefix,suffix,middle}=commonSourceEdges(parent,text);return [COLUMN_SLICE_TAG,prefix,suffix,middle];}

function encodeCanonicalColumns(storedSources,sources,lineage,statistics=null){
 const graph=sourceEdges(sources,lineage),rows=[],depths=new Map();assert(json(Object.keys(storedSources))===json(graph.ids),'same complete source order for column storage');
 if(statistics){statistics.rows=graph.ids.length;statistics.canonicalRows=0;statistics.lineageRows=graph.rows;statistics.edgeCandidates=graph.candidates;statistics.selectedParents=0;statistics.deltaColumns=0;statistics.literalColumns=0;statistics.literalValues=0;statistics.savedJsonUtf8Bytes=0;statistics.maximumReferenceDepth=0;}
 for(const id of graph.ids){
  const row=storedSources[id];if(!record(row)||!Object.hasOwn(row,'canonical')){rows.push([id,row]);depths.set(id,0);continue;}
  const text=row.canonical;if(typeof text!=='string'){rows.push([id,{...row,canonical:[COLUMN_LITERAL_TAG,text]}]);depths.set(id,0);if(statistics)statistics.literalValues++;continue;}
  const document=columnDocument(text);if(statistics)statistics.canonicalRows++;
  const selected=document?chooseColumnParent(id,graph,sources,sources,false):null;let canonical=text,deltas=0,depth=0;
  if(selected){
   const columns=document[4].map((column,at)=>{const tuple=columnSliceTuple(selected.document[4][at],column);if(Buffer.byteLength(json(tuple))<Buffer.byteLength(json(column))){deltas++;return tuple;}return column;}),candidate=[COLUMN_ROW_TAG,selected.edge.parent,[...document.slice(0,4),columns,document[5]]];
   if(deltas&&Buffer.byteLength(json(candidate))<Buffer.byteLength(json(text))){canonical=candidate;depth=(depths.get(selected.edge.parent)??0)+1;assert(depth<MAX_SOURCE_ROWS,'acyclic encoded column depth bound');if(statistics){statistics.selectedParents++;statistics.deltaColumns+=deltas;statistics.savedJsonUtf8Bytes+=Buffer.byteLength(json(text))-Buffer.byteLength(json(candidate));}}
   else deltas=0;
  }
  if(statistics){statistics.literalColumns+=6-deltas;statistics.maximumReferenceDepth=Math.max(statistics.maximumReferenceDepth,depth);}
  depths.set(id,depth);rows.push([id,canonical===text?row:{...row,canonical}]);
 }return Object.fromEntries(rows);
}

function decodeCanonicalColumns(sources,lineage,statistics=null){
 const graph=sourceEdges(sources,lineage,true),restored={},depths=new Map();let references=0,columnsRestored=0,reconstructedColumnUnits=0,maxDepth=0;
 for(const id of graph.ids){
  const row=sources[id];if(!record(row)||!Object.hasOwn(row,'canonical')){Object.defineProperty(restored,id,{value:row,enumerable:true});depths.set(id,0);continue;}
  const value=row.canonical;let canonical=value,depth=0;
  if(typeof value!=='string'){
   assert(Array.isArray(value),'typed canonical storage value required');
   if(value.length===2&&value[0]===COLUMN_LITERAL_TAG)canonical=value[1];
   else{
    assert(value.length===3&&value[0]===COLUMN_ROW_TAG&&sourceID(value[1])&&Array.isArray(value[2])&&value[2].length===6,'exact canonical column row wrapper required');
    const selected=chooseColumnParent(id,graph,sources,restored,true);assert(selected&&selected.edge.parent===value[1],'first genuine earlier same-path canonical parent required');
    const document=value[2],count=document[3],columns=document[4];assert(document[0]===TAG&&safe(count)&&count>0&&count<=MAX_NODES&&Array.isArray(columns)&&columns.length===6,'complete original six-column header required');
    let deltas=0;const decoded=columns.map((column,at)=>{
     if(typeof column==='string')return column;
     assert(Array.isArray(column)&&column.length===4&&column[0]===COLUMN_SLICE_TAG&&safe(column[1])&&safe(column[2])&&column[1]>=0&&column[2]>=0&&typeof column[3]==='string','exact canonical column slice tuple required');
     const [,prefix,suffix,middle]=column,parent=selected.document[4][at],limit=4*Math.ceil(count*8/3);
     assert(prefix<=parent.length&&suffix<=parent.length-prefix&&middle.length<=limit&&prefix+suffix<=limit-middle.length,'canonical column extent bound');
     const text=parent.slice(0,prefix)+middle+parent.slice(parent.length-suffix);
     assert(json(columnSliceTuple(parent,text))===json(column),'maximal nonoverlapping canonical column edges required');
     assert(Buffer.byteLength(json(column))<Buffer.byteLength(json(text)),'canonical column delta must be strictly smaller than literal');deltas++;return text;
    });
    canonical=json([...document.slice(0,4),decoded,document[5]]);assert(deltas>0&&columnDocument(canonical)!==null,'all restored canonical columns require original base64 bounds and exact six-cursor EOF');
    assert(Buffer.byteLength(json(value))<Buffer.byteLength(json(canonical)),'canonical column row must be strictly smaller than literal');
    depth=(depths.get(value[1])??0)+1;assert(depth<MAX_SOURCE_ROWS,'acyclic decoded column depth bound');references++;columnsRestored+=deltas;for(const column of decoded)reconstructedColumnUnits+=column.length;
   }
  }
  depths.set(id,depth);maxDepth=Math.max(maxDepth,depth);Object.defineProperty(restored,id,{value:canonical===value?row:{...row,canonical},enumerable:true});
 }
 if(statistics){statistics.decodedReferences=references;statistics.decodedDeltaColumns=columnsRestored;statistics.reconstructedColumnUtf16Units=reconstructedColumnUnits;statistics.decodedMaximumReferenceDepth=maxDepth;}
 return restored;
}

function tableColumnShape(value){
 let mode,document;
 if(typeof value==='string'){document=columnDocument(value);if(!document)return null;mode=0;}
 else{
  if(!Array.isArray(value)||value.length!==3||value[0]!==COLUMN_ROW_TAG||!sourceID(value[1])||!Array.isArray(value[2])||value[2].length!==6)return null;
  mode=1;document=value[2];const [,header,dictionary,count,columns,digest]=document;
  if(document[0]!==TAG||!sameKeys(header,documentKeys)||header.source!==null||header.nodes!==null||!safe(count)||count<=0||count>MAX_NODES||!Array.isArray(dictionary)||!dictionary.length||dictionary.length>count||!Array.isArray(columns)||columns.length!==6||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return null;
  const pairs=new Set();for(const pair of dictionary){if(!Array.isArray(pair)||pair.length!==2||!pair.every(part=>typeof part==='string'&&part.length<=40))return null;const key=json(pair);if(pairs.has(key))return null;pairs.add(key);}
  for(const column of columns){
   if(typeof column==='string'){
    if(column.length>4*Math.ceil(count*8/3))return null;const bytes=Buffer.from(column,'base64');if(bytes.toString('base64')!==column||bytes.length>count*8)return null;
    try{const read=varints(bytes);for(let at=0;at<count;at++)read.read();read.end();}catch{return null;}
   }else if(!Array.isArray(column)||column.length!==4||column[0]!==COLUMN_SLICE_TAG||!safe(column[1])||!safe(column[2])||column[1]<0||column[2]<0||typeof column[3]!=='string')return null;
  }
 }return {mode,document};
}

function encodeColumnTables(sources,statistics=null){
 const ids=Object.keys(sources);assert(ids.length<=MAX_SOURCE_ROWS&&ids.every(sourceID),'bounded original source-ID order required');
 const ordered=[...ids].sort((left,right)=>left<right?-1:left>right?1:0),tables=Array.from({length:6},()=>[]),stored=new Map();let canonicalRows=0,encodedRows=0,references=0,deltas=0,allDeltaRows=0,literals=0,textBytes=0;
 for(const id of ordered){
  const row=sources[id];if(!record(row)||!Object.hasOwn(row,'canonical')){stored.set(id,row);continue;}canonicalRows++;
  const original=row.canonical,shape=tableColumnShape(original);if(!shape){stored.set(id,{...row,canonical:[TABLE_LITERAL_TAG,original]});literals++;continue;}
  let inRow=0;const columns=shape.document[4].map((column,at)=>{
   if(typeof column!=='string'){deltas++;return column;}
   const index=tables[at].length;assert(index<MAX_SOURCE_ROWS,'existing per-column source-row bound');tables[at].push(column);textBytes+=Buffer.byteLength(column);assert(textBytes<=MAX,'complete literal-column UTF8 text bound');references++;inRow++;return index;
  });
  if(!inRow){assert(shape.mode===1,'only an original V7 all-delta row has no literal');stored.set(id,row);allDeltaRows++;continue;}
  const document=[...shape.document.slice(0,4),columns,shape.document[5]],value=shape.mode===0?document:[...original.slice(0,2),document];stored.set(id,{...row,canonical:[TABLE_ROW_TAG,shape.mode,value]});encodedRows++;
 }
 if(statistics)Object.assign(statistics,{sourceRows:ids.length,canonicalRows,encodedRows,referenceColumns:references,unchangedV7DeltaColumns:deltas,allDeltaRows,literalValues:literals,literalTextUtf8Bytes:textBytes,tableEntries:tables.map(table=>table.length)});
 return {sources:Object.fromEntries(ids.map(id=>[id,stored.get(id)])),columnTables:tables};
}

function decodeColumnTables(sources,columnTables,statistics=null){
 const dense=value=>Array.isArray(value)&&Object.keys(value).length===value.length&&Object.keys(value).every((key,at)=>key===String(at));
 assert(dense(columnTables)&&columnTables.length===6,'exact six dense global column tables required');let textBytes=0,entries=0;
 for(const table of columnTables){assert(dense(table)&&table.length<=MAX_SOURCE_ROWS,'dense table within original source-row bound required');entries+=table.length;assert(entries<=MAX_SOURCE_ROWS*6,'complete six-table entry bound');for(const text of table){assert(typeof text==='string'&&text.length<=4*Math.ceil(MAX_NODES*8/3),'bounded primitive literal table text required');textBytes+=Buffer.byteLength(text);assert(textBytes<=MAX,'complete restored literal text UTF8 bound');}}
 const ids=Object.keys(sources);assert(ids.length<=MAX_SOURCE_ROWS&&ids.every(sourceID),'bounded original source IDs required');const ordered=[...ids].sort((left,right)=>left<right?-1:left>right?1:0),next=Array(6).fill(0),stored=new Map();let decodedRows=0,references=0,allDeltaRows=0,literalValues=0;
 for(const id of ordered){
  const row=sources[id];if(!record(row)||!Object.hasOwn(row,'canonical')){stored.set(id,row);continue;}
  const original=row.canonical;let canonical;
  if(Array.isArray(original)&&original[0]===TABLE_LITERAL_TAG){assert(original.length===2,'exact global literal wrapper');canonical=original[1];literalValues++;}
  else if(Array.isArray(original)&&original[0]===TABLE_ROW_TAG){
   assert(dense(original)&&original.length===3&&safe(original[1])&&(original[1]===0||original[1]===1),'exact table row mode/arity required');const mode=original[1],value=original[2],document=mode===0?value:dense(value)&&value.length===3&&value[0]===COLUMN_ROW_TAG&&sourceID(value[1])?value[2]:null;
   assert(dense(document)&&document.length===6&&document[0]===TAG&&safe(document[3])&&document[3]>0&&document[3]<=MAX_NODES&&dense(document[4])&&document[4].length===6,'complete bounded table-backed six-column document required');const count=document[3],limit=4*Math.ceil(count*8/3);let inRow=0;
   const columns=document[4].map((column,at)=>{
    if(Array.isArray(column)){assert(mode===1&&column.length===4&&column[0]===COLUMN_SLICE_TAG&&safe(column[1])&&safe(column[2])&&column[1]>=0&&column[2]>=0&&typeof column[3]==='string','only an exact original V7 column slice may remain');return column;}
    assert(safe(column)&&column>=0&&column===next[at]&&column<columnTables[at].length,'canonical contiguous one-use column index required');const text=columnTables[at][column];assert(text.length<=limit,'source-count-specific base64 text bound');const bytes=Buffer.from(text,'base64');assert(bytes.toString('base64')===text&&bytes.length<=count*8,'complete original canonical base64/byte bound');next[at]++;references++;inRow++;return text;
   });
   assert(inRow>0,'all-delta V7 rows must remain unchanged');const restoredDocument=[...document.slice(0,4),columns,document[5]];canonical=mode===0?json(restoredDocument):[...value.slice(0,2),restoredDocument];assert(tableColumnShape(canonical)!==null,'restored full V7 shape/count/varint EOF required');decodedRows++;
  }else{
   const shape=tableColumnShape(original);assert(shape?.mode===1&&shape.document[4].every(column=>Array.isArray(column)),'unknown/unmoved canonical storage value');canonical=original;allDeltaRows++;
  }
  stored.set(id,canonical===original?row:{...row,canonical});
 }
 assert(next.every((count,at)=>count===columnTables[at].length)&&references===entries,'every global table cell used exactly once, no gap/extra/dangling entry');
 if(statistics)Object.assign(statistics,{decodedRows,decodedReferenceColumns:references,decodedAllDeltaRows:allDeltaRows,decodedLiteralValues:literalValues,decodedLiteralTextUtf8Bytes:textBytes,tableEntriesConsumed:next});
 return Object.fromEntries(ids.map(id=>[id,stored.get(id)]));
}

// The measured lineage emitter closes over this fixed sink, never a caller hook.
// Hash every complete logical byte without retaining a second whole JSON buffer.
function logicalDigest(payload,sources,expected=null){
 let at=0;const digest=createHash('sha256');
 function emit(text){const bytes=Buffer.from(text);assert(at+bytes.length<=MAX,'logical output byte bound');if(expected!==null&&!(at+bytes.length<=expected.length&&expected.subarray(at,at+bytes.length).equals(bytes)))throw new TypeError('complete original logical payload byte mismatch');digest.update(bytes);at+=bytes.length;}
function emitLineage(lineage,sources){
 assert(Array.isArray(lineage),'complete stored lineage');emit('[');let firstStage=true;
 for(const stage of lineage){assert(record(stage)&&Array.isArray(stage.files),'complete stored stage');if(!firstStage)emit(',');firstStage=false;emit('{');let firstField=true;
  for(const [key,value]of Object.entries(stage)){if(!firstField)emit(',');firstField=false;emit(json(key)+':');if(key!=='files'){emit(json(value));continue;}emit('[');let firstRow=true;
   for(const row of value){if(!firstRow)emit(',');firstRow=false;emit(json(decodeLineageRow(row,sources)));}emit(']');
  }emit('}');
 }emit(']');
}
 emit('{');let first=true;
 for(const [key,value]of Object.entries(payload)){
  if(!first)emit(',');first=false;emit(json(key)+':');
  if(key==='lineage'){emitLineage(value,sources);continue;}
  if(key!=='sources'){emit(json(value));continue;}
  emit('{');let firstRow=true;for(const [id,row]of Object.entries(sources)){if(!firstRow)emit(',');firstRow=false;emit(json(id)+':');emit(json(row));}emit('}');
 }emit('}\n');if(expected!==null&&at!==expected.length)throw new TypeError('complete original logical payload length');return {bytes:at,sha256:digest.digest('hex')};
}
const logicalKeys=['schema','cases','profiles','current','lineage','sources','authority','trace'];
const containerKeys=['schema','logicalRawBytes','logicalRawSha256','columnTables','payload'];
const storageKeys=['schema','codec','logicalRawBytes','logicalRawSha256'];
const storageSchema='router-static-source-lifecycle-storage-v1';
// Preserve a transport BOM so native JSON.parse rejects it; source-string BOMs remain data.
const text=bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
function originalShape(bundle){
 assert(sameKeys(bundle,logicalKeys)&&bundle.schema==='router-static-source-lifecycle-v1'&&record(bundle.sources)&&Array.isArray(bundle.lineage),'complete logical bank shape required');
 assert(Object.keys(bundle.sources).length<=MAX_SOURCE_ROWS,'bounded complete source rows');let sourceBytes=0;
 for(const [id,row]of Object.entries(bundle.sources)){
  assert(sourceID(id)&&record(row)&&typeof row.source==='string'&&Buffer.byteLength(row.source)<=MAX_FILE,'bounded source row required');sourceBytes+=Buffer.byteLength(row.source);assert(sourceBytes<=MAX_SOURCE,'source total bound');
  if(Object.hasOwn(row,'canonical')){
   assert(typeof row.canonical==='string'&&row.canonical.length<=MAX_CANONICAL,'bounded original canonical string');
   // Only a local syntax refusal selects legacy encoding. Native/crypto errors escape.
   try{assertJsonSyntax(row.canonical);}catch(error){if(error instanceof SyntaxError)throw new StorageShapeError('Static source storage: original canonical JSON shape');throw error;}
  }
 }
}
/** Lossless storage selection for an owned JSON value and its complete original bytes.
 * The fixed emitter rejoins every byte; unsupported shapes stay legacy.
 * No source/CST authority and no retained state. Arbitrary native errors propagate. */
export function encodeStaticSourceStorage(bundle,raw){
 assert(Buffer.isBuffer(raw)&&raw.length<=MAX,'bounded original raw bytes required');
 try{
  originalShape(bundle);
  const lineage=encodeLineage(bundle.lineage,bundle.sources,null),logical=logicalDigest({...bundle,lineage},bundle.sources,raw),sources={};
  for(const [id,row]of Object.entries(bundle.sources)){
   if(!Object.hasOwn(row,'canonical')){sources[id]=row;continue;}
   const canonical=encode(row);assert(decodeCanonicalText({...row,canonical})===row.canonical,'complete per-row canonical storage inverse');sources[id]={...row,canonical};
  }
  let current=encodeSourceStrings(sources,bundle.lineage);
  current=encodeCanonicalColumns(current,sources,bundle.lineage);
  const tables=encodeColumnTables(current),container={schema:SCHEMA,logicalRawBytes:logical.bytes,logicalRawSha256:logical.sha256,columnTables:tables.columnTables,payload:{...bundle,lineage,sources:tables.sources}},stored=Buffer.from(json(container)+'\n');
  assert(stored.length<=MAX,'complete compact output bound');
  return {raw:stored,storage:{schema:storageSchema,codec:SCHEMA,logicalRawBytes:logical.bytes,logicalRawSha256:logical.sha256}};
 }catch(error){if(error instanceof StorageShapeError)return {raw};throw error;}
}
/** Strict compact decoding. A malformed compact archive NEVER falls back to legacy. */
export function decodeStaticSourceStorage(raw,index){
 assert(Buffer.isBuffer(raw)&&raw.length<=MAX,'bounded stored raw bytes required');
 if(!Object.hasOwn(index,'storage'))return JSON.parse(text(raw));
 const descriptor=index.storage;
 assert(sameKeys(descriptor,storageKeys)&&descriptor.schema===storageSchema&&descriptor.codec===SCHEMA&&safe(descriptor.logicalRawBytes)&&descriptor.logicalRawBytes>=0&&descriptor.logicalRawBytes<=MAX&&sourceID(descriptor.logicalRawSha256),'exact versioned logical storage descriptor');
 const stored=JSON.parse(text(raw));
 assert(sameKeys(stored,containerKeys)&&json(Object.keys(stored))===json(containerKeys)&&stored.schema===SCHEMA&&stored.logicalRawBytes===descriptor.logicalRawBytes&&stored.logicalRawSha256===descriptor.logicalRawSha256,'complete stored/logical container join');
 assert(sameKeys(stored.payload,logicalKeys)&&stored.payload.schema===index.schema&&record(stored.payload.sources)&&Array.isArray(stored.payload.lineage),'complete stored payload');
 let sources=decodeColumnTables(stored.payload.sources,stored.columnTables);
 sources=decodeSourceStrings(sources,stored.payload.lineage);
 sources=decodeCanonicalColumns(sources,stored.payload.lineage);
 sources=Object.fromEntries(Object.entries(sources).map(([id,row])=>[id,record(row)&&Object.hasOwn(row,'canonical')?{...row,canonical:decodeCanonicalText(row)}:row]));
 const logical=logicalDigest(stored.payload,sources);
 assert(logical.bytes===descriptor.logicalRawBytes&&logical.sha256===descriptor.logicalRawSha256,'complete reconstructed logical length/SHA');
 const lineage=stored.payload.lineage.map(stage=>({...stage,files:stage.files.map(row=>decodeLineageRow(row,sources))}));
 return {...stored.payload,lineage,sources};
}

/** Separate source-text TEST DATA projection, not the complete storage decoder.
 * The caller must authenticate the whole stored bytes to its actual Git source.
 * No canonical document, logical-payload digest or compiler proof is validated
 * or returned here. Existing complete encode/decode APIs remain unchanged. */
export function decodeStaticSourceTextData(raw,index){
 assert(Buffer.isBuffer(raw)&&raw.length<=MAX,'bounded stored text-data bytes required');
 let payload,restored;
 if(!Object.hasOwn(index,'storage')){
  payload=JSON.parse(text(raw));
  assert(sameKeys(payload,logicalKeys)&&payload.schema===index.schema&&record(payload.sources)&&Array.isArray(payload.lineage),'complete legacy text-data payload');
  restored=payload.sources;
 }else{
  const descriptor=index.storage;
  assert(sameKeys(descriptor,storageKeys)&&descriptor.schema===storageSchema&&descriptor.codec===SCHEMA&&safe(descriptor.logicalRawBytes)&&descriptor.logicalRawBytes>=0&&descriptor.logicalRawBytes<=MAX&&sourceID(descriptor.logicalRawSha256),'exact text-data storage descriptor');
  const stored=JSON.parse(text(raw));
  assert(sameKeys(stored,containerKeys)&&json(Object.keys(stored))===json(containerKeys)&&stored.schema===SCHEMA&&stored.logicalRawBytes===descriptor.logicalRawBytes&&stored.logicalRawSha256===descriptor.logicalRawSha256,'complete text-data container join');
  payload=stored.payload;
  assert(sameKeys(payload,logicalKeys)&&payload.schema===index.schema&&record(payload.sources)&&Array.isArray(payload.lineage),'complete stored text-data payload');
  // Source deltas depend on complete source/lineage equations, not canonical
  // column tables. Do not materialize or grant authority to unreturned CSTs.
  restored=decodeSourceStrings(payload.sources,payload.lineage);
 }
 const rows=Object.entries(restored);assert(rows.length<=MAX_SOURCE_ROWS,'complete text-data source census bound');let total=0;
 const sources=Object.fromEntries(rows.map(([id,row])=>{
  assert(validSource(id,row)&&Buffer.from(row.source,'utf8').toString('utf8')===row.source&&typeof row.gitBlob==='string'&&/^[a-f0-9]{40}$/.test(row.gitBlob),'complete text-data source UTF8/hash/length required');
  total+=row.bytes;assert(total<=MAX_SOURCE,'complete text-data source byte bound');
  return [id,{source:row.source,bytes:row.bytes,gitBlob:row.gitBlob}];
 }));
 const lineage=payload.lineage.map(stage=>{
  assert(record(stage)&&Array.isArray(stage.files),'complete text-data lineage stage');
  return {...stage,files:stage.files.map(row=>Object.hasOwn(index,'storage')?decodeLineageRow(row,sources):row)};
 });
 return {schema:'router-static-source-text-projection-v1',bundle:{schema:payload.schema,cases:payload.cases,authority:payload.authority,profiles:payload.profiles,current:payload.current,sources,lineage},validation:{canonicalDocuments:false,logicalPayloadDigest:false,compilerAuthority:false}};
}
