// Default nongeneric named Deserialize source output, including both possible
// deserialize_in_place feature configurations. No namespace hook consumes it.
import {createHash} from 'node:crypto';
import {deriveDependencySource} from './derive-dependencies.mjs';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule} from './derive-footprints.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from './derive-quote-meta.mjs';
import {originalFunction,selectedTemplate,boundedInput,attributeOwners,emptySerdeMacro,joinOriginalSerdeFieldHelpers} from './serde-bang-footprints.mjs';
import {liftSerdeDeserializeStructRoutes,liftSerdeDeserializeInPlaceRoute} from './serde-deserialize-struct-route.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakMap(),inventories=new WeakMap();

export function proveSerdeDeserializeBangFootprint({context,certificate}={}){
  const original=deriveFootprintOriginalContext(context,certificate);
  const module=deriveFootprintOriginalModule(context,certificate),source=module.source.slice(certificate.span.start,certificate.span.end);
  if(hash(source)!==certificate.itemSha256)throw new TypeError('Original Deserialize input bytes changed');
  const input=boundedInput(certificate,source,'Deserialize',['deny_unknown_fields','default','skip_serializing_if']);
  if(input.style!=='named-struct')throw new TypeError('Default Deserialize route currently requires actual named fields');
  input.denyUnknownFields=certificate.attributes.some(attribute=>attribute.position==='container'&&attribute.helpers?.some(helper=>helper.key==='deny_unknown_fields'));
  const dependencies=original.dependencies;
  let inventory=inventories.get(dependencies);if(!inventory){inventory=inventoryDeriveQuoteMeta(dependencies);inventories.set(dependencies,inventory);}
  const compiler=createQuoteFragmentCompiler(inventory),fieldHelpers=joinOriginalSerdeFieldHelpers({context,certificate,module,input,compiler,owner:'Deserialize',dependencies}),routes=[],branchProofs=[],bindingProofs=[];
  const definition=(path,name,predicate)=>{const result=originalFunction(dependencies,path,name,predicate),{text,...evidence}=result;routes.push(evidence);return result;};
  const inst=(template,bindings,role)=>compiler.instantiate(template,new Map(Object.entries(bindings)),{role,inputCertificateDigest:certificate.digest});
  const leaf=(text,type,role)=>compiler.token(text,type,{role,inputCertificateDigest:certificate.digest});
  const empty=role=>compiler.empty({role,inputCertificateDigest:certificate.digest});
  const ident=leaf(input.name.name,'ident','actual original Container.ident'),privateIdent=leaf('__private'+dependencies.packages.find(entry=>entry.name==='serde_derive').version.split('.')[2],'ident','locked private.ident patch suffix');
  const synType=deriveDependencySource(dependencies,'syn','src/ty.rs'),synLifetime=deriveDependencySource(dependencies,'syn','src/lifetime.rs'),synGenerics=deriveDependencySource(dependencies,'syn','src/generics.rs');
  if(['TypePath','TypeReference','TypeTuple','TypeSlice','TypeArray','TypeParen'].some(name=>!synType.source.includes('ToTokens for '+name))||!synLifetime.source.includes('ToTokens for Lifetime')||!synGenerics.source.includes('ToTokens for ImplGenerics'))throw new TypeError('Pinned syn typed splice printers are absent');
  for(const field of input.fields){
    const typeSource=source.slice(field.typeSpan.start,field.typeSpan.end);
    field.originalTypeSpan={start:certificate.span.start+field.typeSpan.start,end:certificate.span.start+field.typeSpan.end};
    field.typeFragment=compiler.sourceType(typeSource,{role:'actual original field.ty syn::Type',source:certificate.source,sourceSpan:field.originalTypeSpan,syntaxTokenSpanBasis:'original field-type slice'});
    // Bound BorrowedLifetimes precisely before choosing the generated 'de.
    // References and lifetime-bearing Type arguments require the separately
    // inspected implicit/explicit borrowed field helper route.
    const hasBorrowSyntax=nodes=>nodes.some(node=>node.text==='&'||node.tokenType==='lifetime'||node.nodes&&hasBorrowSyntax(node.nodes));
    if(hasBorrowSyntax(field.typeFragment.syntax))throw new TypeError('Deserialize borrowed field lifetime selection requires a separate source helper route');
  }
  bindingProofs.push({binding:'syn Type/Lifetime/Generics ToTokens',sources:[synType,synLifetime,synGenerics].map(({source,...evidence})=>evidence),inputGenericParameters:0,fieldTypeTokensPreserved:true});
  const de=deriveDependencySource(dependencies,'serde_derive','src/de.rs'),attr=deriveDependencySource(dependencies,'serde_derive','src/internals/attr.rs');
  if(!de.source.includes('syn::Lifetime::new("\'de", Span::call_site())')||!de.source.includes('syn::Lifetime::new("\'place", Span::call_site())')||!attr.source.includes('else if is_implicitly_borrowed(&field.ty)'))throw new TypeError('Pinned generated lifetime/default borrowed helper branches changed');
  bindingProofs.push({binding:'BorrowedLifetimes and generated generic parameters',source:de.path,sourceSha256:de.sha256,helperSource:attr.path,helperSourceSha256:attr.sha256,basis:'actual nongeneric header; no references/lifetime-bearing field Type; no borrow/default/custom helper'});
  const expansion=definition('src/de.rs','expand_derive_deserialize'),dispatch=definition('src/de.rs','deserialize_body');
  const registration=definition('src/lib.rs','derive_deserialize');
  if(!/#\[proc_macro_derive\(\s*Deserialize,\s*attributes\(serde\)\s*\)\]/u.test(registration.text))throw new TypeError('Locked Deserialize helper registration changed');
  bindingProofs.push({binding:'original serde derive helper registration',source:registration.source,sourceSha256:registration.sourceSha256,span:registration.span,owner:['serde','Deserialize'],helper:'serde',importedAttributeNames:'additional conservative uncertainty; no resolver precedence inferred'});
  definition('src/de.rs','build_generics');definition('src/internals/attr.rs','is_implicitly_borrowed');definition('src/internals/attr.rs','is_implicitly_borrowed_reference');
  for(const needle of ['cont.attrs.transparent()','cont.attrs.type_from()','cont.attrs.type_try_from()','cont.attrs.identifier()'])if(!dispatch.text.includes(needle))throw new TypeError('Pinned Deserialize dispatch changed');
  branchProofs.push({predicate:'remote=false; transparent=false; from/try_from=None; identifier=No; StructForm::Struct',source:dispatch.source,sourceSha256:dispatch.sourceSha256,span:dispatch.span,basis:'actual named struct and accepted no custom helper profile'});
  const fragment=deriveDependencySource(dependencies,'serde_derive','src/fragment.rs');
  if(!fragment.source.includes('<Token![,]>::default().to_tokens(out)')||!fragment.source.includes('Fragment::Block(block) => block.to_tokens(out)'))throw new TypeError('Pinned Match(Expr)/Stmts adapter changed');
  bindingProofs.push({binding:'Match(Expr) and Stmts(Block)',source:fragment.path,sourceSha256:fragment.sha256,behavior:'comma only after Expr; Block statement tokens retain original template syntax'});
  const args={inventory,compiler,input,definition,select:selectedTemplate,inst,leaf,empty,ident,privateIdent,bindingProofs,branchProofs};
  const state=liftSerdeDeserializeStructRoutes(args);
  const inPlace=liftSerdeDeserializeInPlaceRoute({...args,state});
  const manifest=deriveDependencySource(dependencies,'serde_derive','Cargo.toml');
  if(!/\[features\]\s+default = \[\]\s+deserialize_in_place = \[\]/u.test(manifest.source))throw new TypeError('Pinned Deserialize feature declaration changed');
  const featureEvidence={source:manifest.path,sourceSha256:manifest.sha256,defaultFeatures:[],feature:'deserialize_in_place',activation:'unresolved Cargo feature union',strategy:'both original generated-output branches retained'};
  const deprecated=definition('src/deprecated.rs','allow_deprecated'),allow=inst(selectedTemplate(inventory,deprecated,()=>true),{},'possible original allow_deprecated output (both harmless paths confined)');
  const wrapper=definition('src/dummy.rs','wrap_in_const'),alias=selectedTemplate(inventory,wrapper,text=>text.includes('extern crate serde as _serde'));
  const outer=selectedTemplate(inventory,wrapper,text=>text.includes('#use_serde')&&text.includes('#code'));
  const implementation=selectedTemplate(inventory,expansion,text=>text.includes('impl #de_impl_generics _serde :: Deserialize'));
  const outputs=[['disabled',state.none],['enabled',inPlace]].map(([feature,method])=>{
    const impl=inst(implementation,{private:privateIdent,allow_deprecated:allow,de_impl_generics:state.deGenerics,delife:state.delife,ident,ty_generics:state.none,where_clause:state.none,body:state.normal,fn_deserialize_in_place:method},'source-selected Deserialize impl '+feature);
    const output=compiler.roundTrip(inst(outer,{use_serde:inst(alias,{},'actual pinned serde extern alias'),code:impl},'original anonymous const '+feature));
    const observation=inspectQuoteFragment(output);
    if(observation.definitions.length||observation.macroExports.length||observation.bangCalls.length!==1||observation.bangCalls[0].writtenPath.join('::')!=='_serde::__require_serde_not_serde_core')throw new TypeError('Selected Deserialize output has unresolved bang syntax');
    return {feature,output,observation};
  });
  const attributes=attributeOwners({...original,context,module},certificate,new Set([...outputs.flatMap(output=>output.observation.attributes.map(attribute=>attribute.name)),...certificate.attributes.map(attribute=>attribute.name)]));
  const fixedMacro=emptySerdeMacro(dependencies),error=deriveDependencySource(dependencies,'syn','src/error.rs');
  if(!certificate.coreOwner||!error.source.includes('TokenTree::Literal(string)')||!error.source.includes('Ident::new("compile_error", start)'))throw new TypeError('Deserialize error output lacks original literal/standard owner proof');
  const owners=certificate.owners.filter(owner=>owner.target.join('::')==='serde::Deserialize'),residualOwners=certificate.owners.filter(owner=>owner.target.join('::')!=='serde::Deserialize');
  const evidence={schema:'selected-serde-deserialize-bang-footprint-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,deriveCertificateDigest:certificate.digest,dependenciesDigest:dependencies.digest,compilationProfile:certificate.compilationProfile,owners,residualOwners,selectedOwnerBangComplete:true,inputStyle:input.style,fieldHelperInputs:fieldHelpers,inventoryDigest:inventory.digest,inventoryCounts:{sourceMembers:inventory.sourceMemberCount,quoteGroups:inventory.quoteCount},routes,branchProofs,bindingProofs,featureEvidence,attributeOwners:attributes,fixedMacro,errorBranch:{source:error.path,sourceSha256:error.sha256,target:certificate.coreOwner.target,namespaceOutput:'compile-error only'},outputs:outputs.map(({feature,output,observation})=>({feature,outputGrammarDigest:observation.fragmentSha256,outputSyntaxSha256:output.provenance.syntaxSha256,semanticSyntaxRoundTrip:output.provenance.semanticRoundTrip===true,observation})),dimensions:{bangMacroComplete:residualOwners.length===0,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['Deserialize trait behavior/effects/impls remain unsupported','other original derives retain separate output obligations','unrelated macros/configuration remain independently unresolved']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,outputs});return proof;
}
export const isSerdeDeserializeBangFootprint=value=>!!value&&proofs.has(value);
export function assertSerdeDeserializeBangFootprint(proof,context,certificate){
  const state=proofs.get(proof);if(!state||state.context!==context||state.certificate!==certificate)throw new TypeError('Deserialize output proof requires its original sealed invocation');return proof;
}

// Read only the complete output belonging to this exact private caller.
export function originalSerdeDeserializeOutputs(proof,context,certificate,module,item){
 assertSerdeDeserializeBangFootprint(proof,context,certificate);const original=deriveFootprintOriginalModule(context,certificate),state=proofs.get(proof);
 if(!module||module.source!==original.source||module.sourceView!==original.sourceView||module.file!==original.file||JSON.stringify(module.path)!==JSON.stringify(original.path)||!item||item.start!==certificate.span.start||item.end!==certificate.span.end||item.name!==certificate.name||item.term!==certificate.kind||hash(original.source)!==certificate.sourceSha256||hash(original.source.slice(item.start,item.end))!==certificate.itemSha256)throw new TypeError('Deserialize output requires its exact original source/view/span');
 return Object.freeze(state.outputs.map(row=>Object.freeze({...row})));
}
