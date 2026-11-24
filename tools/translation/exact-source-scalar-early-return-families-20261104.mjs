// Repository source ancestry DATA. Never imports or executes packet source.
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {extendExactSourceIndexCompactData} from './exact-source-index-builder-20261103.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-scalar-early-return-families-20261104/';
const MANIFEST_SHA='acc252c586f71d2f628dd28a19cdf74dbebe3329808923e95bb9e1a1005167b7';
const CONTROL=new Set(['tools/translation/exact-source-successors-20261103.mjs','tools/translation/exact-source-compiler-epochs-20261103.mjs']);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const fail=message=>{throw TypeError('Complete current source families: '+message);};
function path(value){if(typeof value!=='string'||!value||value.length>4096||/[\x00-\x1f\x7f\\:]/u.test(value)||/\p{Surrogate}/u.test(value)||value.startsWith('/')||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('bounded ordinary relative source path required');return value;}
function text(raw){const value=raw.toString('utf8');if(!Buffer.from(value).equals(raw))fail('complete source must retain strict UTF8');return value;}
/** One bounded invocation, with every source input independently reclosed. */
export function withExactScalarEarlyReturnSourceFamilyData20261104(run,{root=ROOT}={}){
 requireSynchronousSourceCallback(run);const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  const input=withSourceInputValidation(()=>{
   const raw=custody.readBytes(join(root,BASE+'families.json'),1048576);if(hash(raw)!==MANIFEST_SHA)fail('fixed complete source family census differs');const census=JSON.parse(text(raw));
   if(census.schema!=='fixed-scalar-early-return-source-family-census-20261104-v1'||census.families.length!==2||census.totalRows!==482||census.sourceRows!==16||census.baseline.rows!==466)fail('complete reviewed family/index counts required');
   const baseline=custody.readBytes(join(root,path(census.baseline.path)),1048576);if(hash(baseline)!==census.baseline.encodedSha256)fail('complete original466 archive differs');const original=gunzipSync(baseline,{maxOutputLength:1048576});if(hash(original)!==census.baseline.sourceSha256)fail('whole original466 index differs');const previous=JSON.parse(text(original));if(previous.schema!=='fixed-reviewed-source-successor-index-20261103-v1'||previous.rows.length!==466)fail('original full source index required');
   let retained=0;const families=[];
   for(const family of census.families){
    const name=path(family.manifest);if(!name.startsWith('tools/translation/source-profiles/')||!['archive','images'].includes(family.kind))fail('fixed complete source profile input required');const raw=custody.readBytes(join(root,name),1048576);if(hash(raw)!==family.sha256)fail('fixed whole source profile differs: '+name);const packet=JSON.parse(text(family.kind==='archive'?gunzipSync(raw,{maxOutputLength:8388608}):raw));if(packet.schema!==family.schema)fail('original source profile schema differs');
    const originals=family.kind==='archive'?packet.rows.concat(family.includeNewFiles?packet.newFiles:[]):packet.files.concat(family.includeNewFiles?packet.newFiles:[]);if(!Array.isArray(originals)||originals.length>128)fail('bounded full original source cohort required');const rows=[];
    for(let at=0;at<originals.length;at++){
     const row=originals[at],name=path(row.path);if(CONTROL.has(name))fail('engine/control source stays outside its own hashed graph');
     const sides={};for(const side of ['before','after']){
      if(family.kind==='archive')sides[side]=row[side];
      else{const image=row[side],raw=custody.readBytes(join(root,dirname(family.manifest),path(image.path)),4194304);if(raw.length!==image.bytes||hash(raw)!==image.sha256)fail('complete fixed source image differs');sides[side]=text(raw);}
      if(typeof sides[side]!=='string'||Buffer.byteLength(sides[side])>4194304||(retained+=Buffer.byteLength(sides[side]))>16777216)fail('original whole source/image retention bound');
     }
     if(row.inverse!==undefined&&row.inverse!==sides.before)fail('complete retained source inverse differs');
     if(row.beforeSha256!==undefined&&hash(sides.before)!==row.beforeSha256||row.afterSha256!==undefined&&hash(sides.after)!==row.afterSha256)fail('complete retained source hashes differ');
     rows.push({id:String(at),path:name,language:name.endsWith('.rs')?'Rust':/\.(?:mts|ts)$/u.test(name)?'TypeScript':'JavaScript',...sides});
    }
    if(rows.length!==family.rows)fail('complete original source family rows required');families.push({id:family.id,manifest:family.manifest,rows});
   }
   if(families.reduce((count,family)=>count+family.rows.length,0)!==16)fail('all installed source parents required');return {previous,families};
  });
  return run(input);
 },[custody.close]);
}
/** The real reusable two-phase builder qualifies full source/CST/inverses.
 * This additive DATA API produces proposals and never installs source files. */
export function proposeExactScalarEarlyReturnSourceIndex20261104(options={}){
 return withExactScalarEarlyReturnSourceFamilyData20261104(input=>extendExactSourceIndexCompactData(input),options);
}
