// Original reusable two-phase index builder, additive six-reader segment only.
// This source proposal installs nothing and grants no compiler permission.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {extendExactSourceIndexCompactData} from './exact-source-index-builder-20261103.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/width-counted-ranges-20261104/complete-source.json.gz';
const SHA='7de9bcc926672790f381ee8de0b9751d9f24e976b381f83b9b05d87936ef1fd1',hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw TypeError('Width range source segment index: '+message);};
const PATHS=['owned-outcome','owned-cancellation','owned-text-vector-outcome','owned-text-vector-cancellation','owned-text-vector-join-outcome','owned-text-vector-join-cancellation'].map(name=>'tools/translation/js-to-rust/'+name+'-source.mjs');
export function proposeWidthCountedRangeSegmentIndex20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete source packet differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'whole source UTF8 differs');const data=JSON.parse(text);need(data.schema==='width-counted-range-source-20261104-v1'&&data.rows.length===6,'all six original readers required');
  const rows=data.rows.map((row,at)=>{need(row.path===PATHS[at]&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256,'complete original source and inverse required');return {id:String(at),path:row.path,language:'JavaScript',before:row.before,after:row.after};});
  const previous={schema:'fixed-reviewed-source-successor-index-20261103-v1',scope:'Reviewed whole-source equations only; incomplete production source/function/writer census',rows:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
  return extendExactSourceIndexCompactData({previous,families:[{id:'width-counted-reader-source-20261104',manifest:PACKET,rows}]});
 },[custody.close]);
}
