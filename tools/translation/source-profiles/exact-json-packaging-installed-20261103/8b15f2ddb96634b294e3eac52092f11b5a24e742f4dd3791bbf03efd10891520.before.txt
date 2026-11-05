// Packaging DATA only: never native source or type permission.
import {readFileSync} from 'node:fs';
export function borrowedJsonToolPredicateRuntimeAssets(){
 const files=new Map();
 for(const suffix of ['mjs','d.mts']){
  const name='borrowed-json-tool-predicate-20261103-runtime.'+suffix;
  files.set('runtime/'+name,readFileSync(new URL('./'+name,import.meta.url),'utf8'));
 }
 return files;
}
