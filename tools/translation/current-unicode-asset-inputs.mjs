// Explicit complete source evolution; these inputs grant no runtime authority.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {prepareCoreUnicodePredicates} from './prepare-core-unicode-predicates.mjs';

const SOURCE='tools/translation/js-to-rust/owned-core-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Current Unicode asset inputs: '+message);};

export function currentUnicodeAssetInputs(originals,root){
 root=resolve(root);const unicode=prepareCoreUnicodePredicates({root}),observed=[];
 const rows=originals.map(original=>{
  if(hash(original.source)!==original.sha256)fail('complete original input digest differs');
  const evolution=unicode.files.find(row=>row.path===original.path);
  if(evolution&&evolution.before!==original.source)fail('complete original Unicode parent differs: '+original.path);
  const source=evolution?evolution.after:original.source;
  if(original.path!==SOURCE){
   if(readFileSync(resolve(root,original.path),'utf8')!==source)fail('unknown complete current asset input: '+original.path);
   observed.push({path:original.path,source});
  }
  return {...original,source,sha256:hash(source)};
 });
 return {schema:'current-unicode-asset-inputs-v1',root,originals,rows,unicode,observed,semanticAuthority:false};
}

export function requireCurrentUnicodeAssetInputs(input){
 for(const row of input.observed)if(readFileSync(resolve(input.root,row.path),'utf8')!==row.source)fail('complete asset input changed during preparation: '+row.path);
}
