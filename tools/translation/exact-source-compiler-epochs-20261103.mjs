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
    if(current!==temporary){const json=custody.read(join(root,'tools/translation/source-profiles/exact-source-json-packaging-families-20261103/engine.after.txt'));if(hash(json)!=='5018c06d2607e4c7d8f8b0121367a299e575b7186f3eec0db8a2eab71f8a7ee4')throw TypeError('Fixed complete JSON packaging engine source differs');chain.push(json);
     if(current!==json){const recovery=custody.read(join(root,'tools/translation/source-profiles/exact-source-temporary-recovery-families-20261103/engine.after.txt'));if(hash(recovery)!=='08afcdc9fc0b4a91149984bf414821799aa6f02fdcb215d6aa621a73f9f49a3c')throw TypeError('Fixed complete native temporary recovery engine source differs');chain.push(recovery);if(current!==recovery){const compiler=custody.read(join(root,'tools/translation/source-profiles/exact-source-borrowed-json-compiler-families-20261103/engine.after.txt'));if(hash(compiler)!=='15068b04967ec210001e2c6aeddbd668272d606e4174dcb769dd151b7668e094')throw TypeError('Fixed complete borrowed JSON compiler engine source differs');chain.push(compiler);if(current!==compiler){const lifetimes=custody.read(join(root,'tools/translation/source-profiles/exact-source-borrowed-json-lifetimes-families-20261103/engine.after.txt'));if(hash(lifetimes)!=='f7bc399948291af16a4701f03145630a31ed3cb7b467628695cb084cd0768ce3')throw TypeError('Fixed complete borrowed JSON lifetime engine source differs');chain.push(lifetimes);if(current!==lifetimes){const context=custody.read(join(root,'tools/translation/source-profiles/exact-source-borrowed-json-context-families-20261103/engine.after.txt'));if(hash(context)!=='374daa06bc8de7934e21dec1784df565da89816235028fa9a80b60892b8c89b8')throw TypeError('Fixed complete borrowed JSON context engine source differs');chain.push(context);if(current!==context){const predicate=custody.read(join(root,'tools/translation/source-profiles/exact-source-borrowed-predicate-families-20261103/engine.after.txt'));if(hash(predicate)!=='021ecb81e92cfe42da36fc3c462db212b8f014d4b37f5e75cc25f7e291d63533')throw TypeError('Fixed complete borrowed predicate engine source differs');chain.push(predicate);if(current!==predicate){const collection=custody.read(join(root,'tools/translation/source-profiles/exact-source-collection-description-families-20261103/engine.after.txt'));if(hash(collection)!=='a1f92121efdfd4d133d1f736e5d08689bf023d66a73f9b1dc5c0b080aae7c1ad')throw TypeError('Fixed complete collection description engine source differs');chain.push(collection);if(current!==collection){const helper=custody.read(join(root,'tools/translation/source-profiles/exact-source-boolean-helper-families-20261103/engine.after.txt'));if(hash(helper)!=='472d54fdb781a2d3cbeab8fa184a45717c0708942aeaeab7e17b74f632eef2e5')throw TypeError('Fixed complete Boolean helper engine source differs');chain.push(helper);if(current!==helper){const scalar=custody.read(join(root,'tools/translation/source-profiles/exact-source-copy-scalar-helper-families-20261103/engine.after.txt'));if(hash(scalar)!=='b8b3d3a7aeccbad9f8013931d671233d16026d25d42f1d56af742dcaab1cf42e')throw TypeError('Fixed complete Copy scalar helper engine source differs');chain.push(scalar);if(current!==scalar){const locals=custody.read(join(root,'tools/translation/source-profiles/exact-source-scalar-locals-families-20261103/engine.after.txt'));if(hash(locals)!=='d97a527e7693ddfc5d836268ecc471cf50c43163b32770335b969736f2f53fd9')throw TypeError('Fixed complete scalar locals engine source differs');chain.push(locals);}}}}}}}}}
    }
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
