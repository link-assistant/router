// General reversible wire encoding. No source/CST or execution authority.
const SCHEMA='router-static-cst-global-column-table-storage-v1',ROW='router-lineage-row-v1';
const MAX=256*1024*1024,MAX_ROWS=4096,MAX_REFS=16384,MAX_COLUMN_BYTES=200000*8;
const json=JSON.stringify,parse=JSON.parse;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const dense=value=>Array.isArray(value)&&Object.keys(value).length===value.length&&Object.keys(value).every((key,index)=>key===String(index));
const safe=value=>Number.isSafeInteger(value)&&value>=0&&!Object.is(value,-0);
function check(value,message){if(!value)throw new TypeError('Static storage transport: '+message);}
function slots(payload){
 const body=payload.payload;if(!record(body)||!Array.isArray(body.profiles)||!record(body.current)||!Array.isArray(body.current.files)||!Array.isArray(body.lineage))return null;
 const rows=[];
 for(const profile of [...body.profiles,body.current]){
  if(!record(profile)||!Array.isArray(profile.files))return null;
  for(const row of profile.files){if(!record(row))return null;rows.push(row);if(rows.length>MAX_REFS)return null;}
 }
 for(const stage of body.lineage){
  if(!record(stage)||!Array.isArray(stage.files))return null;
  for(const wrapped of stage.files){
   if(!Array.isArray(wrapped)||wrapped[0]!==ROW)continue;
   const row=wrapped[1];if(!record(row))return null;
   for(const side of ['before','after'])if(Object.hasOwn(row,side)){
    if(!record(row[side]))return null;rows.push(row[side]);if(rows.length>MAX_REFS)return null;
   }
  }
 }
 return rows;
}
function dictionary(payload){
 const sources=payload.payload?.sources;check(record(sources),'complete source dictionary required');
 const ids=Object.keys(sources);check(ids.length<=MAX_ROWS&&ids.every(id=>/^[a-f0-9]{64}$/u.test(id)),'bounded original source IDs required');return ids;
}
export function packStaticStorageTransport(payload){
 if(payload.schema!==SCHEMA)return {payload,columnEncoding:'plain-v1',metadataEncoding:'plain-v1'};
 const copy=parse(json(payload)),ids=dictionary(copy),positions=new Map(ids.map((id,index)=>[id,index])),references=slots(copy);
 let metadataEncoding='plain-v1';
 if(references&&references.every(row=>positions.has(row.sourceId))){for(const row of references)row.sourceId=positions.get(row.sourceId);metadataEncoding='source-index-v1';}
 check(dense(copy.columnTables)&&copy.columnTables.length===6,'exact six column tables required');
 let total=0;
 copy.columnTables=copy.columnTables.map(table=>{
  check(dense(table)&&table.length<=MAX_ROWS,'bounded dense column table required');
  return table.map(text=>{check(typeof text==='string'&&text.length<=4*Math.ceil(MAX_COLUMN_BYTES/3),'bounded base64 column required');const raw=Buffer.from(text,'base64');check(raw.toString('base64')===text&&raw.length<=MAX_COLUMN_BYTES,'canonical complete column bytes required');total+=raw.length;check(total<=MAX,'complete literal byte bound');return raw.toString('hex');});
 });
 return {payload:copy,columnEncoding:'hex-v1',metadataEncoding};
}
export function unpackStaticStorageTransport(payload,columnEncoding,metadataEncoding,{columns=true}={}){
 check(['plain-v1','hex-v1'].includes(columnEncoding)&&['plain-v1','source-index-v1'].includes(metadataEncoding),'recognized explicit wire encodings required');
 if(columnEncoding==='plain-v1'&&metadataEncoding==='plain-v1')return payload;
 check(payload.schema===SCHEMA,'original column container required');
 const copy=parse(json(payload));
 if(metadataEncoding==='source-index-v1'){
  const ids=dictionary(copy),references=slots(copy);check(references,'bounded complete metadata references required');
  for(const row of references){check(safe(row.sourceId)&&row.sourceId<ids.length,'original source dictionary index required');row.sourceId=ids[row.sourceId];}
 }
 if(columnEncoding==='hex-v1'&&columns){
  check(dense(copy.columnTables)&&copy.columnTables.length===6,'exact six stored column tables required');let total=0;
  copy.columnTables=copy.columnTables.map(table=>{
   check(dense(table)&&table.length<=MAX_ROWS,'bounded dense stored table required');
   return table.map(text=>{check(typeof text==='string'&&text.length%2===0&&text.length<=MAX_COLUMN_BYTES*2&&/^[0-9a-f]*$/u.test(text),'canonical bounded hex column required');const raw=Buffer.from(text,'hex');total+=raw.length;check(total<=MAX,'complete restored literal byte bound');return raw.toString('base64');});
  });
 }
 return copy;
}
