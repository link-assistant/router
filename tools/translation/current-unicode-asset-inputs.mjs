// Explicit complete source evolution; these inputs grant no runtime authority.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {prepareCoreUnicodePredicates} from './prepare-core-unicode-predicates.mjs';
import {prepareSharedF64MethodReceivers} from './prepare-shared-f64-method-receivers.mjs';

const SOURCE='tools/translation/js-to-rust/owned-core-source.mjs';
const HOST='tools/translation/extensions/host-contracts.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Current Unicode asset inputs: '+message);};

export function currentUnicodeAssetInputs(originals,root){
 root=resolve(root);const unicode=prepareCoreUnicodePredicates({root}),observed=[];
 // Only the base asset inputs contain this complete host source. Its receiver
 // successor must join the actual Unicode output, including both CST inverses.
 const receiverEvolution=originals.some(row=>row.path===HOST)?prepareSharedF64MethodReceivers({root}):null;
 const rows=originals.map(original=>{
  if(hash(original.source)!==original.sha256)fail('complete original input digest differs');
  const evolution=unicode.files.find(row=>row.path===original.path);
  if(evolution&&evolution.before!==original.source)fail('complete original Unicode parent differs: '+original.path);
  let source=evolution?evolution.after:original.source;
  const receiver=receiverEvolution?.files.find(row=>row.path===original.path);
  if(receiver){
   if(receiver.before!==source)fail('complete receiver predecessor differs: '+original.path);
   source=receiver.after;
  }
  if(original.path!==SOURCE){
   if(readFileSync(resolve(root,original.path),'utf8')!==source)fail('unknown complete current asset input: '+original.path);
   observed.push({path:original.path,source});
  }
  return {...original,source,sha256:hash(source)};
 });
 // The receiver proof also reads its original checker and helper sources.
 // Rejoin every physical input after the receiving producer finishes.
 for(const row of receiverEvolution?.files??[])if(!observed.some(other=>other.path===row.path))observed.push({path:row.path,source:row.current});
 return {schema:'current-unicode-asset-inputs-v1',root,originals,rows,unicode,receiverEvolution,observed,semanticAuthority:false};
}

export function requireCurrentUnicodeAssetInputs(input){
 for(const row of input.observed)if(readFileSync(resolve(input.root,row.path),'utf8')!==row.source)fail('complete asset input changed during preparation: '+row.path);
}
