// Exact comparison DATA only; installed struct behavior requires its own checks.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';

const STRUCT_ORDERING_SOURCE_PROFILES=Object.freeze({
 'builtin-derive-bang-footprints.mjs':'e90460283e07d0d08ef4548e5c8aa9f1f43e7be9374b2c2e2547e7db1705c474',
 'builtin-ordering-ast-route.mjs':'ee817bbba54f916cada509ad9b63da474e8f6c78b88d633d518a706217ac88e7',
});
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Struct ordering source history: '+message);};

export function deriveStructOrderingSourceHistory(ts,{path,source}){
 if(typeof path!=='string')fail('complete primitive source path required');
 const name=path.startsWith('tools/translation/')?path.slice('tools/translation/'.length):'';
 if(!Object.hasOwn(STRUCT_ORDERING_SOURCE_PROFILES,name))return null;
 if(typeof source!=='string'||Buffer.byteLength(source)>262144)fail('bounded complete primitive source required');
 const profile=new URL('./source-profiles/struct-ordering-source-history/'+name.replace('.mjs','.rules.json'),import.meta.url);
 const state=lstatSync(profile);
 if(!state.isFile()||state.isSymbolicLink()||state.size>131072)fail('bounded ordinary complete profile required');
 const bytes=readFileSync(profile),pin=STRUCT_ORDERING_SOURCE_PROFILES[name];
 if(bytes.length!==state.size||hash(bytes)!==pin)fail('complete authored profile differs');
 const data=JSON.parse(bytes),currentSha256=hash(source);let before=source;
 if(currentSha256===data.afterSha256){
  for(const edit of [...data.edits].reverse()){
   if(before.split(edit.after).length!==2)fail('complete exact inverse anchor required');
   before=before.replace(edit.after,()=>edit.before);
  }
 }else if(currentSha256!==data.beforeSha256)fail('unregistered complete source: '+path);
 const history=derivePinnedRepositorySourceEvolution(ts,{path,source:before,profile,profileSha256:pin});
 if(!readFileSync(profile).equals(bytes)||source!==history.before&&source!==history.after)fail('complete current history equation differs');
 return {...history,path,current:source};
}
