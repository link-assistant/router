// Fresh full runtime/declaration source DATA; no source/type/namespace permit.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function borrowedStandardMapRuntimeAssets({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const result=new Map();for(const [name,language]of [['borrowed-standard-map-20261102-runtime.mjs','JavaScript'],['borrowed-standard-map-20261102-runtime.d.mts','TypeScript'],['borrowed-standard-map-20261103-input-runtime.mjs','JavaScript'],['borrowed-standard-map-20261103-input-runtime.d.mts','TypeScript']]){
   const source=capture.capture('tools/translation/'+name).source;need(typeof source==='string','complete original borrowed-map runtime asset required');
   const concrete=transportConcreteSyntaxSource(source,{language});need(concrete.source===source&&transportConcreteSyntaxMeta(concrete.meta).source===source,'whole runtime source CST differs');result.set('runtime/'+name,source);
  }return result;
 },[capture.close]);
}
