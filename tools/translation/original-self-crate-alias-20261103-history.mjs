// Two exact complete context source successors; no semantic/native permission.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {exactSourceHistoryEpoch} from './exact-source-history-epoch-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const paths=['tools/translation/ordered-text-map-callers-20261102-native-context.mjs','tools/translation/borrowed-standard-map-20261103-native-context.mjs'];
const packet='tools/translation/source-profiles/original-self-crate-alias-20261103/complete-source.json.gz';
const SHA='0caa6dc5ac5020c77a5b9c738de02e2260d023521cc015cea085a00908390745';
export function knownOriginalSelfCrateAliasSuccessor({root=ROOT,path,before}={}){
 if(!paths.includes(path))return null;
 if(typeof before!=='string'||Buffer.byteLength(before)>4194304)throw TypeError('Complete original context source DATA required');
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withSourceInputValidation(()=>withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(join(root,packet),1048576);if(createHash('sha256').update(raw).digest('hex')!==SHA)throw TypeError('Complete fixed original alias source packet differs');
  const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(gunzipSync(raw,{maxOutputLength:1048576})));
  if(value.schema!=='original-self-crate-alias-native-context-source-20261103-v1'||!Array.isArray(value.rows)||value.rows.length!==2||new Set(value.rows.map(row=>row.path)).size!==2||value.rows.some(row=>!paths.includes(row.path)))throw TypeError('Both complete native source context equations required');
  const row=value.rows.find(row=>row.path===path),current=custody.read(join(root,path));
  if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||current!==row.after)throw TypeError('Actual complete native context successor differs');
  if(before!==row.before)return null;
  return exactSourceHistoryEpoch({path,before,after:row.after,current,language:'JavaScript'});
 },[custody.close]));
}
