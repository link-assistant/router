// Original reusable two-phase index builder for the eighteen control equations.
// The original499 and six-reader indexes remain immutable and separate.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {extendExactSourceIndexCompactData} from './exact-source-index-builder-20261103.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/width-range-reader-adoption-20261104/controls.json.gz';
const SHA='33a5056d132820893535b6e1cce131cc0885c0f25292296ded58147be17c075c',hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw TypeError('Width range adoption source segment index: '+message);};
export function proposeWidthRangeAdoptionSegmentIndex20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete source packet differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'whole source UTF8 differs');const data=JSON.parse(text);need(data.schema==='width-range-adoption-controls-20261104-v1'&&data.rows.length===20,'all twenty original controls required');
  const original=data.rows.filter(row=>!['tools/translation/exact-source-successors-20261103.mjs','tools/translation/exact-source-compiler-epochs-20261103.mjs'].includes(row.path));need(original.length===18,'engine controls stay outside their own hashed indexes');
  const rows=original.map((row,at)=>{need(typeof row.path==='string'&&typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256,'complete original source/inverse required');return {id:String(at),path:row.path,language:'JavaScript',before:row.before,after:row.after};});
  const previous={schema:'fixed-reviewed-source-successor-index-20261103-v1',scope:'Reviewed whole-source equations only; incomplete production source/function/writer census',rows:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
  return extendExactSourceIndexCompactData({previous,families:[{id:'width-range-adoption-control-sources-20261104',manifest:PACKET,rows}]});
 },[custody.close]);
}
