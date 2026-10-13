// Bounded actual builtin generator routes. Copy and Eq close source-selected associated
// list; callback-valued routes remain source-bearing obligations, not guesses.
import {createHash} from 'node:crypto';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule,deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof} from './derive-footprints.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {builtinDeriveDataInputs} from './builtin-derive-data-inputs.mjs';
import {sourceItems} from './rust-structure.mjs';
import {liftBuiltinEqAstRoute} from './builtin-eq-ast-route.mjs';
import {liftBuiltinCloneAstRoute} from './builtin-clone-ast-route.mjs';
import {liftBuiltinDebugAstRoute} from './builtin-debug-ast-route.mjs';
import {proveBuiltinScalarSourceOutput,assertBuiltinScalarSourceOutput} from './builtin-scalar-ast-route.mjs';
import {attributeOwners} from './serde-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,originalAstDefinition,astStructLiteral,astSyntaxText,astFragmentText} from './builtin-derive-ast-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
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
  const prefix=route.path==='cmp/partial_eq.rs'?'partial_eq':route.path==='cmp/eq.rs'?'eq':route.path.slice(0,-3);
  const registered=original.name+': '+prefix+'::'+route.entry;
  const registrationStart=registry.source.indexOf(registered);
  if(registrationStart<0||registry.source.indexOf(registered,registrationStart+1)>=0)throw new TypeError('Builtin registry owner route is not unique');
  const callbackRecipes=route.callbackFunctions.map(name=>originalAstFunction(profile,directory+route.path,name));
  const evidence={schema:'builtin-derive-ast-output-plan-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:{target:['core',original.name],invocation,registration:{source:registry.path,sourceSha256:registry.sha256,span:{start:registrationStart,end:registrationStart+registered.length}}},profileDigest:profile.digest,entry,callbackRecipes,conditionalOutputs:route.branches,closed:false,generatedImplBehavior:false,obligations:original.name==='Copy'?['prove actual empty associated list and original generic ItemKind::Impl sink']:['typed callback expression/statement closure remains unproved','all original conditional output branches retained; no compiler-option assumptions']};
  const plan=freeze({...evidence,digest:hash(JSON.stringify(evidence))});plans.set(plan,{original,profile,certificate,entry});return plan;
}
export const isBuiltinDeriveBangPlan=value=>!!value&&plans.has(value);
function proveCloneDataOutput(state,plan,context,certificate,invocation){
  const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
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
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
function debugDataInput(state,context,certificate){
  const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[],declaration=sourceItems(state.original.module.source.slice(certificate.span.start,certificate.span.end)).find(row=>row.start===0&&row.end===certificate.span.end-certificate.span.start);
  for(const attribute of input.attributes){
    if(attribute.name==='doc'&&attribute.sourceFeature==='original-line-doc-comment'){
      if(!declaration?.tokens.some(token=>token.type==='comment'&&token.text.startsWith('///')&&token.start+certificate.span.start===attribute.span.start&&token.end+certificate.span.start===attribute.span.end&&token.text===attribute.source))throw new TypeError('Original Debug doc comment differs from its private source invocation');continue;
    }
    if(!certificate.attributes.some(row=>row.name===attribute.name&&row.position===attribute.position&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end))throw new TypeError('Original Debug attribute differs from the private source invocation');
    if(attribute.position!=='container'&&attribute.name!=='doc'){const proof=deriveFootprintHelperAttributeAt(context,state.original.module,item,attribute.span);if(!isDeriveFootprintHelperAttributeProof(proof))throw new TypeError('Original Debug nested attribute requires its genuine active helper owner');helpers.push(proof);}
  }return {input,helpers};
}
export function proveBuiltinDeriveBangFootprint({context,certificate,invocation}={}){
  const plan=planBuiltinDeriveBangOutput({context,certificate,invocation}),state=plans.get(plan);
  if(['Clone','Debug','Default'].includes(state.original.name)){
    const input={dependencies:state.original.dependencies,source:state.original.module.source,span:certificate.span,owner:state.original.name};
    let route;try{route=assertBuiltinScalarSourceOutput(proveBuiltinScalarSourceOutput(input),input);}catch(error){
      if(state.original.name==='Clone')return proveCloneDataOutput(state,plan,context,certificate,invocation);
      if(state.original.name!=='Debug')throw new TypeError('Builtin '+state.original.name+' retains typed callback/conditional AST output obligations: '+error.message);
      const selected=debugDataInput(state,context,certificate),route=liftBuiltinDebugAstRoute({...state,original:state.original,input:selected.input}),attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline','doc','Debug',...certificate.attributes.map(attribute=>attribute.name)]));
      const evidence={schema:'builtin-debug-data-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,inputSyntax:selected.input,originalHelperOwners:selected.helpers,priorScalarRefusal:error.message,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyCallbacksEvaluated:1},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true},fmtDebug:{outcomes:['None','Shallow','Full'],allSelectedInputOutcomesClosed:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['generated Debug/fmt methods and allocator/format execution remain unlowered','all other derives, original scopes, ownership and const eligibility require independent proofs']};
      const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
    }
    const attributes=attributeOwners(state.original,certificate,new Set(['automatically_derived','inline',state.original.name,...certificate.attributes.map(attribute=>attribute.name)]));
    const evidence={schema:'builtin-scalar-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:state.original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:state.profile.digest,route,slotProofs:{outputKind:{kind:'ItemKind::Impl',associatedItems:1,associatedKind:'AssocItemKind::Fn',bodyCallbacksEvaluated:1},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['generated builtin trait methods remain unlowered','other derive owners and original ancestor scopes require separate closed outputs','unsupported source layouts and compiler errors remain refused']};
    const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name==='Eq'){
    const input=builtinDeriveDataInputs({source:state.original.module.source,span:certificate.span}),item=originalSourceModuleItems(state.original.module).find(item=>item.start===certificate.span.start&&item.end===certificate.span.end),helpers=[];
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
    const joined={...evidence,inputSyntax:input,originalHelperOwners:helpers,copyAuthority:false,noDropAuthority:false,constAuthority:false};const proof=freeze({...joined,digest:hash(JSON.stringify(joined))});proofs.set(proof,{context,certificate,invocation});return proof;
  }
  if(state.original.name!=='Copy')throw new TypeError('Builtin '+state.original.name+' retains typed callback/conditional AST output obligations (plan '+plan.digest+')');
  const {profile,original,entry}=state,descriptor=astStructLiteral(profile,entry,'TraitDef');
  const field=name=>descriptor.fields.find(field=>field.name===name);
  for(const name of ['methods','associated_types','additional_bounds'])if(astSyntaxText(field(name)?.expression??[])!=='Vec :: new ()')throw new TypeError('Builtin Copy list is not the original empty Vec construction: '+name);
  const emptyVec=originalAstFunction(profile,'library/alloc/src/vec/mod.rs','new'),vecRecipe=astStructLiteral(profile,emptyVec,'Vec');
  if(astSyntaxText(vecRecipe.fields.find(field=>field.name==='len')?.expression??[])!=='0')throw new TypeError('Pinned standard Vec empty constructor changed');
  if(astSyntaxText(field('needs_copy_as_bound_if_packed')?.expression??[])!=='false')throw new TypeError('Builtin Copy packed-bound selection changed');
  if(astSyntaxText(field('path')?.expression??[])!=='path_std ! (marker :: Copy)')throw new TypeError('Builtin Copy trait path source recipe changed');
  const genericPath=directory+'generic/mod.rs';
  const expand=originalAstFunction(profile,genericPath,'expand_ext'),structure=originalAstFunction(profile,genericPath,'expand_struct_def'),enumeration=originalAstFunction(profile,genericPath,'expand_enum_def'),sink=originalAstFunction(profile,genericPath,'create_derived_impl');
  const parameters=originalAstFunction(profile,genericPath,'find_type_parameters');
  if(!astFragmentText(parameters).includes('self.ty_param_names.contains(&segment.ident.name)'))throw new TypeError('Original field generic-parameter selection changed');
  const typePath=originalAstFunction(profile,directory+'generic/ty.rs','to_path','let mut idents = self.path.iter()'),pathBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','path_all'),typeBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','ty_path'),traitBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','trait_ref');
  if(!astFragmentText(typeBuilder).includes('ast::TyKind::Path(None, path)'))throw new TypeError('Original positive Path type constructor changed');
  const implementation=astStructLiteral(profile,sink,'Impl'),items=implementation.fields.find(field=>field.name==='items');
  if(astSyntaxText(items?.expression??[])!=='methods . into_iter () . chain (associated_types) . collect ()')throw new TypeError('Original Impl associated-list flow changed');
  for(const recipe of [structure,enumeration])if(!/self\s*\.\s*methods\s*\.\s*iter\s*\(\)/u.test(astFragmentText(recipe)))throw new TypeError('Original method iterator flow changed');
  const sinkSource=astFragmentText(sink);
  if(!sinkSource.includes('ast::ItemKind::Impl(Box::new(ast::Impl {')||!/generics\s*\.\s*params/u.test(sinkSource)||!sinkSource.includes('self.associated_types.iter()'))throw new TypeError('Original typed Impl sink/generic flow changed');
  const itemBuilder=originalAstFunction(profile,'compiler/rustc_expand/src/build.rs','item'),itemRecipe=astStructLiteral(profile,itemBuilder,'Item');
  if(astSyntaxText(itemRecipe.fields.find(field=>field.name==='kind')?.expression??[])!=='kind'||astSyntaxText(itemRecipe.fields.find(field=>field.name==='tokens')?.expression??[])!=='None')throw new TypeError('Original typed Item wrapper changed');
  const schema=originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','enum','ItemKind'),implSchema=originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','struct','Impl');
  if(!astFragmentText(schema).includes('Impl(Box<Impl>)')||!astFragmentText(implSchema).includes('ThinVec<P<AssocItem>>'))throw new TypeError('Pinned positive Impl/associated-item schema changed');
  if(!astFragmentText(expand).includes('push(Annotatable::Item(P(ast::Item { attrs, ..(*newitem).clone() })))'))throw new TypeError('Original final Item push changed');
  const attributes=attributeOwners(original,certificate,new Set(['automatically_derived',original.name,...certificate.attributes.map(attribute=>attribute.name)]));
  // Output shape follows the actual AST constructors. It is not inferred from
  // an absence of macro_export strings and does not synthesize a trait body.
  // Nongeneric original input implies no original generic parameters/where
  // clauses; zero methods skips both dynamic body callbacks, zero associated
  // types skips the Type recipe. All constness branches keep this same shape.
  const evidence={schema:'builtin-copy-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:certificate.compilationProfile,owner:plan.owner,planDigest:plan.digest,profileDigest:profile.digest,descriptor,recipes:[expand,structure,enumeration,sink,itemBuilder,emptyVec,parameters,typePath,pathBuilder,typeBuilder,traitBuilder],positiveSchema:[schema,implSchema],constructionSink:implementation,slotProofs:{methods:{source:field('methods').span,domain:'pinned standard Vec::new len zero',constructorDigest:emptyVec.digest,length:0},associatedTypes:{source:field('associated_types').span,domain:'pinned standard Vec::new len zero',constructorDigest:emptyVec.digest,length:0},genericParameters:{domain:'actual original nongeneric data header',length:0},whereClauses:{domain:'actual original header without where or helper bounds; field visitor cannot match an empty type-parameter name set',length:0},typeArguments:{traitPath:'actual fixed marker::Copy Path recipe',selfPath:'actual original type Ident',genericArgumentCount:0,constructor:'TyKind::Path'},outputKind:{source:sink.span,kind:'ItemKind::Impl',associatedItems:0,bodyCallbacksEvaluated:0},constness:{outcomes:['Const::Yes','Const::No'],bothPreserveSink:true}},attributeOwners:attributes,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['Copy trait validity/implementation behavior is not admitted','other original derive owners retain separate output proofs','unrelated source scopes and conditional modules stay independent']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,invocation});return proof;
}
export function assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation){const state=proofs.get(proof);if(!state||state.context!==context||state.certificate!==certificate||JSON.stringify(state.invocation)!==JSON.stringify(invocation))throw new TypeError('Builtin output proof requires its original invocation');return proof;}
export const isBuiltinDeriveBangFootprint=value=>!!value&&proofs.has(value);
