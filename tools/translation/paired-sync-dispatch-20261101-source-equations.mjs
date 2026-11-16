// Complete source-equation author SOURCE, UNRUN. Original snapshots are DATA;
// no hash, source spelling or prepared equation grants compiler authority.
import {fileURLToPath} from 'node:url';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createReconcileSourceCapture,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const need=(value,message)=>{if(!value)throw new TypeError('Paired sync source equations: '+message);};
const importLine="import {assertPairedSyncChildAfterAgreement} from './paired-sync-dispatch-20261101-after-agreement.mjs';\n";
function replaceOnce(source,before,after){const at=source.indexOf(before);need(at>=0&&source.indexOf(before,at+before.length)<0,'one complete exact original source selection required');return source.slice(0,at)+after+source.slice(at+before.length);}
function bulkAfter(source){
 source=replaceOnce(source,"import {repositoryRustLayout} from './repository-layout.mjs';\n","import {repositoryRustLayout} from './repository-layout.mjs';\n"+importLine);
 source=replaceOnce(source,'reviews=[],authored=new Set();let retained=0','reviews=[],authored=new Set(),children=[];let retained=0');
 const review='   const review=inspectPairedSyncEdits(rows);reviews.push({id:unit.id,...review});\n';
 source=replaceOnce(source,review,review+'   const child={id:unit.id,inputs:new Map(rows.map(row=>[row.path,row.current.source])),outputs:new Map()};children.push(child);\n');
 source=replaceOnce(source,"   for(const row of plan.inputs){need(capture(row.path).source===row.source,'complete fresh child input differs');}\n   for(const row of plan.outputs)output(row);", "   for(const row of plan.inputs){need(capture(row.path).source===row.source,'complete fresh child input differs');child.inputs.set(row.path,row.source);}\n   for(const row of plan.outputs){output(row);child.outputs.set(row.path,row);}");
 const authored="  for(const name of authored)if(outputs.has(name))need(outputs.get(name).after===capture(name).source,'bulk output would overwrite an independently authored source: '+name);\n";
 return replaceOnce(source,authored,authored+'  assertPairedSyncChildAfterAgreement(children,outputs);\n');
}
function dispatchAfter(source){
 source=replaceOnce(source,"import {repositoryRustLayout} from './repository-layout.mjs';\n","import {repositoryRustLayout} from './repository-layout.mjs';\n"+importLine);
 source=replaceOnce(source,'   const child={id:unit.id,inputs:new Set(watched.keys()),outputs:new Map()};children.push(child);','   const child={id:unit.id,inputs:new Map(rows.map(row=>[row.path,row.current.source])),outputs:new Map()};children.push(child);');
 source=replaceOnce(source,"   for(const row of plan.inputs){need(capture(row.path).source===row.source,'complete fresh child input differs');child.inputs.add(row.path);}","   for(const row of plan.inputs){need(capture(row.path).source===row.source,'complete fresh child input differs');child.inputs.set(row.path,row.source);}");
 return replaceOnce(source,"  for(const row of outputs.values())if(row.before!==row.after)for(const child of children)if(child.inputs.has(row.path)){\n   const agreed=child.outputs.get(row.path);need(agreed&&agreed.before===row.before&&agreed.after===row.after&&agreed.mode===row.mode,'cross-unit dependency output lacks independently agreed complete projection: '+child.id+': '+row.path);\n  }",'  assertPairedSyncChildAfterAgreement(children,outputs);');
}
export function preparePairedSyncDispatchSourceEquations({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root),rows=[];let primary,failed=false;
 try{
  for(const [suffix,target,transform]of [['original-bulk.mjs.txt','tools/translation/paired-sync-bulk-20261101.mjs',bulkAfter],['original-dispatch.mjs.txt','tools/translation/paired-sync-dispatch-20261101.mjs',dispatchAfter]]){
   const snapshot='tools/translation/source-profiles/paired-sync-dispatch-20261101/originals/'+suffix,before=capture.capture(snapshot).source,current=capture.capture(target).source;need(before!==null&&current!==null,'complete immutable snapshot and actual source required');const after=transform(before);need(current===after,'complete actual source differs from original recipe');
   const concrete=transportConcreteSyntaxSource(before,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===before,'complete original snapshot CST inverse differs');
   const substitution=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'javascript:retain-complete-original-planner-source',edits:[{span:[0,before.length],expected:before,replacement:before}]}],repositoryRules:[{id:'router:share-complete-child-after-byte-guard',edits:[{span:[0,before.length],expected:before,replacement:after}]}]});
   need(substitution.value.source===current,'complete checked source substitution differs');const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(history.inverse===before,'complete original planner source inverse differs');
   rows.push({path:target,snapshot,before,after,inverse:before,history,trace:substitution.trace,sourceAuthority:false,semanticAuthority:false});
  }
  // Keep the complete pre-fix independent case/doc sources too. Their only
  // change is an append-only new source receipt/regression batch below.
  const preserved=[];
  for(const [snapshot,target]of [['tools/translation/source-profiles/paired-sync-dispatch-20261101/originals/original-bulk-cases.mjs.txt','tools/translation/test/paired-sync-bulk-20261101.test.mjs'],['tools/translation/source-profiles/paired-sync-dispatch-20261101/originals/original-bulk-doc.md.txt','docs/development/paired-sync-bulk-20261101.md']]){
   const before=capture.capture(snapshot).source,current=capture.capture(target).source;need(before!==null&&current!==null&&current.startsWith(before),'complete old case/doc source must remain an exact prefix');preserved.push({path:target,snapshot,before,after:current,inverse:before,appended:current.slice(before.length),sourceAuthority:false});
  }
  const result={schema:'router-paired-sync-dispatch-source-equations-20261101-v1',files:rows,preserved,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,receivingExecuted:false};boundedReconcileWireBytes(result);capture.close();return result;
 }catch(error){failed=true;primary=error;}
 try{capture.close();}catch(error){if(!failed)throw error;}
 throw primary;
}
