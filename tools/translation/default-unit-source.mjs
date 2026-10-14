// The original compiler's unit Default path, joined to its original invocation.
// This source selection grants no runtime, ownership or const authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {assertDefaultCaller} from './default-trait-source.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {deriveFootprintAt} from './derive-footprints.mjs';
import {originalBuiltinDefaultBangOutput} from './builtin-derive-bang-footprints.mjs';
import {validateBuiltinDefaultAstOutput} from './builtin-default-ast-route.mjs';
import {astSyntaxText} from './builtin-derive-ast-meta.mjs';
import {extractImplDeclarations} from './impl-resolver.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget} from './project-nominal.mjs';

const proofs=new WeakMap(),coherence=new WeakMap(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original unit Default source: '+message);};
function writtenDefaultFamilies(context,state){
 let result=coherence.get(context);if(result)return result;
 // Genuine contexts privately retain deeply frozen original modules and
 // bindings. Resolve the complete written implementation set once per
 // context; no caller-supplied identity or source digest can address this cache.
 const identities=nominalTypeIdentities(state.binding.scopes,state.modules),families=new Set();let unresolved=false;
 for(const owner of state.modules){
  const extracted=extractImplDeclarations(owner.source,{sourcePath:owner.file,modulePath:owner.path,sourceView:owner.sourceView,compilationProfile:state.compilationProfile});
  for(const implementation of extracted.implementations){
   if(!implementation.methods.some(method=>method.name==='default'))continue;
   const target=resolveNominalImplTarget(implementation,{...owner,items:originalSourceModuleItems(owner)},state.binding.scopes,identities);
   if(!target)unresolved=true;else families.add(JSON.stringify(target.family));
  }
 }
 result={unresolved,families};coherence.set(context,result);return result;
}
export function originalUnitDefaultSource(context,module,item){
 if(types.isProxy(module)||types.isProxy(item))fail('requires plain original source descriptors');
 const {state,original}=assertDefaultCaller(context,module);
 const actual=originalSourceModuleItems(original).find(value=>value.start===item.start&&value.end===item.end);
 if(!actual||actual.term!=='enum'||actual.name!==item.name||!same(actual.tokens,item.tokens))fail('requires its exact original enum declaration');
 const written=writtenDefaultFamilies(context,state),family=['crate',...original.path,actual.name];
 if(written.unresolved||written.families.has(JSON.stringify(family)))fail('written default method has an unresolved or overlapping actual nominal target');
 const certificate=deriveFootprintAt(state.deriveContext,original,actual);
 if(!certificate)fail('requires its genuine original derive invocation');
 const invocations=certificate.attributes.filter(value=>value.name==='derive').flatMap(value=>value.derives.map(path=>({path,attributeSpan:value.span}))).filter(value=>same(value.path,['Default']));
 if(invocations.length!==1)fail('requires one actual original Default invocation');
 const {proof,route,output,plan}=originalBuiltinDefaultBangOutput({context:state.deriveContext,certificate,invocation:invocations[0]});
 validateBuiltinDefaultAstOutput(route,output);
 const selected=route.typedSource.selectedVariant,method=output.items?.[0],body=method?.body,expression=body?.statements?.[0]?.expr;
 if(route.typedSource.inputSyntax.style!=='unit-enum'||!selected||output.items.length!==1||method.name!=='default'||method.parameters.length||body.statements.length!==1||expression?.slots?.qself!==null||!same(expression.slots.path?.segments,['Self',selected.variant.name]))fail('original unit Default path differs');
 for(const [name,expected] of [['name','kw :: Default'],['ret_ty','Self_'],['explicit_self','false'],['nonself_args','Vec :: new ()']]){
  const field=plan.method.fields.find(value=>value.name===name);
  if(!field||astSyntaxText(field.expression)!==expected)fail('original MethodDef signature differs: '+name);
 }
 const evidence={schema:'original-unit-default-source-v1',source:original.file,sourceSha256:certificate.sourceSha256,itemSha256:certificate.itemSha256,span:certificate.span,
  typePath:['crate',...original.path,actual.name],selectedVariant:selected,sourceOutput:proof,originalOutput:output,
  originalCompilerPlanDigest:plan.digest,methodDescriptor:plan.method,namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,runtimeParity:false};
 const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(result,{context,module:original,item:actual,certificate,invocation:invocations[0]});return result;
}
export function assertOriginalUnitDefaultSource(proof,context,module,item){
 if(types.isProxy(module)||types.isProxy(item))fail('requires plain original source descriptors');
 const state=proofs.get(proof);
 if(!state||state.context!==context||state.module.sourceView!==module.sourceView||state.item.start!==item.start||state.item.end!==item.end)fail('proof is copied, foreign or rebound');
 const original=assertDefaultCaller(context,module);
 if(deriveFootprintAt(original.state.deriveContext,module,item)!==state.certificate)fail('original certificate differs');
 originalBuiltinDefaultBangOutput({context:original.state.deriveContext,certificate:state.certificate,invocation:state.invocation});return proof;
}
