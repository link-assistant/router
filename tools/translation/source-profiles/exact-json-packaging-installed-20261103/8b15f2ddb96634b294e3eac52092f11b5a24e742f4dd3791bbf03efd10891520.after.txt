// Packaging DATA only: never native source or type permission.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function relocateBorrowedJsonRuntimeSource(name,source){
 need(typeof name==='string'&&typeof source==='string','primitive asset name and complete source required');
 return name==='json-runtime.mjs'?source.replace("'../borrowed-json-tool-predicate-20261103-runtime.mjs'","'./borrowed-json-tool-predicate-20261103-runtime.mjs'"):source;
}
export function borrowedJsonToolPredicateRuntimeAssets({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const files=new Map();for(const [suffix,language] of [['mjs','JavaScript'],['d.mts','TypeScript']]){
   const name='borrowed-json-tool-predicate-20261103-runtime.'+suffix,source=capture.capture('tools/translation/'+name).source;need(typeof source==='string','complete original borrowed JSON runtime asset required');const concrete=transportConcreteSyntaxSource(source,{language});need(concrete.source===source&&transportConcreteSyntaxMeta(concrete.meta).source===source,'complete borrowed JSON runtime CST differs');files.set('runtime/'+name,source);
  }return files;
 },[capture.close]);
}
