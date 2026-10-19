// Language rule: positive complete output grammar + original Rust resolver
// namespace actions. Repository order merely supplies each genuine invocation.
import {types} from 'node:util';
import {originalDeriveBangEnclosingOutputs,deriveBangOutputAt} from './derive-bang-context.mjs';
import {originalImplNamespaceSourcePlan,requireOriginalImplNamespaceSourcePlan} from './derive-ancestor-attribute-scope.mjs';
import {moduleScopeKey} from './source-module-views.mjs';
import {deriveFootprintAt,deriveFootprintStandardInputSource} from './derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint,originalBuiltinDeriveEnclosingOutput} from './builtin-derive-bang-footprints.mjs';

export const DERIVE_EMPTY_ENCLOSING_EFFECT_RULE=Object.freeze({
 id:'rust.original-complete-derived-enclosing-name-effect.v1',
 languageOrder:Object.freeze(['actual-original-reduced-graph-namespace-actions','private-complete-output-and-generated-owner-joins','all-retained-output-alternatives','enclosing-name-effect']),
 prerequisites:Object.freeze(['exact original invocation and complete owner set','complete recursive associated/body/type grammar','every generated attribute and nested macro owner','every retained cfg/feature branch']),
 repositoryOrder:Object.freeze(['fresh complete original module graph','genuine derive input context','genuine derive bang context','per-item effect consumer']),
 runtimeAuthority:false,
});
const issued=new WeakMap(),requests=new WeakMap(),fail=message=>{throw new TypeError('Original derive name effect: '+message);};
const word=node=>node?.tag==='token'?node.text:null;

// This is only an enclosing-item shape check over a private complete quote
// output, not a replacement Rust/body parser. Its existing issuer independently
// closes every nested bang/attribute and typed splice throughout the full body.
function quoteRoots(nodes,budget){
 const roots=[];let at=0;
 const count=()=>{if(++budget.cells>32000)fail('complete output effect cell bound');};
 function trees(items,depth=0){
  if(depth>64)fail('complete output effect depth bound');
  for(const node of items){count();if(node.tag==='group')trees(node.nodes,depth+1);else if(node.tag!=='token')fail('opaque generated output node');}
 }
 trees(nodes);
 while(at<nodes.length){
  while(word(nodes[at])==='#'){
   if(nodes[at+1]?.tag!=='group'||nodes[at+1].delimiter!=='[')fail('unproved enclosing generated attribute');
   at+=2; // Actual inert owner was checked by the original full output issuer.
  }
  if(word(nodes[at])==='impl'){
   const start=at++;while(at<nodes.length&&!(nodes[at].tag==='group'&&nodes[at].delimiter==='{')){
    if([';','='].includes(word(nodes[at])))fail('incomplete enclosing Impl header');at++;
   }
   if(at===nodes.length)fail('incomplete enclosing Impl output');
   roots.push(Object.freeze({kind:'ItemKind::Impl',originalSyntax:Object.freeze(nodes.slice(start,++at))}));
  }else if(word(nodes[at])==='const'&&word(nodes[at+1])==='_'&&word(nodes[at+2])===':'&&nodes[at+3]?.tag==='group'&&nodes[at+3].delimiter==='('&&!nodes[at+3].nodes.length&&word(nodes[at+4])==='='&&nodes[at+5]?.tag==='group'&&nodes[at+5].delimiter==='{'&&word(nodes[at+6])===';'){
   roots.push(Object.freeze({kind:'ItemKind::Const',identifier:'_',originalSyntax:Object.freeze(nodes.slice(at,at+7))}));at+=7;
  }else fail('enclosing item remains outside the complete Impl/anonymous-const grammar');
 }
 if(!roots.length)fail('missing complete generated enclosing item');return Object.freeze(roots);
}

export function proveDeriveEmptyEnclosingEffect(context,deriveContext,module,item){
 const original=originalDeriveBangEnclosingOutputs(context,deriveContext,module,item),sourcePlan=requireOriginalImplNamespaceSourcePlan(originalImplNamespaceSourcePlan()),budget={cells:0},alternatives=[];
 if(original.outputs.length>256)fail('complete retained output alternative bound');
 for(const row of original.outputs){
  if(row.format==='builtin-impl'){
   // This fact exists only after full source reissue of the complete private
   // builtin grammar. Unknown/opaque associated bodies cannot manufacture it.
   if(row.output.sink.kind!=='ItemKind::Impl')fail('unproved builtin enclosing output');
   alternatives.push(Object.freeze({invocation:row.invocation,kind:'ItemKind::Impl',originalCompleteOutput:row.output}));
  }else if(row.format==='quote')alternatives.push(Object.freeze({invocation:row.invocation,roots:quoteRoots(row.syntax,budget),originalCompleteOwnerProof:row.proof}));
  else fail('unproved complete output domain');
 }
 if(!alternatives.length)fail('missing original output alternatives');
 const token=Object.freeze({schema:'private-empty-derived-enclosing-name-effect-v1'});
 issued.set(token,Object.freeze({context,deriveContext,moduleKey:moduleScopeKey(module),source:module.source,sourceView:module.sourceView,itemStart:item.start,itemEnd:item.end,certificate:original.certificate,sourcePlan,rule:DERIVE_EMPTY_ENCLOSING_EFFECT_RULE,alternatives:Object.freeze(alternatives),enclosingTypeBindings:Object.freeze([]),enclosingUsableValueBindings:Object.freeze([]),cells:budget.cells,runtimeAuthority:false}));return token;
}
export function deriveEmptyEnclosingEffectFacts(token,context,deriveContext,module,item){
 const state=issued.get(token);
 if(!state||state.context!==context||state.deriveContext!==deriveContext||state.moduleKey!==moduleScopeKey(module)||state.source!==module.source||state.sourceView!==module.sourceView||state.itemStart!==item.start||state.itemEnd!==item.end)fail('copied, foreign or changed invocation effect');
 if(deriveBangOutputAt(context,deriveContext,module,item)!==state.certificate)fail('original output invocation changed');
 requireOriginalImplNamespaceSourcePlan(state.sourcePlan);return state;
}

