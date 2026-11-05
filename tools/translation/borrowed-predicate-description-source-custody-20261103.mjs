// Invocation-local full source restriction only. Never issues semantic proof.
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/borrowed-predicate-descriptions-20261103/description-inputs.json.gz';
const SHA='83a6a5fd0a9bb8bcc7c73c348485247e8ab4dc82bf1759edf3d444b0790fc031';
const PATHS=Object.freeze(['tools/translation/borrowed-predicate-operation-descriptions-20261103.mjs','tools/translation/borrowed-json-tool-20261103-contracts.mjs','tools/translation/borrowed-standard-map-20261103-contracts.mjs']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Original borrowed predicate description sources: '+message);};
/** Original private ABI owners call current() before, during and after use.
 * No result, source, owner or receipt survives the enclosing operation. */
export function createBorrowedPredicateDescriptionSourceCustody({root=ROOT}={}){
 const custody=createOrderedMapCanonicalSourceCustody(root);let rows,alive=true,poisoned=false,primary;
 const protect=run=>{if(poisoned)throw primary;try{return run();}catch(error){poisoned=true;primary=error;throw error;}};
 const current=()=>withSourceInputValidation(()=>protect(()=>{
  if(!alive)fail('expired source restriction');
  for(const row of rows)if(custody.read(join(root,row.path))!==row.source)fail('complete operation description/input changed: '+row.path);
 }));
 return withSourceFailureOperation(()=>{
  let admitted=false;
  try{return withCompleteSourceClosingFence(()=>{
   withSourceInputValidation(()=>{
    const encoded=custody.readBytes(join(root,PACKET),1048576);if(hash(encoded)!==SHA)fail('fixed source input archive differs');
    const raw=gunzipSync(encoded,{maxOutputLength:1048576}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('lossless complete source UTF8 required');const data=JSON.parse(text);
    if(data.schema!=='borrowed-predicate-description-input-sources-20261103-v1'||data.rows.length!==PATHS.length||new Set(data.rows.map(row=>row.path)).size!==PATHS.length||data.rows.some(row=>!PATHS.includes(row.path)||typeof row.source!=='string'||hash(row.source)!==row.sha256))fail('all three original source inputs required');
    rows=data.rows.map(row=>Object.freeze({...row}));current();
   });
   admitted=true;return Object.freeze({current,close(){
    if(!alive)return;
    try{return withCompleteSourceClosingFence(current,[custody.close]);}finally{alive=false;rows.length=0;}
   },sourceAuthority:false,semanticAuthority:false});
  },[()=>{if(!admitted)custody.close();}]);}
  finally{if(!admitted){alive=false;if(rows)rows.length=0;}}
 });
}
