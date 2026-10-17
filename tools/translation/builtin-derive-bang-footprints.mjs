// Bounded actual builtin generator routes. Copy and Eq close source-selected associated
// list; callback-valued routes remain source-bearing obligations, not guesses.
import {createHash} from 'node:crypto';
import {createPrivateFrozenJsonCache,createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';
import {createCompletedDataFreezer} from './private-data-freeze.mjs';
import {originalBuiltinCopyOutputSyntax} from './builtin-copy-output-syntax.mjs';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule,deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof} from './derive-footprints.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {builtinDeriveDataInputs,builtinDebugDataInputs,builtinPayloadDataInputs} from './builtin-derive-data-inputs.mjs';
import {sourceItems} from './rust-structure.mjs';
import {liftBuiltinHashAstRoute} from './builtin-hash-ast-route.mjs';
import {liftBuiltinEqAstRoute} from './builtin-eq-ast-route.mjs';
import {liftBuiltinCloneAstRoute} from './builtin-clone-ast-route.mjs';
import {liftBuiltinDebugAstRoute} from './builtin-debug-ast-route.mjs';
import {liftBuiltinPartialEqAstRoute} from './builtin-partial-eq-ast-route.mjs';
import {liftBuiltinOrderingAstRoute} from './builtin-ordering-ast-route.mjs';
import {liftBuiltinDefaultAstRoute,builtinDefaultOriginalSourcePlan,originalBuiltinDefaultAstOutput} from './builtin-default-ast-route.mjs';
import {proveBuiltinScalarSourceOutput,assertBuiltinScalarSourceOutput} from './builtin-scalar-ast-route.mjs';
import {attributeOwners} from './serde-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText} from './builtin-derive-ast-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const freezeCompleted=createCompletedDataFreezer(freeze);
const originalJson=createPrivateFrozenJsonCache();
const composeJson=createPrivateFrozenJsonComposer();
const plans=new WeakMap(),proofs=new WeakMap();
const directory='compiler/rustc_builtin_macros/src/deriving/';
const routes=new Map([
  ['Copy',{path:'bounds.rs',entry:'expand_deriving_copy',callbackFunctions:[],branches:['empty methods and associated types; constness both outcomes']}],
  ['Clone',{path:'clone.rs',entry:'expand_deriving_clone',callbackFunctions:['cs_clone_simple','cs_clone'],branches:['resolver.has_derive_copy chooses simple/full','struct/enum/union dispatch (original input excludes union)','field-type assertions and deduplication']}],
  ['Default',{path:'default.rs',entry:'expand_deriving_default',callbackFunctions:['default_struct_substructure','default_call'],branches:['original named primitive fields have no parsed default expressions','enum/default-field/error routes remain independent']}],
  ['Debug',{path:'debug.rs',entry:'expand_deriving_debug',callbackFunctions:['show_substructure','show_fieldless_enum','expr_for_field'],branches:['FmtDebug None/Shallow/Full','all-fieldless special route','empty/<=5/>5 fields','last-field extra reference','named/tuple/unit layout']}],
  ['PartialEq',{path:'cmp/partial_eq.rs',entry:'expand_deriving_partial_eq',callbackFunctions:['get_substructure_equality_expr','get_field_equality_expr','peel_refs','wrap_block_expr'],branches:['fieldless enum discrimination','struct/enum fields','short-circuit conjunction and value expression recipes']}],
  ['Eq',{path:'cmp/eq.rs',entry:'expand_deriving_eq',callbackFunctions:['cs_total_eq_assert'],branches:['static struct/enum field type assertions','type-name deduplication']}],
  ['Hash',{path:'hash.rs',entry:'expand_deriving_hash',callbackFunctions:['hash_substructure'],branches:['struct/matching enum','enum discriminant plus match','hash state argument and per-field call statements']}],
  ['Ord',{path:'cmp/ord.rs',entry:'expand_deriving_ord',callbackFunctions:['cs_cmp'],branches:['unit-enum Unify: one variant Fieldless; multiple variants discriminant Single','payload/Combine outputs remain outside the selected input domain']}],
  ['PartialOrd',{path:'cmp/partial_ord.rs',entry:'expand_deriving_partial_ord',callbackFunctions:['cs_partial_cmp'],branches:['actual zero dataful variants: discr_then_data=true','unit-enum Unify: one variant Fieldless; multiple variants discriminant Single']}],
]);
export const hasBuiltinDeriveBangRoute=name=>routes.has(name);
function originalInput(context,certificate,invocation){
  const original=deriveFootprintOriginalContext(context,certificate);
  const actual=certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
  if(!invocation||invocation.path.length!==1||!routes.has(invocation.path[0])||!actual.some(value=>JSON.stringify(value)===JSON.stringify(invocation)))throw new TypeError('Builtin output requires one exact original standard derive invocation');
  // This private input certificate checked standardOwner against actual macro
  // bindings; a bare name is not independently a builtin output certificate.
  const module=deriveFootprintOriginalModule(context,certificate);
  if(hash(module.source.slice(certificate.span.start,certificate.span.end))!==certificate.itemSha256)throw new TypeError('Builtin route original whole source/declaration changed');
  return {...original,context,module,invocation,name:invocation.path[0]};
}
export function planBuiltinDeriveBangOutput({context,certificate,invocation}={}){
  const original=originalInput(context,certificate,invocation),route=routes.get(original.name),profile=builtinDeriveAstSourceProfile(original.dependencies);
  const entry=originalAstFunction(profile,directory+route.path,route.entry),registry=builtinAstOriginal(profile,'compiler/rustc_builtin_macros/src/lib.rs');
  const prefix=route.path==='cmp/ord.rs'?'ord':route.path==='cmp/partial_ord.rs'?'partial_ord':route.path==='cmp/partial_eq.rs'?'partial_eq':route.path==='cmp/eq.rs'?'eq':route.path.slice(0,-3);
  const registered=original.name+': '+prefix+'::'+route.entry;
  const registrationStart=registry.source.indexOf(registered);
  if(registrationStart<0||registry.source.indexOf(registered,registrationStart+1)>=0)throw new TypeError('Builtin registry owner route is not unique');
  const callbackRecipes=route.callbackFunctions.map(name=>originalAstFunction(profile,directory+route.path,name));
  const evidence={schema:'builtin-derive-ast-output-plan-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:{target:['core',original.name],invocation,registration:{source:registry.path,sourceSha256:registry.sha256,span:{start:registrationStart,end:registrationStart+registered.length}}},profileDigest:profile.digest,entry,callbackRecipes,conditionalOutputs:route.branches,closed:false,generatedImplBehavior:false,obligations:original.name==='Copy'?['prove actual empty associated list and original generic ItemKind::Impl sink']:['typed callback expression/statement closure remains unproved','all original conditional output branches retained; no compiler-option assumptions']};
  const plan=freezeCompleted({...evidence,digest:hash(composeJson(evidence))});plans.set(plan,{original,profile,certificate,entry});return plan;
}
export const isBuiltinDeriveBangPlan=value=>!!value&&plans.has(value);
function proveCloneDataOutput(state,plan,context,certificate,invocation){
  const input=builtinPayloadDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      const declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Clone doc comment differs from the private source invocation');
      continue;
    }
    const actual=certificate.attributes.find(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end);if(!actual)throw new TypeError('Original Clone attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){
      const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Clone nested attribute requires its genuine active helper owner');helpers.push(proof);
    }
  }
  const route=liftBuiltinCloneAstRoute({...state,original:state.original,input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','coverage','Clone',...certificate.attributes.map(attribute=>attribute.name)]));
  const evidence={schema:'builtin-clone-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:input,originalHelperOwners:helpers,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyKind:'Block',recursivelyClosed:true},resolverBranches:['has_derive_copy=false','has_derive_copy=true'],constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['generated Clone field trait calls and Copy assertion validity remain uncompiled','all sibling derive owners and original ancestor scopes require separate closed output proofs','unsupported layouts/configuration/compiler errors remain refused']};
  const proof=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
function debugDataInput(state,context,certificate){
  const input=builtinDebugDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[],declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Debug doc comment differs from its private source invocation');continue;
    }
    if(!certificate.attributes.some(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end))throw new TypeError('Original Debug attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Debug nested attribute requires its genuine active helper owner');helpers.push(proof);}
  }return {input,helpers};
}
function partialEqDataInput(state,context,certificate){
  const input=builtinPayloadDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[],declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original PartialEq doc comment differs from its private source invocation');continue;
    }
    if(!certificate.attributes.some(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end))throw new TypeError('Original PartialEq attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original PartialEq nested attribute requires its genuine active helper owner');helpers.push(proof);}
  }return {input,helpers};
}
function proveDefaultDataOutput(state,plan,context,certificate,invocation){
  const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      const declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Default doc comment differs from the private source invocation');
      continue;
    }
    const actual=certificate.attributes.find(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end);if(!actual)throw new TypeError('Original Default attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){
      const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Default nested attribute requires its genuine active helper owner');helpers.push(proof);
    }
  }
  const route=liftBuiltinDefaultAstRoute({...state,original:state.original,input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','coverage','Default',...certificate.attributes.map(attribute=>attribute.name)]));
  const evidence={schema:'builtin-default-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:input,originalHelperOwners:helpers,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyKind:'Block',recursivelyClosed:true},visitorInputBranches:['actual named/no field defaults','actual single unit default word'],constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['generated Default field trait calls and trait implementation validity remain uncompiled','all sibling derive owners and original ancestor scopes require separate closed output proofs','unsupported layouts/configuration/compiler errors remain refused']};
  const proof=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
function proveHashDataOutput(state,plan,context,certificate,invocation){
  const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      const declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Hash doc comment differs from the private source invocation');
      continue;
    }
    const actual=certificate.attributes.find(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end);if(!actual)throw new TypeError('Original Hash attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){
      const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Hash nested attribute requires its genuine active helper owner');helpers.push(proof);
    }
  }
  const route=liftBuiltinHashAstRoute({...state,original:state.original,input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','coverage','Hash',...certificate.attributes.map(attribute=>attribute.name)]));
  const evidence={schema:'builtin-hash-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:input,originalHelperOwners:helpers,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyKind:'Block',recursivelyClosed:true},visitorInputBranches:['actual named/no field hashs','actual single unit hash word'],constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['Hash/Hasher trait validity, mutable reborrows and intrinsic execution remain uncompiled','all sibling derive owners and original ancestor scopes require separate closed output proofs','unsupported layouts/configuration/compiler errors remain refused']};
  const proof=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
export function proveBuiltinDeriveBangFootprint({context,certificate,invocation}={}){
  const plan=planBuiltinDeriveBangOutput({context,certificate,invocation}),state=plans.get(plan);
  if(['Clone','Debug','Default'].includes(state.original.name)){
    const input={dependencies:state.original.dependencies,source:state.original.module.source,span:certificate.span,owner:state.original.name};
    let route;try{route=assertBuiltinScalarSourceOutput(proveBuiltinScalarSourceOutput(input),input);}catch(error){
      if(state.original.name==='Clone')return proveCloneDataOutput(state,plan,context,certificate,invocation);
      if(state.original.name==='Default')return proveDefaultDataOutput(state,plan,context,certificate,invocation);
      if(state.original.name!=='Debug')throw new TypeError('Builtin '+state.original.name+' retains typed callback/conditional AST output obligations: '+error.message);
      const selected=debugDataInput(state,context,certificate),route=liftBuiltinDebugAstRoute({...state,original:state.original,input:selected.input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','Debug',...certificate.attributes.map(attribute=>attribute.name)]));
      const evidence={schema:'builtin-debug-data-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:selected.input,originalHelperOwners:selected.helpers,priorScalarRefusal:error.message,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyCallbacksEvaluated:1},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true},fmtDebug:{outcomes:['None','Shallow','Full'],allSelectedInputOutcomesClosed:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['generated Debug/fmt methods and allocator/format execution remain unlowered','all other derives, original scopes, ownership and const eligibility require independent proofs']};
      const proof=freezeCompleted({...evidence,digest:hash(composeJson(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
    }
    const attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline',state.original.name,...certificate.attributes.map(attribute=>attribute.name)]));
    const evidence={schema:'builtin-scalar-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyCallbacksEvaluated:1},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['generated builtin trait methods remain unlowered','other derive owners and original ancestor scopes require separate closed outputs','unsupported source layouts and compiler errors remain refused']};
    const proof=freezeCompleted({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name==='PartialEq'){
    const selected=partialEqDataInput(state,context,certificate),route=liftBuiltinPartialEqAstRoute({...state,original:state.original,input:selected.input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','PartialEq',...certificate.attributes.map(attribute=>attribute.name)]));
    const evidence={schema:'builtin-partial-eq-data-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:selected.input,originalHelperOwners:selected.helpers,slotProofs:{outputKind:{kind:'ItemKind::Impl',implementations:2,structuralAssociatedItems:0,equalityAssociatedItems:1,associatedKind:'AssocItemKind::Fn',bodyCallbacksEvaluated:1},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true,structuralAlways:'Const::No'}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['generated PartialEq/equality and intrinsic behavior remain unlowered','all other derives, original scopes, ownership and const eligibility require independent proofs']};
    const proof=freezeCompleted({...evidence,digest:hash(composeJson(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name==='Ord'||state.original.name==='PartialOrd'){
    const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end),helpers=[],declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
    for(const attribute of input.attributes){
      if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
        if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original ordering doc comment differs from its private invocation');continue;
      }
      if(!certificate.attributes.some(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end))throw new TypeError('Original ordering attribute differs from its private invocation');
      if(attribute.position!=='container'&&attribute.name!=='doc'){const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original ordering nested attribute requires its genuine active helper owner');helpers.push(proof);}
    }
    const route=liftBuiltinOrderingAstRoute({...state,original:state.original,input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc',state.original.name,...certificate.attributes.map(attribute=>attribute.name)]));
    const evidence={schema:'builtin-unit-enum-ordering-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:input,originalHelperOwners:helpers,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyKind:'Block',recursivelyClosed:true},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['ordering and discriminant runtime behavior and trait validity remain uncompiled','all sibling derive owners and original ancestor scopes require separate closed output proofs','payload/generic/conditional layouts and compiler errors remain refused']};
    const proof=freezeCompleted({...evidence,digest:hash(composeJson(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name==='Hash')return proveHashDataOutput(state,plan,context,certificate,invocation);
  if(state.original.name==='Eq'){
    const input=builtinPayloadDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
    for(const attribute of input.attributes){
      if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
        const declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
        if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Eq doc comment differs from the private source invocation');
        continue;
      }
      const actual=certificate.attributes.find(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end);if(!actual)throw new TypeError('Original Eq attribute differs from the private source invocation');
      if(attribute.position!=='container'&&attribute.name!=='doc'){
        const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Eq nested attribute requires its genuine active helper owner');helpers.push(proof);
      }
    }
    const route=liftBuiltinEqAstRoute({...state,original:state.original,input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','coverage','Eq',...certificate.attributes.map(attribute=>attribute.name)]));
    const evidence={schema:'builtin-eq-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,bodyCallbacksEvaluated:1,associatedKind:'AssocItemKind::Fn',statementKind:'LocalKind::Decl',initializerCount:0},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['Eq and AssertParamIsEq trait validity/implementation behavior is not admitted','other original derive owners retain separate output proofs','unrelated source scopes and conditional modules stay independent']};
    const joined={...evidence,inputSyntax:input,originalHelperOwners:helpers,copyAuthority:false,noDropAuthority:false,constAuthority:false};const proof=freezeCompleted({...joined,digest:hash(composeJson(joined))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name!=='Copy')throw new TypeError('Builtin '+state.original.name+' retains typed callback/conditional AST output obligations (plan '+plan.digest+')');
  const {profile,original}=state;
  const {descriptor,field,emptyVec,expand,structure,enumeration,sink,itemBuilder,parameters,typePath,pathBuilder,typeBuilder,traitBuilder,implementation,schema,implSchema}=originalBuiltinCopyOutputSyntax(state);
  const item=originalSourceModuleItems(original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
  for(const attribute of certificate.attributes.filter(attribute=>attribute.position!=='container')){
    const proof=deriveFootprintHelperAttributeAt(context,original.module,item,attribute.span);if(isDeriveFootprintHelperAttributeProof(proof))helpers.push(proof);
  }
  const inherited=certificate.attributes.filter(attribute=>!helpers.some(proof=>proof.attribute.span.start===attribute.span.start&&proof.attribute.span.end===attribute.span.end));
  const attributes=attributeOwners(original,certificate,new Set(['automatically_derived',original.name,...inherited.map(attribute=>attribute.name)]));
  // Output shape follows the actual AST constructors. It is not inferred from
  // an absence of macro_export strings and does not synthesize a trait body.
  // Nongeneric original input implies no original generic parameters/where
  // clauses; zero methods skips both dynamic body callbacks, zero associated
  // types skips the Type recipe. All constness branches keep this same shape.
  const evidence={schema:'builtin-copy-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:profile.digest,descriptor,recipes:[expand,structure,enumeration,sink,itemBuilder,emptyVec,parameters,typePath,pathBuilder,typeBuilder,traitBuilder],positiveSchema:[schema,implSchema],constructionSink:implementation,originalHelperOwners:helpers,slotProofs:{methods:{source:field('methods').span,domain:'pinned standard Vec::new len zero',constructorDigest:emptyVec.digest,length:0},associatedTypes:{source:field('associated_types').span,domain:'pinned standard Vec::new len zero',constructorDigest:emptyVec.digest,length:0},genericParameters:{domain:'actual original nongeneric data header',length:0},whereClauses:{domain:'actual original header without where or helper bounds; field visitor cannot match an empty type-parameter name set',length:0},typeArguments:{traitPath:'actual fixed marker::Copy Path recipe',selfPath:'actual original type Ident',genericArgumentCount:0,constructor:'TyKind::Path'},outputKind:{source:sink.span,kind:'ItemKind::Impl',associatedItems:0,bodyCallbacksEvaluated:0},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['Copy trait validity/implementation behavior is not admitted','other original derive owners retain separate output proofs','unrelated source scopes and conditional modules stay independent']};
  const proof=freezeCompleted({...evidence,digest:hash(composeJson(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
export function assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation){const state=proofs.get(proof);if(!state||state.context!==context||state.certificate!==certificate||JSON.stringify(state.invocation)!==JSON.stringify(invocation))throw new TypeError('Builtin output proof requires its original invocation');return proof;}
export const isBuiltinDeriveBangFootprint=value=>!!value&&proofs.has(value);

// Complete source reissue, including every existing recursive associated/body,
// type, helper and generated-attribute check. This accessor accepts no AST or
// replacement output. An outer Impl spelling alone never issues this fact.
export function originalBuiltinDeriveEnclosingOutput(proof,context,certificate,invocation){
 assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation);
 const fresh=proveBuiltinDeriveBangFootprint({context,certificate,invocation});
 if(composeJson(fresh)!==(proof.schema==='builtin-debug-data-bang-output-v1'?composeJson(proof):originalJson(proof)))throw new TypeError('Builtin complete original output changed before namespace effect');
 const sink=fresh.slotProofs?.outputKind;
 if(sink?.kind!=='ItemKind::Impl')throw new TypeError('Builtin namespace effect requires a source-proved complete Impl sink');
 return freezeCompleted({schema:'original-complete-builtin-enclosing-output-v1',proof:fresh,sink,route:fresh.route??null});
}

export function originalBuiltinDefaultBangOutput({context,certificate,invocation}={}){const proof=proveBuiltinDeriveBangFootprint({context,certificate,invocation});assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation);if(proof.schema!=="builtin-default-bang-output-v1")throw new TypeError("Default data output accessor requires its actual privately joined data route");return freezeCompleted({proof,route:proof.route,output:originalBuiltinDefaultAstOutput(proof.route),plan:builtinDefaultOriginalSourcePlan(proof.route)});}