function requestedNames(value){
 if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary requested-name array required');
 const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>128||Reflect.ownKeys(fields).length!==length.value+1)fail('bounded dense requested-name array required');
 const result=[];
 for(let at=0;at<length.value;at++){
  if(!Object.hasOwn(fields,String(at))||!Object.hasOwn(fields[at],'value'))fail('requested-name hole/accessor');
  const row=fields[at].value;if(!row||types.isProxy(row)||Object.getPrototypeOf(row)!==Object.prototype)fail('ordinary requested-name data required');
  const keys=Object.getOwnPropertyDescriptors(row);
  if(Reflect.ownKeys(keys).length!==2||!Object.hasOwn(keys,'namespace')||!Object.hasOwn(keys,'name')||!Object.hasOwn(keys.namespace,'value')||!Object.hasOwn(keys.name,'value'))fail('requested-name fields differ');
  const namespace=keys.namespace.value,name=keys.name.value;
  if(!['type','value'].includes(namespace)||typeof name!=='string'||name==='_'||name.length>128||!/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u.test(name))fail('requested usable type/value name required');
  result.push(Object.freeze({namespace,name}));
 }
 return Object.freeze(result);
}
export function proveDeriveRequestedNameUnchanged(token,context,deriveContext,module,item,names){
 const state=deriveEmptyEnclosingEffectFacts(token,context,deriveContext,module,item),selected=requestedNames(names),proof=Object.freeze({schema:'private-requested-derived-name-effect-v1'});
 requests.set(proof,Object.freeze({effect:token,requests:selected,state,namespaceAuthority:false,runtimeAuthority:false}));return proof;
}
export function deriveRequestedNameEffectFacts(proof,token,context,deriveContext,module,item){
 const state=requests.get(proof);if(!state||state.effect!==token||deriveEmptyEnclosingEffectFacts(token,context,deriveContext,module,item)!==state.state)fail('copied or foreign requested-name proof');return state;
}

// Fixed per-invocation lane: every actual owner is independently reissued.
// This avoids constructing an unrelated whole-package bang context; it does
// not bypass original input/ancestor/generated-attribute owner validation.
function builtinEnclosingEffects(deriveContext,module,item){
 const certificate=deriveFootprintAt(deriveContext,module,item);
 if(!certificate)fail('genuine current original derive input required');
 const original=deriveFootprintStandardInputSource(deriveContext,certificate);
 if(moduleScopeKey(original.module)!==moduleScopeKey(module)||original.module.source!==module.source||original.module.sourceView!==module.sourceView)fail('builtin effect module differs from its private original input');
 const invocations=certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
 if(!invocations.length||invocations.length>256||invocations.length!==original.input.derives.length)fail('complete bounded original builtin owner list required');
 const alternatives=[];
 for(let at=0;at<invocations.length;at++){
  const invocation=invocations[at],actual=original.input.derives[at];
  if(invocation.path.length!==1||actual.path.length!==1||invocation.path[0]!==actual.path[0]||invocation.attributeSpan.start!==actual.attributeSpan.start||invocation.attributeSpan.end!==actual.attributeSpan.end)fail('builtin owner order or actual invocation changed');
  const proof=proveBuiltinDeriveBangFootprint({context:deriveContext,certificate,invocation}),output=originalBuiltinDeriveEnclosingOutput(proof,deriveContext,certificate,invocation);
  if(output.sink.kind!=='ItemKind::Impl')fail('actual complete builtin output is not an Impl sink');
  alternatives.push(Object.freeze({invocation,kind:'ItemKind::Impl',originalCompleteOutput:output}));
 }
 if(deriveFootprintAt(deriveContext,module,item)!==certificate)fail('original invocation changed during complete output reissue');
 return {certificate,sourcePlan:requireOriginalImplNamespaceSourcePlan(originalImplNamespaceSourcePlan()),alternatives:Object.freeze(alternatives)};
}
export function proveBuiltinDeriveEmptyEnclosingEffect(deriveContext,module,item){
 const original=builtinEnclosingEffects(deriveContext,module,item),token=Object.freeze({schema:'private-builtin-empty-derived-enclosing-name-effect-v1'});
 issued.set(token,Object.freeze({builtinOnly:true,deriveContext,moduleKey:moduleScopeKey(module),source:module.source,sourceView:module.sourceView,itemStart:item.start,itemEnd:item.end,...original,enclosingTypeBindings:Object.freeze([]),enclosingUsableValueBindings:Object.freeze([]),runtimeAuthority:false}));return token;
}
export function builtinDeriveEmptyEnclosingEffectFacts(token,deriveContext,module,item){
 const state=issued.get(token);
 if(!state?.builtinOnly||state.deriveContext!==deriveContext||state.moduleKey!==moduleScopeKey(module)||state.source!==module.source||state.sourceView!==module.sourceView||state.itemStart!==item.start||state.itemEnd!==item.end)fail('copied, foreign or changed builtin invocation effect');
 const current=builtinEnclosingEffects(deriveContext,module,item);
 if(current.certificate!==state.certificate)fail('current original builtin input differs');
 requireOriginalImplNamespaceSourcePlan(state.sourcePlan);
 return Object.freeze({...state,alternatives:current.alternatives});
}
