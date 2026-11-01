// Additive source proposals. Private selection is lexical evidence, never admission.
import {types} from 'node:util';
import {proposeModuleMacroUseTrackedLocalDeclarativeSources} from './tracked-local-declarative-source.mjs';
import {originalModuleViewItems} from './source-module-views.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {createAttributedLocalDeclarativeMacroEngine} from './attributed-local-declarative-macro-engine.mjs';
import {originalMacroLiteralGrammar} from './macro-literal-source.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {proposeForwardExpressionSynchronization} from './forward-literal-synchronization.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Scoped output binding: '+message);};
const validate=run=>withSourceInputValidation(run);
function own(value,allowed){
 need(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype,'ordinary options required');
 const result={};for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);need(typeof key==='string'&&allowed.includes(key)&&field&&Object.hasOwn(field,'value'),'unknown or accessor option');result[key]=field.value;}return result;
}
function path(value){need(typeof value==='string'&&value.endsWith('.rs')&&!value.includes('\\')&&!value.includes('\0')&&!value.includes(':')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical Rust path required');return value;}
function operation(options,compile,requested=null){return withSourceFailureOperation(()=>{
 const originals=new Map();let input,profileText,entry,paths,bytes=0;
 const current=()=>validate(()=>{let error,failed=false;for(const [name,source]of originals)try{need(input.readSource(name)===source,'complete original changed: '+name);}catch(thrown){if(!failed){failed=true;error=thrown;}}try{need(JSON.stringify(compilationProfile(input.compilationProfile))===profileText,'profile changed');}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;});
 return withCompleteSourceClosingFence(()=>{
 validate(()=>{
  input=own(options,['entry','paths','readSource','compilationProfile','jsonMacroDependencies','deriveDependencies','cargoManifest']);entry=path(input.entry);
  need(typeof input.readSource==='function'&&!types.isProxy(input.readSource),'ordinary source reader required');
  const array=input.paths;need(Array.isArray(array)&&!types.isProxy(array)&&Object.getPrototypeOf(array)===Array.prototype&&array.length>0&&array.length<=128,'bounded complete path array required');
  need(Reflect.ownKeys(array).length===array.length+1,'dense source paths required');paths=[];for(let at=0;at<array.length;at++){const field=Object.getOwnPropertyDescriptor(array,String(at));need(field&&Object.hasOwn(field,'value'),'own source path required');paths.push(path(field.value));}
  need(new Set(paths).size===paths.length&&paths.includes(entry),'unique paths including entry required');profileText=JSON.stringify(compilationProfile(input.compilationProfile));
  for(const name of paths){const source=input.readSource(name);need(typeof source==='string','primitive original source required');originals.set(name,source);need(source.length<=2097152&&Buffer.byteLength(source)<=2097152&&!/\p{Surrogate}/u.test(source),'complete UTF8 owner bound');bytes+=Buffer.byteLength(source);need(bytes<=4194304,'complete original universe bound');}
 });
 let inverse=null,predecessor,files,refusals=[],edits=[],engine,modules,byPath,cellCount=0,calls=0,renderedBytes=0;
 const tick=()=>need(++cellCount<=200000,'complete body tree cell bound');
 const refusal=(module,item,message)=>refusals.push({sourcePath:module.file,module:module.path,span:{start:item.start,end:item.end},original:module.source.slice(item.start,item.end),message});
 const run=createRulePipeline([
 {phase:'language',rules:[{id:'language:complete-original-module-proposal-and-private-body-invocations',apply:()=>validate(()=>{
  current();predecessor=proposeModuleMacroUseTrackedLocalDeclarativeSources({entry,paths,readSource:name=>{need(originals.has(name),'uncaptured module source');return originals.get(name);},compilationProfile:input.compilationProfile});current();
  modules=predecessor.originalGraph.modules.map(row=>({...row,source:originals.get(row.file)}));byPath=new Map(modules.map(row=>[JSON.stringify(row.path),row]));need(byPath.size===modules.length,'unique original module paths required');
  // No public flag closes modularized candidates or producer effects. This
  // deliberately narrow domain has no imports, exports, or unknown producers.
  let closed=predecessor.refusals.length===0&&predecessor.edits.length===0;
  for(const module of modules)for(const item of originalModuleViewItems(module.sourceView,module.source)){
   tick();const tokens=item.tokens.filter(token=>token.type!=='comment');if(['impl','trait','use'].includes(item.term)||!['fn','mod','macro_rules!'].includes(item.term)&&tokens.some(token=>token.text==='!')||tokens.some(token=>token.text==='#')&&!(item.term==='mod'&&tokens[0]?.text==='#'&&tokens[2]?.text==='macro_use'&&tokens[3]?.text===']'))closed=false;
  }
  engine=createAttributedLocalDeclarativeMacroEngine(null,originalMacroLiteralGrammar());
  function body(module,item,visible){
   const fragment=module.source.slice(item.start,item.end),trees=originalMacroTrees(fragment),group=trees.at(-1);
   need(group?.kind==='group'&&group.delimiter==='{','complete original function body required');
   function unsafe(trees){for(const tree of trees){tick();if(tree.kind==='token'&&['#','macro_rules','macro','use','mod','extern','fn'].includes(tree.text))return true;if(tree.kind==='group'&&unsafe(tree.children))return true;}return false;}
   if(unsafe(group.children)){refusal(module,item,'Function-local declarations, attributes or imports need an independent source/hygiene rule');return;}
   function visit(trees,depth=0){need(depth<=64,'body delimiter depth bound');for(let at=0;at<trees.length;at++){
    tick();const tree=trees[at];let end=at+1;
    if(tree.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text)){
     while(trees[end]?.text==='::'&&trees[end+1]?.kind==='token')end+=2;
     if(trees[end]?.text==='!'&&trees[end+1]?.kind==='group'){
      const span={start:item.start+tree.span.start,end:item.start+trees[end+1].span.end},before=module.source.slice(span.start,span.end);
      try{
       need(++calls<=128,'body expansion call bound');need(end===at+1&&trees[at-1]?.text!=='::','only unqualified original body invocation supported');
       const selected=visible.get(tree.text);need(selected,'no complete original textual candidate');const invocation=originalMacroInvocation(before);need(invocation.path.length===1&&invocation.path[0]===tree.text,'exact original invocation membership');
       const proof=engine.expandDeclarativeMacro(selected,invocation.trees);engine.declarativeExpansionOriginalInput(proof,invocation.trees);const rendered=engine.renderLocalDeclarativeExpansion(proof,name=>visible.get(name)??null);
       renderedBytes+=Buffer.byteLength(rendered.source);need(renderedBytes<=4194304,'complete rendered body source bound');
       const captured=new Set();function names(trees,target){for(const tree of trees){tick();if(tree.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text))target.add(tree.text);if(tree.kind==='group')names(tree.children,target);}}names(invocation.trees,captured);const outputNames=new Set();names(originalMacroTrees(rendered.source),outputNames);need([...outputNames].every(name=>captured.has(name)||name==='true'||name==='false'),'introduced body identifiers require independent definition-site hygiene proof');
       // Selection and actual raw invocation remain inside this operation. No
       // callable/token escapes that could outlive original source closing.
       edits.push({sourcePath:module.file,module:module.path,span,before,after:rendered.source,invocation,expansion:rendered});
      }catch(error){if(!(error instanceof TypeError))throw error;refusal(module,item,error.message);}at=end+1;continue;
     }
    }
    if(tree.kind==='group')visit(tree.children,depth+1);
   }}visit(group.children);
  }
  const active=new Set();function visit(module,inherited,depth=0){
   need(depth<=64&&!active.has(module),'acyclic complete module traversal required');active.add(module);const visible=new Map(inherited);
   try{for(const item of originalModuleViewItems(module.sourceView,module.source)){
    tick();if(item.term==='fn'){if(closed)body(module,item,visible);else refusal(module,item,'Original producer/import/modularized namespace closure remains unsupported');continue;}
    const definition=predecessor.definitions.find(row=>row.sourcePath===module.file&&JSON.stringify(row.module)===JSON.stringify(module.path)&&row.span.start===item.start&&row.span.end===item.end);
    if(definition){visible.set(definition.name,engine.compileDeclarativeMacro(module.source.slice(item.start,item.end),{name:definition.name,owner:['crate',...module.path]}));continue;}
    if(item.term==='mod'){
     const edges=predecessor.originalGraph.edges.filter(edge=>edge.from===module.file&&JSON.stringify(edge.module.slice(0,-1))===JSON.stringify(module.path)&&(edge.span??edge.pathSelection?.span)?.start===item.start&&(edge.span??edge.pathSelection?.span)?.end===item.end);need(edges.length===1,'unique genuine module edge required');const edge=edges[0],child=byPath.get(JSON.stringify(edge.module));need(child&&child.file===edge.to,'actual original child source/view join');const result=visit(child,visible,depth+1);
     const words=item.tokens.filter(token=>token.type!=='comment');if(words[0]?.text==='#'&&words[2]?.text==='macro_use'){visible.clear();for(const [name,value]of result)visible.set(name,value);}continue;
    }
   }return visible;}finally{active.delete(module);}
  }
  const root=byPath.get('[]');need(root&&root.file===entry,'complete actual root required');visit(root,new Map());if(refusals.length)edits.length=0;current();return edits;
 })},{id:'language:whole-physical-CST-source-equations-and-complete-expanded-check',apply:()=>{
  files=validate(()=>{const rows=[];for(const [sourcePath,before]of originals){const prior=predecessor.files.find(row=>row.sourcePath===sourcePath);need(prior&&prior.before===before,'whole predecessor original join');const selected=[...prior.edits,...edits.filter(row=>row.sourcePath===sourcePath)].sort((a,b)=>a.span.start-b.span.start);let last=0,after=before;for(const row of selected){need(row.span.start>=last&&before.slice(row.span.start,row.span.end)===row.before,'unique nonoverlapping actual original invocation');last=row.span.end;}for(const row of [...selected].reverse())after=after.slice(0,row.span.start)+row.after+after.slice(row.span.end);need(Buffer.byteLength(after)<=2097152,'expanded physical byte bound');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===before,'complete physical inverse');rows.push({sourcePath,before,after,history});}return rows;});current();
  if(!compile)return null;
  const expanded={...input,entry,paths,readSource:name=>{const row=files.find(row=>row.sourcePath===name);return validate(()=>{need(row,'uncaptured expanded source');return row.after;});}};
  const compiled=translateProjectWithFlatEnclosingSemanticMeta(expanded);
  if(requested){validate(()=>need(refusals.length===0&&predecessor.refusals.length===0,'inverse requires complete supported source proposal'));inverse=proposeForwardExpressionSynchronization({...expanded,...requested});current();}
  return compiled;
 }}]},
 {phase:'repository',rules:[{id:'repository:retain-original-refusals-and-expanded-source-domain',apply:compiled=>{
  current();const pairedTargetCST=compile?transportConcreteSourceEquations([{before:compiled.javascript,after:compiled.javascript,language:'JavaScript'},{before:compiled.typescript,after:compiled.typescript,language:'TypeScript'}]):null;
  const sourceExpansion={pairedTargetCST,schema:'scoped-output-binding-20261101-v1',files,predecessor,edits,refusals,compilerSourceDomain:'expanded-source',originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,productionOutputExecutable:false,receivingExecuted:false,semanticReverse:inverse??{status:'unsupported-without-explicit-target-edit',nativeRustGrammarChecked:false,originalMacroArgumentOrDefinitionInverse:false}};
  const result=compile?{...compiled,sourceExpansion}:{sourceExpansion};accountData(compile?{meta:result.meta,javascript:result.javascript,typescript:result.typescript,sourceExpansion}:result);return result;
 }}]},
 ]).run(null);current();const returned={...run.value,sourceExpansion:{...run.value.sourceExpansion,ruleTrace:run.trace}};accountData(compile?{meta:returned.meta,javascript:returned.javascript,typescript:returned.typescript,sourceExpansion:returned.sourceExpansion}:returned);return returned;
 },[()=>{if(input&&profileText!==undefined)current();}]);
});}
export function proposeScopedOutputBindingSources(options){return operation(options,false);}
export function translateScopedOutputBindingProject(options){return operation(options,true);}

// A separately requested target edit inverse checks the EXPANDED whole project.
// It cannot map edits back to original macro arguments or declarations.
export function synchronizeScopedOutputBindingExpandedProject(options,target){
 const requested=validate(()=>own(target,['javascript','typescript']));
 validate(()=>need(Object.keys(requested).length===1&&typeof Object.values(requested)[0]==='string'&&Buffer.byteLength(Object.values(requested)[0])<=2097152,'one bounded actual emitted target edit required'));
 return operation(options,true,requested);
}
