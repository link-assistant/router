import {knownOriginalSelfCrateAliasSuccessor} from './original-self-crate-alias-20261103-history.mjs';
// Exact source continuation DATA only. Every private original issuer remains.
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation,withExactSourceHistoryDataReservation} from './exact-source-successors-20261103.mjs';
import {exactSourceHistoryEpoch} from './exact-source-history-epoch-20261103.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENGINE='tools/translation/exact-source-successors-20261103.mjs';
const BASE='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/';
/** Engine sources are deliberately outside their own hashed index. Retain the
 * complete physical127 -> cold127 ->198 equations separately, without repinning
 * a historical afterimage or constructing a hash self-reference. */
export function knownExactSourceCompilerEngineEpoch({root=ROOT,before,current,retainedBytes=0}={}){
 if(typeof before!=='string'||typeof current!=='string'||!Number.isSafeInteger(retainedBytes)||retainedBytes<0||retainedBytes>16777216)throw TypeError('Complete original/current engine source DATA required');
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withSourceInputValidation(()=>withCompleteSourceClosingFence(()=>{
  const original=custody.read(join(root,BASE+'engine.physical127.txt'));
  const cold=custody.read(join(root,BASE+'engine.before.txt'));
  const after=custody.read(join(root,BASE+'engine.after.txt'));
  if(hash(original)!=='7b2d7970c7e5e424d14e1f18d8528fee3a38064ebc154c0e2361488b8888d6ea'||hash(cold)!=='be23f8d3b828cb21357b506449818f9ec43d116da7f93fd05f4c14f2f9cd66d9'||hash(after)!=='ae36643af1f08c48d679942db08534baf10d7c5d1ad59e2eca6ea2b413ad3290')throw TypeError('Fixed whole engine source images differ');
  // The original198 domain needs no newer-source companion in another root.
  const chain=[original,cold,after];
  if(current!==after){const latest=custody.read(join(root,'tools/translation/source-profiles/exact-source-current-families-20261103/engine.after.txt'));if(hash(latest)!=='54007cd41b86cfe0cc380ef5a42903f1d607a6598cd217844723b8740ad25791')throw TypeError('Fixed complete current-family engine source differs');chain.push(latest);
   // Preserve the original282 root domain without requiring a newer companion.
   if(current!==latest){const temporary=custody.read(join(root,'tools/translation/source-profiles/exact-source-temporary-families-20261103/engine.after.txt'));if(hash(temporary)!=='3b973f21fb906142e015fc2c8222e772fd2520a0d7e9de900cd3c80bf83db9dd')throw TypeError('Fixed complete native-temporary engine source differs');chain.push(temporary);
    // A root still at292 needs no later JSON packaging source companion.
    if(current!==temporary){const json=custody.read(join(root,'tools/translation/source-profiles/exact-source-json-packaging-families-20261103/engine.after.txt'));if(hash(json)!=='5018c06d2607e4c7d8f8b0121367a299e575b7186f3eec0db8a2eab71f8a7ee4')throw TypeError('Fixed complete JSON packaging engine source differs');chain.push(json);}
   }
  }
  const first=chain.indexOf(before),last=chain.indexOf(current);
  if(first<0||last<2||first>last||custody.read(join(root,ENGINE))!==current)return null;
  return withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(retainedBytes+chain.reduce((bytes,source)=>bytes+Buffer.byteLength(source),0),()=>{
  const stages=[];for(let at=first;at<last;at++)stages.push(exactSourceHistoryEpoch({path:ENGINE,before:chain[at],after:chain[at+1],current,language:'JavaScript'}));
  const result=exactSourceHistoryEpoch({path:ENGINE,before,after:current,current,language:'JavaScript'});
  return {...result,laterHistories:stages,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
  }));
 },[custody.close]));
}
/** Operational source selection only. Old exact afterimages remain accepted;
 * every newer source must be a complete current terminal of the fixed graph.
 * Retained source bytes restrict the SAME16MiB history budget on this call. */
export function matchesExactSourceEpoch(row,current,{root=ROOT,retainedBytes=0}={}){
 if(!row||typeof row.path!=='string'||typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||typeof current!=='string'||!Number.isSafeInteger(retainedBytes)||retainedBytes<0||retainedBytes>16777216)throw TypeError('Complete original source equation/current byte reservation required');
 if(current===row.after)return true;
 if(row.path===ENGINE)return knownExactSourceCompilerEngineEpoch({root,before:row.after,current,retainedBytes})!==null;
 if(['tools/translation/ordered-text-map-callers-20261102-native-context.mjs','tools/translation/borrowed-standard-map-20261103-native-context.mjs'].includes(row.path))return withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(retainedBytes+Buffer.byteLength(current)+Buffer.byteLength(row.after),()=>{const later=knownOriginalSelfCrateAliasSuccessor({root,path:row.path,before:row.after});return later!==null&&later.after===current;}));
 return withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(retainedBytes,()=>{
  const later=knownExactSourceSuccessor({path:row.path,before:row.after},{root});
  return later!==null&&later.currentIsTerminal===true&&later.after===current;
 }));
}
