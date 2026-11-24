// Select the original Copy branch for a closed unit enum. This source proof
// supplies no runtime, ownership or const authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {assertCloneCaller} from './clone-trait-source.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {deriveFootprintAt} from './derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from './builtin-derive-bang-footprints.mjs';
import {builtinCloneOriginalSourcePlan,validateBuiltinCloneAstOutput} from './builtin-clone-ast-route.mjs';
import {astSyntaxText} from './builtin-derive-ast-meta.mjs';

const proofs=new WeakMap(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original unit Clone source: '+message);};
export function originalUnitCloneSource(context,module,item){
  if(types.isProxy(module)||types.isProxy(item))fail('requires plain original source descriptors');
  const {state,original}=assertCloneCaller(context,module);
  const actual=originalSourceModuleItems(original).find(value=>value.start===item.start&&value.end===item.end);
  if(!actual||actual.term!=='enum'||actual.name!==item.name||!same(actual.tokens,item.tokens))fail('requires its exact original enum declaration');
  const certificate=deriveFootprintAt(state.deriveContext,original,actual);
  if(!certificate)fail('requires its genuine original derive invocation');
  const invocation=owner=>certificate.attributes.filter(value=>value.name==='derive').flatMap(value=>value.derives.map(path=>({path,attributeSpan:value.span}))).filter(value=>same(value.path,[owner]));
  const clones=invocation('Clone'),copies=invocation('Copy');
  if(clones.length!==1||copies.length!==1)fail('requires one actual Clone and Copy invocation');
  const bind=invocation=>{
    const proof=proveBuiltinDeriveBangFootprint({context:state.deriveContext,certificate,invocation});
    assertBuiltinDeriveBangFootprint(proof,state.deriveContext,certificate,invocation);
    if(proof.selectedOwnerBangComplete!==true)fail('original output remains incomplete');
    return proof;
  };
  const clone=bind(clones[0]),copy=bind(copies[0]),route=clone.route,input=clone.inputSyntax;
  if(clone.schema!=='builtin-clone-bang-output-v1'||input.style!=='unit-enum'||input.fields.length||!input.variants.length)fail('requires the complete original nonempty unit enum output');
  validateBuiltinCloneAstOutput(route,route.branches);
  const branches=route.branches.filter(value=>value.feature==='has_derive_copy=true');
  if(branches.length!==1)fail('original Copy branch is not unique');
  const branch=branches[0],method=branch.output?.items?.[0],body=method?.body,expression=body?.statements?.[0]?.expr;
  if(branch.output.items.length!==1||method.name!=='clone'||method.parameters.length!==1||body.statements.length!==1||body.typeOnlyStatements?.candidates.length!==0||expression?.slots?.op!=='Deref'||!same(expression.slots.e?.slots?.path?.segments,['self']))fail('original unit Copy dereference body differs');
  const plan=builtinCloneOriginalSourcePlan(route);
  for(const [name,expected] of [['name','sym :: clone'],['ret_ty','Self_'],['explicit_self','true'],['nonself_args','Vec :: new ()']]){
    const field=plan.method.fields.find(value=>value.name===name);
    if(!field||astSyntaxText(field.expression)!==expected)fail('original method descriptor differs: '+name);
  }
  const evidence={schema:'original-unit-clone-source-v1',source:original.file,sourceSha256:certificate.sourceSha256,itemSha256:certificate.itemSha256,span:certificate.span,
    typePath:['crate',...original.path,actual.name],variants:input.variants,sourceOutput:clone,sourceCopyOutput:copy,selectedBranch:branch,
    originalCompilerPlanDigest:plan.digest,methodDescriptor:plan.method,requiresPrivateCheckedCopyAndNoDrop:true,
    namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,runtimeParity:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});
  proofs.set(proof,{context,module:original,item:actual,certificate,clone,copy,clones,copies});
  return proof;
}
export function assertOriginalUnitCloneSource(proof,context,module,item){
  if(types.isProxy(module)||types.isProxy(item))fail('requires plain original source descriptors');
  const state=proofs.get(proof);
  if(!state||state.context!==context||state.module.sourceView!==module.sourceView||state.item.start!==item.start||state.item.end!==item.end)fail('proof is copied, foreign or rebound');
  const original=assertCloneCaller(context,module);
  deriveFootprintAt(original.state.deriveContext,module,item);
  for(const [output,invocation] of [[state.clone,state.clones[0]],[state.copy,state.copies[0]]])assertBuiltinDeriveBangFootprint(output,original.state.deriveContext,state.certificate,invocation);
  return proof;
}
