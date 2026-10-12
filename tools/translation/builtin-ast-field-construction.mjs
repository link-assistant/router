// Source-qualified generic FieldInfo construction and its actual callback slots.
// No field-access Rust template, generated impl, or namespace grant is emitted.
import {createHash} from 'node:crypto';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule} from './derive-footprints.mjs';
import {planBuiltinDeriveBangOutput} from './builtin-derive-bang-footprints.mjs';
import {boundedInput} from './serde-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction,originalAstDefinition} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstSourceSubstitution} from './builtin-ast-source-substitution.mjs';
import {createBuiltinVecRemoveSourcePlan} from './builtin-vec-remove-plan.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakMap();
const generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs';
export function createBuiltinDeriveFieldAstBridge({context,certificate,invocation}={}){
  const plan=planBuiltinDeriveBangOutput({context,certificate,invocation}),original=deriveFootprintOriginalContext(context,certificate),module=deriveFootprintOriginalModule(context,certificate);
  const text=module.source.slice(certificate.span.start,certificate.span.end);
  if(hash(text)!==certificate.itemSha256)throw new TypeError('Field AST bridge original declaration bytes changed');
  const input=boundedInput(certificate,text,null),profile=builtinDeriveAstSourceProfile(original.dependencies),stage=createBuiltinAstSourceSubstitution(profile);
  const fieldSchema=originalAstDefinition(profile,generic,'struct','FieldInfo');
  // These are exact original generator entry points, not an output name switch.
  // Both access and pattern routes stay present; neither is chosen by field shape.
  const routes=['create_fields','create_struct_field_access_fields','create_struct_pattern_fields'].map(name=>{
    const fragment=originalAstFunction(profile,generic,name),program=stage.compile(fragment),result=stage.substitute(program);
    return {fragment:{source:fragment.source,sourceSha256:fragment.sourceSha256,span:fragment.span,digest:fragment.digest},program,result};
  });
  function matching(root,predicate){
    const found=[];let visited=0;
    function walk(value,depth=0){if(++visited>16000||depth>64)throw new TypeError('Field closure matching budget exceeded');if(!value||typeof value!=='object')return;if(predicate(value))found.push(value);for(const [key,child]of Object.entries(value))if(!['syntax','schema','recipe','import','typeSyntax','sourceBinding','original'].includes(key))if(Array.isArray(child))child.forEach(value=>walk(value,depth+1));else walk(child,depth+1);}
    walk(root);return found;
  }
  const fieldProgram=routes[0].program;
  const closureApplications=routes.slice(1).map(route=>{
    const sites=matching(route.program.tree,value=>value.tag==='open-source-expression'&&value.kind==='source-method-call'&&value.method==='create_fields');
    if(sites.length!==1)throw new TypeError('Original generic create_fields source call is not unique');
    return stage.applyClosure(route.program,fieldProgram,sites[0].span.start);
  });
  const removals=matching({tree:fieldProgram.tree,initializers:fieldProgram.slots.map(value=>value.value).filter(Boolean)},value=>value.tag==='open-source-expression'&&value.kind==='source-method-call'&&value.method==='remove');
  if(removals.length!==1)throw new TypeError('Original generic field removal source call is not unique');
  const removal=removals[0],removePlan=createBuiltinVecRemoveSourcePlan(profile);
  const removeBridge={sourceCall:{source:removal.source,sourceSha256:removal.sourceSha256,span:removal.span,syntax:removal.syntax},receiver:removal.receiver,arguments:removal.args,originalPlan:removePlan,methodOwnershipEstablished:false,boundsEstablished:false,mutationEstablished:false};
  const rows=(input.fields??[]).map((field,index)=>({index,source:certificate.source,sourceSha256:certificate.sourceSha256,itemSha256:certificate.itemSha256,
    name:{spelling:field.name,span:{start:certificate.span.start+field.span.start,end:certificate.span.start+field.span.end}},
    type:{syntax:text.slice(field.typeSpan.start,field.typeSpan.end),span:{start:certificate.span.start+field.typeSpan.start,end:certificate.span.start+field.typeSpan.end}},
    bindingStatus:'original field tokens retained; conversion into compiler FieldDef/Ident/Span is not yet established'}));
  const evidence={schema:'original-generic-field-construction-meta-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,planDigest:plan.digest,profileDigest:profile.digest,compilationProfile:certificate.compilationProfile,
    originalInput:input,closureApplications,removeBridge,fieldSchema:{source:fieldSchema.source,sourceSha256:fieldSchema.sourceSha256,span:fieldSchema.span,digest:fieldSchema.digest,syntaxSha256:fieldSchema.syntaxSha256},rows,routes,
    callbackSources:plan.callbackRecipes.map(fragment=>({source:fragment.source,sourceSha256:fragment.sourceSha256,span:fragment.span,digest:fragment.digest})),
    selectedOwnerBangComplete:false,generatedImplBehavior:false,fieldAstInputEstablished:false,mutationControlEstablished:false,optionOwnerEstablished:false,allocationPhaseBehavior:false,featureCompleteness:false,
    obligations:['actual FieldDef/Ident/Span input conversion and hygiene remain open','mk_exprs lexical application is retained; Fn/type owners, ordered selflike inputs and remove(0) bounds remain open','packed field mutation/control selection and unproved pattern bindings remain open','Option/prelude and empty ThinVec/attribute ownership remain open','local named functions do not gain enclosing captures','original callbacks/method bodies and every resolver branch must be joined separately']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Field AST bridge metadata byte budget exceeded');
  const copy=JSON.parse(encoded);if(JSON.stringify(copy)!==encoded)throw new TypeError('Field AST bridge semantic roundtrip changed');
  const result=freeze({...copy,digest:hash(encoded)});proofs.set(result,{context,certificate,invocation:freeze(JSON.parse(JSON.stringify(invocation)))});return result;
}
export function assertBuiltinDeriveFieldAstBridge(value,context,certificate,invocation){const state=proofs.get(value);if(!state||state.context!==context||state.certificate!==certificate||JSON.stringify(state.invocation)!==JSON.stringify(invocation))throw new TypeError('Field AST bridge requires its original private invocation');return value;}
export const isBuiltinDeriveFieldAstBridge=value=>!!value&&proofs.has(value);
