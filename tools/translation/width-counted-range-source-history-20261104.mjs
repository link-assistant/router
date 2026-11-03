// Fixed original499 plus six reviewed loop-reader source equations. DATA only.
// No caller-supplied registry, decoder, compiler hook or persisted verdict.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {composeExactSourceSegmentData20261104} from './exact-source-segment-data-20261104.mjs';
import {withExactSourceHistoryDataOperation,withExactSourceHistoryDataReservation} from './exact-source-successors-20261103.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),REGISTRY='tools/translation/source-profiles/width-counted-range-segments-20261104/registry.json';
const SHA='03c86f7e5590e56293b6ef4ac0d786d9be6c89a37e0c1b17a5a7bb5fb6b929a0';
const PATHS=['owned-outcome','owned-cancellation','owned-text-vector-outcome','owned-text-vector-cancellation','owned-text-vector-join-outcome','owned-text-vector-join-cancellation'].map(name=>'tools/translation/js-to-rust/'+name+'-source.mjs');
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw TypeError('Fixed width-range source history: '+message);};
const text=raw=>{const value=raw.toString('utf8');need(Buffer.from(value).equals(raw),'complete UTF8 source required');return value;};
function prepare(input,{root=ROOT}={},known){
 return withSourceFailureOperation(()=>withSourceInputValidation(()=>{
  account(input);input=copyMetadata(input);need(input&&Object.keys(input).sort().join(',')==='before,path'&&typeof input.path==='string'&&typeof input.before==='string'&&Buffer.byteLength(input.before)<=4194304,'exact original path and complete source DATA required');if(!PATHS.includes(input.path))return null;
  return withExactSourceHistoryDataOperation(root,()=>{
   const custody=createOrderedMapCanonicalSourceCustody(root);let closed=false;const close=()=>{if(!closed){closed=true;custody.close();}};
   return withCompleteSourceClosingFence(()=>{
    const rawRegistry=custody.readBytes(join(root,REGISTRY),1048576);need(hash(rawRegistry)===SHA,'fixed complete registry differs');const registry=JSON.parse(text(rawRegistry));need(registry.schema==='fixed-width-counted-source-history-segments-20261104-v1'&&registry.paths.join('\0')===PATHS.join('\0')&&registry.segments.length===2&&registry.segments[0].rows===499&&registry.segments[1].rows===6,'exact original and width-reader source cohort required');
    let encodedBytes=rawRegistry.length;const segments=[];
    for(const item of registry.segments){
     need(['gzip','utf8'].includes(item.encoding)&&item.path.startsWith('tools/translation/source-profiles/width-counted-range-segments-20261104/'),'fixed original index source required');const packed=custody.readBytes(join(root,item.path),1048576);encodedBytes+=packed.length;need(hash(packed)===item.sha256,'complete fixed index archive differs');const raw=item.encoding==='gzip'?gunzipSync(packed,{maxOutputLength:1048576}):packed;need(hash(raw)===item.sourceSha256,'whole original index differs');const indexText=text(raw),index=JSON.parse(indexText);need(Array.isArray(index.rows)&&index.rows.length===item.rows,'all original index rows required');
     const selected=index.rows.filter(row=>row.path===input.path),names=new Set(selected.flatMap(row=>[row.before.path,row.after.path])),images=[];
     for(const path of names){need(typeof path==='string'&&path.startsWith('tools/translation/source-profiles/')&&!path.split('/').some(part=>!part||part==='.'||part==='..'),'fixed full selected image path required');images.push({path,source:text(custody.readBytes(join(root,path),4194304))});}segments.push({id:item.id,indexText,images});
    }
    const current=text(custody.readBytes(join(root,input.path),4194304)),data={path:input.path,before:input.before,current,segments};
    // The same original operation budget includes conservative raw/decoded/
    // selected DATA and captured physical buffers. This reservation restricts
    // an existing parent frame too; it is never a second16MiB allowance.
    const reservation=account(data).utf8Bytes*3+encodedBytes;
    return withExactSourceHistoryDataReservation(reservation,()=>withCompleteSourceClosingFence(()=>{
     const result=composeExactSourceSegmentData20261104(data);if(result===null||known&&!result.currentIsTerminal)return null;return {...result,registry:REGISTRY,completeReceivingClosure:false};
    },[close]));
   },[close]);
  });
 }));
}
export function prepareWidthCountedRangeSourceSuccessor20261104(input,options){return prepare(input,options,false);}
export function knownWidthCountedRangeSourceSuccessor20261104(input,options){return prepare(input,options,true);}
