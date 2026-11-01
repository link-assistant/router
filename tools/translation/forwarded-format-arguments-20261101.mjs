// Actual original leaf/parser custody only; no formatting or output admission.
import {types} from 'node:util';
import {createForwardedFormatArgumentsEngine} from './forwarded-format-arguments-20261101-engine.mjs';
import {originalMacroInvocation,originalMacroTrees} from './macro-token-trees.mjs';
import {originalMacroLiteralGrammar} from './macro-literal-source.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {createOriginalMacroFragmentContext,parseOriginalMacroFragment,originalMacroFragmentAst} from './source-macro-fragments.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const frames=new WeakMap(),need=(value,message)=>{if(!value)throw new TypeError('Forwarded format arguments: '+message);};
const validate=run=>withSourceInputValidation(run);
function fields(value,allowed){
 need(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype,'ordinary input required');const result={};
 for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);need(typeof key==='string'&&allowed.includes(key)&&descriptor&&Object.hasOwn(descriptor,'value'),'unknown or accessor input');result[key]=descriptor.value;}return result;
}
const path=value=>{need(typeof value==='string'&&value.endsWith('.rs')&&!value.includes('\\')&&!value.includes('\0')&&!value.includes(':')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical complete Rust owner path required');return value;};
function rawInvocation(source,module,span){
 const items=originalModuleViewItems(module,source).filter(item=>item.term==='fn'&&item.start<=span.start&&span.end<=item.end);if(items.length!==1)return null;
 const item=items[0],fragment=source.slice(item.start,item.end),trees=originalMacroTrees(fragment),body=trees.at(-1);need(body?.kind==='group'&&body.delimiter==='{','complete actual function body required');let matches=0,cells=0;
 function visit(trees,depth=0){need(depth<=64,'raw invocation depth bound');for(let at=0;at<trees.length;at++){
  need(++cells<=32000,'raw invocation tree-cell bound');const tree=trees[at];let end=at+1;
  if(tree.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text)){
   while(trees[end]?.text==='::'&&trees[end+1]?.kind==='token')end+=2;
   if(trees[end]?.text==='!'&&trees[end+1]?.kind==='group'){
    if(item.start+tree.span.start===span.start&&item.start+trees[end+1].span.end===span.end)matches++;
    // Original nested invocations are independent raw source occurrences.
    visit(trees[end+1].children,depth+1);at=end+1;continue;
   }
  }
  if(tree.kind==='group')visit(tree.children,depth+1);
 }}visit(body.children);return matches===1?item:null;
}
/** A callback may inspect a transient custody request. It cannot issue a permit. */
export function withForwardedFormatArgumentsCustody(options,run){return withSourceFailureOperation(()=>{
 requireSynchronousSourceCallback(run);const retained=new Map();let input,parser,context,rootInput,engine,proof,occurrence,sourceStart,views,definitionViews,sourceEquations,owner;
 const current=()=>validate(()=>{
  let failed=false,error;for(const [name,source]of retained)try{need(input.readSource(name)===source,'complete original changed: '+name);}catch(thrown){if(!failed){failed=true;error=thrown;}}
  try{if(context){createOriginalMacroFragmentContext(parser,rootInput,{sourceStart,modulePath:owner.view.modulePath});need(capturedRustTokenSource(parser.cursor.tokens)?.source===retained.get(input.callerPath),'complete genuine parser source changed');}}catch(thrown){if(!failed){failed=true;error=thrown;}}
  if(failed)throw error;
 });
 return withCompleteSourceClosingFence(()=>{
  validate(()=>{
   input=fields(options,['callerPath','definitionPath','definitionName','macroSpan','parser','readSource','nestedIndex']);input.callerPath=path(input.callerPath);input.definitionPath=path(input.definitionPath);need(input.callerPath!==input.definitionPath,'distinct complete caller and declaration owners required');need(typeof input.readSource==='function'&&!types.isProxy(input.readSource),'ordinary complete source reader required');
   need(typeof input.definitionName==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(input.definitionName),'plain declaration selection required');const span=fields(input.macroSpan,['start','end']);need(Object.keys(span).length===2&&Number.isSafeInteger(span.start)&&Number.isSafeInteger(span.end)&&span.start>=0&&span.end>span.start,'exact raw original invocation span required');input.macroSpan=span;
   let bytes=0;for(const name of [input.callerPath,input.definitionPath]){const source=input.readSource(name);need(typeof source==='string','primitive complete original required');retained.set(name,source);need(source.length<=2097152&&Buffer.byteLength(source)<=2097152&&!/\p{Surrogate}/u.test(source),'bounded original UTF8 owner required');bytes+=Buffer.byteLength(source);need(bytes<=4194304,'whole owner byte bound');}
   const source=retained.get(input.callerPath);need(span.end<=source.length,'original span outside caller');parser=input.parser;
   views=captureSourceModuleViews({source,sourcePath:input.callerPath});const found=views.views.map(view=>({view,item:rawInvocation(source,view,span)})).filter(row=>row.item);need(found.length===1,'one actual original function/raw invocation membership required');owner=found[0];need(owner.view.configurationCondition==='active'&&owner.item.tokens[0]?.text!=='#','conditional or attributed original caller requires independent producer closure');
   const original=source.slice(span.start,span.end),invocation=originalMacroInvocation(original);need(invocation.path.length===1&&invocation.path[0]===input.definitionName,'qualified or differently written invocation unsupported; this is not owner resolution');rootInput=invocation.trees;sourceStart=span.start;context=createOriginalMacroFragmentContext(parser,rootInput,{sourceStart,modulePath:owner.view.modulePath});need(capturedRustTokenSource(parser.cursor.tokens)?.source===source,'actual original complete parser source required');
   definitionViews=captureSourceModuleViews({source:retained.get(input.definitionPath),sourcePath:input.definitionPath});const roots=definitionViews.views.filter(view=>view.modulePath.length===0);need(roots.length===1&&roots[0].configurationCondition==='active','one actual original definition file root view required');
   engine=createForwardedFormatArgumentsEngine(null,originalMacroLiteralGrammar());const definition=engine.compileDeclarativeMacro(retained.get(input.definitionPath),{name:input.definitionName,owner:['crate',...roots[0].modulePath]});const header=engine.declarativeDefinitionHeader(definition);need(header.kind==='macro_rules'&&header.visibility===null&&header.attributes.length===0,'attributed/conditional/public definition requires separate original scope closure');proof=engine.expandDeclarativeMacro(definition,rootInput);engine.declarativeExpansionOriginalInput(proof,rootInput);
   const nested=engine.declarativeNestedMacroInvocations(proof),index=input.nestedIndex??0;need(Number.isSafeInteger(index)&&index>=0&&index<nested.length,'actual private nested occurrence selection required');occurrence=nested[index];
   sourceEquations=transportConcreteSourceEquations([...retained.values()].map(source=>({before:source,after:source,language:'Rust'})));
  });current();
  return engine.withDeclarativeForwardedLiteralCustody(proof,rootInput,occurrence,engineToken=>{
   const token=Object.freeze({schema:'operation-local-forwarded-format-arguments-v1'});frames.set(token,{engine,engineToken,parser,context,rootInput,sourceStart,current,views,definitionViews,sourceEquations,owner,input,retained});
   try{return withCompleteSourceClosingFence(()=>run(token),[()=>{forwardedFormatArgumentsCustodyFacts(token);current();}]);}finally{frames.delete(token);}
  });
 },[()=>{if(input&&typeof input.readSource==='function')current();}]);
});}
export function forwardedFormatArgumentsCustodyFacts(token){return validate(()=>{
 const state=frames.get(token);need(state,'expired, copied or foreign custody request');state.current();const {engine,engineToken,parser,context,rootInput}=state,leafCustody=engine.declarativeForwardedLiteralCustodyFacts(engineToken);let originalLiteral=null;
 if(rootInput.length){const parsed=parseOriginalMacroFragment(context,'expr',rootInput,0);need(parsed.end===rootInput.length,'one unchanged complete original expression required');const ast=originalMacroFragmentAst(context,parsed.capture);need(ast.k==='lit'&&typeof ast.value==='string','only original string literal AST custody supported');need(!/[{}]/u.test(ast.value),'template captures/brace semantics require separate original format parsing');originalLiteral={span:{...parsed.capture.span},ast:structuredClone(ast)};}
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'language:same-engine-original-forwarded-leaves-and-genuine-original-literal-AST',apply:()=>({leafCustody,originalLiteral,sourceEquations:state.sourceEquations,originalViews:state.views,originalDefinitionViews:state.definitionViews,originalFunction:{path:state.input.callerPath,module:state.owner.view.modulePath,source:state.retained.get(state.input.callerPath),span:{start:state.owner.item.start,end:state.owner.item.end}}})}]},
  {phase:'repository',rules:[{id:'repository:retain-definition-origin-and-unsupported-format-Arguments-owner-transport',apply:data=>({...data,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,macroOwnerResolved:false,definitionSiteBindingsResolved:false,mixedSiteHygieneResolved:false,builtinFormatArgsOwnerResolved:false,implicitCaptureNamesResolved:false,evaluationOrderVerified:false,argumentsConstructed:false,borrowLifetimeVerified:false,transportAdmitted:false,originalSourceEquivalenceQualified:false,pairedTargetLane:'unsupported-custody-only',semanticReverseLane:'unsupported-custody-only',receivingExecuted:false})}]},
 ]).run(null);state.current();accountData(result);return result;
});}
export function captureForwardedFormatArgumentsCustody(options){return withForwardedFormatArgumentsCustody(options,forwardedFormatArgumentsCustodyFacts);}
