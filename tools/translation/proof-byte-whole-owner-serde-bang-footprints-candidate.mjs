import {createOriginalAttributeOwnerBulkOperation} from "./proof-byte-whole-owner-attribute-owner-bulk-operation.mjs";
// Selected original Serde generator routes. This certifies only generated bang
// namespace confinement; Serialize behavior and generated impls stay unlowered.
import {createHash} from 'node:crypto';
import {deriveDependencySource} from './derive-dependencies.mjs';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule,deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof,assertDeriveFootprintOriginalSelection} from './derive-footprints.mjs';
import {originalJsonIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import {resolveModuleBindings} from "./proof-byte-whole-owner-module-bindings-candidate.mjs";
import {macroBindingAffects,macroScopeUncertain} from './macro-subnamespaces.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from './derive-quote-meta.mjs';
import {serdeFieldHelperInputs,originalSerdeFieldHelperSourcePlan} from './serde-field-helper-inputs.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {liftSerdeNamedStructRoute} from './serde-serialize-struct-route.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const proofs=new WeakMap(),cachedInventories=new WeakMap(),cachedAttributeBindings=new WeakMap();
const identifier=tree=>tree?.kind==='token'&&tree.type==='ident'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(tree.text);
const syntaxText=nodes=>nodes.map(node=>node.tag==='slot'?'#'+node.name:node.tag==='repeat'?'#('+syntaxText(node.nodes)+')'+(node.separator?.text??'')+node.quantifier:node.tag==='group'?node.delimiter+syntaxText(node.nodes)+({'(':')','[':']','{':'}'}[node.delimiter]):node.text).join(' ');
const functionIndices=new WeakMap(),functionIndexSlots=[];let functionIndexBytes=0,functionIndexHits=0,functionIndexBuilds=0,functionIndexFallbacks=0;
export function originalFunctionIndexFacts(){return Object.freeze({eligible:originalLexingIntrinsicsUnchanged(),entries:functionIndexSlots.length,retainedBytes:functionIndexBytes,hits:functionIndexHits,builds:functionIndexBuilds,fallbacks:functionIndexFallbacks,limits:Object.freeze({entries:16,bytes:1048576,entryBytes:262144})});}
function originalFunctionDefinitions(origin){
  const roots=sourceItems(origin.source),definitions=[...roots];
  // Generator methods are real source functions inside actual impl items, not
  // emitted quote bodies. Preserve original absolute positions and attributes.
  for(const implementation of roots.filter(item=>item.term==='impl')){
    const open=implementation.tokens.find(token=>token.type==='punct'&&token.text==='{'),close=implementation.tokens.at(-1);
    if(!open||close?.text!=='}')throw new TypeError('Original generator impl function boundary remains unresolved');
    definitions.push(...sourceItems(origin.source.slice(open.end,close.start)).map(item=>({...item,start:item.start+open.end,end:item.end+open.end})));
  }
  return definitions;
}
function indexedFunctionDefinitions(origin){
  if(!originalLexingIntrinsicsUnchanged()){if(functionIndexFallbacks<9007199254740991)functionIndexFallbacks++;return originalFunctionDefinitions(origin);}
  const previous=functionIndices.get(origin);
  if(previous?.active){if(functionIndexHits<9007199254740991)functionIndexHits++;const definitions=[];for(let at=0;at<previous.index.length;at++){const item=previous.index[at];definitions.push({term:'fn',name:origin.source.slice(item.nameStart,item.nameEnd),start:item.start,end:item.end});}return definitions;}
  if(functionIndexBuilds<9007199254740991)functionIndexBuilds++;const definitions=originalFunctionDefinitions(origin),index=[];let bytes=64;
  for(let at=0;at<definitions.length;at++){const item=definitions[at];if(item.term!=='fn')continue;let token=null,depth=0;for(let at=0;at<item.tokens.length;at++){const part=item.tokens[at];if(depth===0&&part.text==='fn'){let next=at+1;while(item.tokens[next]?.type==='comment')next++;token=item.tokens[next];break;}if(part.type==='punct'){if(['(','[','{'].includes(part.text))depth++;else if([')',']','}'].includes(part.text))depth--;}}if(!token||token.text!==item.name)return definitions;const offset=item.start-item.tokens[0].start,nameStart=token.start+offset,nameEnd=token.end+offset;if(origin.source.slice(nameStart,nameEnd)!==item.name)return definitions;bytes+=128;if(bytes>262144)return definitions;index.push(Object.freeze({start:item.start,end:item.end,nameStart,nameEnd}));}
  if(!originalLexingIntrinsicsUnchanged())return definitions;
  while(functionIndexSlots.length>=16||functionIndexBytes+bytes>1048576){const oldest=functionIndexSlots.shift();functionIndexBytes-=oldest.bytes;oldest.active=false;oldest.index=null;}
  const state={active:true,index:Object.freeze(index),bytes};functionIndices.set(origin,state);functionIndexSlots.push(state);functionIndexBytes+=bytes;return definitions;
}
export function originalFunction(dependencies,path,name,predicate=()=>true){
  const origin=deriveDependencySource(dependencies,'serde_derive',path),definitions=indexedFunctionDefinitions(origin);
  const items=definitions.filter(item=>item.term==='fn'&&item.name===name&&predicate(origin.source.slice(item.start,item.end)));
  if(items.length!==1)throw new TypeError('Selected generator function is not unique: '+path+'::'+name);
  const item=items[0];return {source:path,sourceSha256:origin.sha256,span:{start:item.start,end:item.end},sha256:hash(origin.source.slice(item.start,item.end)),text:origin.source.slice(item.start,item.end)};
}
export function selectedTemplate(inventory,definition,predicate){
  const member=inventory.members.find(member=>member.source===definition.source);
  const matches=member?.quotes.filter(template=>template.span.start>=definition.span.start&&template.span.end<=definition.span.end&&predicate(syntaxText(template.syntax)))??[];
  if(matches.length!==1)throw new TypeError('Selected source quote is not unique: '+definition.source+'@'+definition.span.start+'..'+definition.span.end+' ('+matches.length+' matches)');
  return matches[0];
}
export function boundedInput(certificate,source,owner='Serialize',allowedHelpers=['rename','rename_all','alias']){
  if(owner!==null&&certificate.owners.filter(value=>value.target.join('::')==='serde::'+owner).length!==1)throw new TypeError('This selected route requires one actual locked '+owner+' owner');
  for(const attribute of certificate.attributes){
    if(!['derive','serde','doc','allow','warn','deny','forbid','must_use','non_exhaustive'].includes(attribute.name)&&!(attribute.name==='default'&&certificate.builtinDefault))throw new TypeError('Selected route retains attribute behavior: '+attribute.name);
    if(attribute.helpers?.some(helper=>!allowedHelpers.includes(helper.key)))throw new TypeError('Selected route excludes helper branches with fields, custom calls or token-stream payloads');
    if(attribute.helpers?.some(helper=>['default','skip_serializing_if'].includes(helper.key)&&(attribute.position!=='field'||helper.key==='default'&&helper.value!==null)))throw new TypeError('Selected route excludes helper branches with container/default paths');
  }
  const trees=originalMacroTrees(source),keyword=trees.findIndex(tree=>tree.text===certificate.kind),name=trees[keyword+1];
  if(keyword<0||!identifier(name)||name.text!==certificate.name)throw new TypeError('Selected route requires its actual original nongeneric data name');
  if(certificate.kind==='struct'){
    if(trees[keyword+2]?.text===';'&&keyword+3===trees.length)return {style:'unit-struct',name:{name:name.text,span:name.span},variants:[]};
    const body=trees[keyword+2];
    if(body?.kind!=='group'||body.delimiter!=='{'||keyword+3!==trees.length)throw new TypeError('Selected struct route requires unit or original named fields');
    const fields=[];let at=0;
    while(at<body.children.length){
      while(body.children[at]?.text==='#'&&body.children[at+1]?.kind==='group'&&body.children[at+1].delimiter==='[')at+=2;
      if(body.children[at]?.text==='pub'){at++;if(body.children[at]?.kind==='group'&&body.children[at].delimiter==='(')at++;}
      const field=body.children[at++];
      if(!identifier(field)||fields.some(previous=>previous.name===field.text)||body.children[at++]?.text!==':')throw new TypeError('Named Serialize field requires its original member identity');
      const begin=at;let angle=0;
      for(;at<body.children.length;at++){const token=body.children[at];if(token.text==='<')angle++;if(token.text==='>')angle--;if(angle<0)throw new TypeError('Named field generic grammar is unbalanced');if(token.text===','&&angle===0)break;}
      if(angle||begin===at)throw new TypeError('Named field source type is incomplete');
      fields.push({name:field.text,span:field.span,typeSpan:{start:body.children[begin].span.start,end:body.children[at-1].span.end}});if(body.children[at]?.text===',')at++;
    }
    if(fields.length>128)throw new TypeError('Selected named struct field count exceeds its bounded route');
    return {style:'named-struct',name:{name:name.text,span:name.span},variants:[],fields};
  }
  if(certificate.kind!=='enum'||trees[keyword+2]?.kind!=='group'||trees[keyword+2].delimiter!=='{'||keyword+3!==trees.length)throw new TypeError('Selected enum route requires an original nongeneric unit enum');
  const nodes=trees[keyword+2].children,variants=[];let at=0;
  while(at<nodes.length){
    while(nodes[at]?.text==='#'&&nodes[at+1]?.kind==='group'&&nodes[at+1].delimiter==='[')at+=2;
    const variant=nodes[at++];if(!identifier(variant)||variants.some(value=>value.name===variant.text))throw new TypeError('Selected enum requires unique original unit variants');
    variants.push({name:variant.text,span:variant.span});
    if(at<nodes.length&&nodes[at++]?.text!==',')throw new TypeError('Selected enum excludes payload, discriminant and nested type branches');
  }
  if(!variants.length||variants.length>128)throw new TypeError('Selected unit enum variant count exceeds its bounded route');
  return {style:'unit-enum',name:{name:name.text,span:name.span},variants};
}
export function attributeOwners(original,certificate,names){
  original=assertDeriveFootprintOriginalSelection(original,certificate);
  let cached=cachedAttributeBindings.get(original.context);
  if(!cached){const bindings=resolveModuleBindings({...original,deriveContext:original.context});cached={bindings,canonical:originalJsonIntrinsicsUnchanged()?JSON.stringify(bindings):null};cachedAttributeBindings.set(original.context,cached);}
  const {bindings}=cached;
  const selected=bindings.scopes.filter(scope=>scope.file===certificate.source&&scope.path.length===original.module.path.length&&scope.path.every((part,index)=>part===original.module.path[index]));
  if(selected.length!==1)throw new TypeError('Generated attribute proof has no unique original source module');
  const ancestors=bindings.scopes.filter(scope=>scope.path.every((part,index)=>selected[0].path[index]===part));
  if(ancestors.some(scope=>macroScopeUncertain(scope,'attribute')))throw new TypeError('Generated builtin attribute namespace retains an unresolved ancestor');
  for(const name of names)if(ancestors.some(scope=>scope.bindings.some(binding=>binding.name===name&&macroBindingAffects(binding,'attribute'))))throw new TypeError('Generated builtin attribute is shadowed: '+name);
  return {names:[...names].sort(),scopes:ancestors.map(scope=>({source:scope.file,module:scope.path,configurationCondition:scope.configurationCondition,unresolvedAttributeMacroScope:scope.unresolvedAttributeMacroScope})),bindingsDigest:hash(cached.canonical!==null&&originalJsonIntrinsicsUnchanged()?cached.canonical:JSON.stringify(bindings)),compilationProfile:original.compilationProfile};
}
export function emptySerdeMacro(dependencies){
  const origin=deriveDependencySource(dependencies,'serde','src/lib.rs'),items=sourceItems(origin.source).filter(item=>item.term==='macro_rules!'&&item.name==='__require_serde_not_serde_core');
  if(items.length!==1)throw new TypeError('Pinned Serde fixed empty macro is absent or ambiguous');
  const item=items[0],text=origin.source.slice(item.start,item.end);
  const definition=compileDeclarativeMacro(text,{name:item.name,owner:['serde']});
  const expansion=expandDeclarativeMacro(definition,originalMacroInvocation('_serde::__require_serde_not_serde_core!()').trees);
  if(expansion.trees.length)throw new TypeError('Serde fixed output macro has nonempty expansion');
  return {target:['serde',item.name],source:origin.path,sourceSha256:origin.sha256,span:{start:item.start,end:item.end},sha256:hash(text),expansionDigest:expansion.digest,outputTokens:0,ownerResolution:'original-wrapper-extern-crate-locked-serde'};
}

// Syntax candidates become usable only inside the actual private caller join.
export function joinOriginalSerdeFieldHelpers({context,certificate,module,input,compiler,owner,dependencies}){
  const candidate=serdeFieldHelperInputs({source:module.source,span:certificate.span}),sourcePlan=originalSerdeFieldHelperSourcePlan(dependencies),item=originalSourceModuleItems(module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end),helperProofs=[];
  if(candidate.wholeSourceSha256!==certificate.sourceSha256||candidate.itemSha256!==certificate.itemSha256||candidate.fields.length!==(input.fields??[]).length)throw new TypeError('Original Serde helper source differs from private invocation');
  for(const [index,field]of(input.fields??[]).entries()){
    const selected=candidate.fields[index];if(field.name!==selected.name||field.typeSpan.start+certificate.span.start!==selected.typeSpan.start||field.typeSpan.end+certificate.span.start!==selected.typeSpan.end)throw new TypeError('Original Serde helper field source identity differs');
    for(const helper of selected.helperAttributes){const actual=certificate.attributes.find(row=>row.name==='serde'&&row.position==='field'&&row.span.start===helper.attribute.span.start&&row.span.end===helper.attribute.span.end);if(!actual?.helpers.some(row=>row.key===helper.key&&row.value===helper.value))throw new TypeError('Original Serde helper syntax differs from actual private attribute');const proof=deriveFootprintHelperAttributeAt(context,module,item,actual.span);if(!isDeriveFootprintHelperAttributeProof(proof)||!proof.registrations.some(row=>row.target.join('::')==='serde::'+owner))throw new TypeError('Original Serde field helper requires its genuine active declaring owner');if(!helperProofs.includes(proof))helperProofs.push(proof);}
    field.default=selected.default;field.skipSerializingIf=selected.skipSerializingIf===null?null:compiler.roundTrip(compiler.sourceExpression(selected.skipSerializingIf,{role:'actual original skip_serializing_if literal ExprPath',source:certificate.source,sourceSha256:certificate.sourceSha256,span:selected.helperAttributes.find(row=>row.key==='skip_serializing_if').attribute.span}));if(field.skipSerializingIf&&field.skipSerializingIf.provenance.expressionKind!=='Expr::Path')throw new TypeError('Original Serde predicate is not its bounded actual ExprPath');
  }
  return {candidate,sourcePlan,helperProofs,generatedHelperBehavior:false};
}

export function proveSerdeSerializeBangFootprint({context,certificate}={}){
  const original=deriveFootprintOriginalContext(context,certificate),module=deriveFootprintOriginalModule(context,certificate);
  const source=module.source.slice(certificate.span.start,certificate.span.end);
  if(hash(source)!==certificate.itemSha256)throw new TypeError('Selected route original input bytes have changed');
  const input=boundedInput(certificate,source,'Serialize',['rename','rename_all','alias','default','skip_serializing_if']),dependencies=original.dependencies;
  let inventory=cachedInventories.get(dependencies);if(!inventory){inventory=inventoryDeriveQuoteMeta(dependencies);cachedInventories.set(dependencies,inventory);}
  const compiler=createQuoteFragmentCompiler(inventory),fieldHelpers=joinOriginalSerdeFieldHelpers({context,certificate,module,input,compiler,owner:'Serialize',dependencies}),routes=[],branchProofs=[],bindingProofs=[];
  const definition=(path,name)=>{const result=originalFunction(dependencies,path,name),{text,...evidence}=result;routes.push(evidence);return result;};
  const inst=(template,bindings,role)=>compiler.instantiate(template,new Map(Object.entries(bindings)),{role,inputCertificateDigest:certificate.digest});
  const leaf=(text,type,role)=>compiler.token(text,type,{role,inputCertificateDigest:certificate.digest,source:certificate.source,sourceSpan:certificate.span});
  const empty=role=>compiler.empty({role,inputCertificateDigest:certificate.digest});
  const expansion=definition('src/ser.rs','expand_derive_serialize'),dispatch=definition('src/ser.rs','serialize_body'),wrapper=definition('src/dummy.rs','wrap_in_const');
  const registration=definition('src/lib.rs','derive_serialize');
  if(!/#\[proc_macro_derive\(\s*Serialize,\s*attributes\(serde\)\s*\)\]/u.test(registration.text))throw new TypeError('Locked Serialize helper registration changed');
  bindingProofs.push({binding:'original serde derive helper registration',source:registration.source,sourceSha256:registration.sourceSha256,span:registration.span,owner:['serde','Serialize'],helper:'serde',importedAttributeNames:'additional conservative uncertainty; no resolver precedence inferred'});
  // These exclusions come from accepted original helper syntax, not caller
  // branch flags. All generator sources are separately byte-pinned inputs.
  for(const [name,needle,value]of [['remote','cont.attrs.remote()',false],['transparent','cont.attrs.transparent()',false],['type_into','cont.attrs.type_into()',null]]){
    const route=name==='remote'?expansion:dispatch;if(!route.text.includes(needle))throw new TypeError('Selected generator branch is absent: '+name);
    branchProofs.push({predicate:name,value,source:route.source,sourceSha256:route.sourceSha256,span:route.span,basis:'original helper profile excludes this attribute'});
  }
  definition('src/ser.rs','build_generics');
  const ident=leaf(input.name.name,'ident','syn::Ident from original Container.ident'),privateIdent=leaf('__private'+dependencies.packages.find(entry=>entry.name==='serde_derive').version.split('.')[2],'ident','pinned private.ident -> one Ident');
  const common={ident,private:privateIdent,impl_generics:empty('nongeneric original unit input'),ty_generics:empty('nongeneric original unit input'),where_clause:empty('no original where clause or field bounds')};
  bindingProofs.push({binding:'ident',category:'syn::Ident',source:'src/internals/ast.rs',sourceSha256:deriveDependencySource(dependencies,'serde_derive','src/internals/ast.rs').sha256,inputSpan:{start:certificate.span.start+input.name.span.start,end:certificate.span.start+input.name.span.end}});
  bindingProofs.push({binding:'private',category:'one generated syn::Ident',source:'src/lib.rs',sourceSha256:deriveDependencySource(dependencies,'serde_derive','src/lib.rs').sha256});
  bindingProofs.push({binding:'name',category:'Serde Name -> syn::LitStr',source:'src/internals/name.rs',sourceSha256:deriveDependencySource(dependencies,'serde_derive','src/internals/name.rs').sha256});
  const quoteSource=deriveDependencySource(dependencies,'quote','src/lib.rs');
  bindingProofs.push({binding:'quote!/quote_spanned! and ToTokens',category:'locked quote token-tree grammar',package:'quote',version:quoteSource.version,source:quoteSource.path,sourceSha256:quoteSource.sha256,archiveSha256:quoteSource.archiveSha256});
  // Name spelling/rename results are opaque literals in this abstraction. The
  // proof concerns the token category, not serialized trait output behavior.
  const typeName=leaf(JSON.stringify(input.name.name),'string','Name::to_tokens always emits a string literal');
  let body;
  if(input.style==='named-struct'){
    body=liftSerdeNamedStructRoute({inventory,compiler,input,sourceOffset:certificate.span.start,definition,select:selectedTemplate,inst,leaf,empty,typeName,privateIdent,bindingProofs,branchProofs});
  }else if(input.style==='unit-struct'){
    const unit=definition('src/ser.rs','serialize_unit_struct');
    const template=selectedTemplate(inventory,unit,text=>text.includes('serialize_unit_struct'));
    body=inst(template,{type_name:typeName},'Style::Unit serializer expression');
  }else{
    const enumerate=definition('src/ser.rs','serialize_enum'),variant=definition('src/ser.rs','serialize_variant'),external=definition('src/ser.rs','serialize_externally_tagged_variant');
    const caseTemplate=selectedTemplate(inventory,variant,text=>text.trim()==='#this_value :: #variant_ident');
    const armTemplate=selectedTemplate(inventory,variant,text=>text.trim()==='#case => #body');
    const bodyTemplate=selectedTemplate(inventory,external,text=>text.includes('serialize_unit_variant'));
    const matchTemplate=selectedTemplate(inventory,enumerate,text=>text.startsWith('match * #self_var'));
    const adapter=deriveDependencySource(dependencies,'serde_derive','src/fragment.rs');
    if(!adapter.source.includes('<Token![,]>::default().to_tokens(out)'))throw new TypeError('Pinned Match(Expr) adapter no longer appends a comma');
    bindingProofs.push({binding:'Match(Expr)',category:'expression plus comma',source:adapter.path,sourceSha256:adapter.sha256});
    branchProofs.push({predicate:'tag=External && !untagged && !skip && !serialize_with && style=Unit',value:true,source:variant.source,span:variant.span,basis:'actual unit variants and rename-only helper input'});
    const arms=input.variants.map((value,index)=>{
      const case_=inst(caseTemplate,{this_value:ident,variant_ident:leaf(value.name,'ident','original unit variant')},'original unit variant pattern');
      const value_=inst(bodyTemplate,{type_name:typeName,variant_index:leaf(String(index),'number','source-ordered variant enumeration'),variant_name:leaf(JSON.stringify(value.name),'string','Name::to_tokens literal category')},'externally tagged unit variant');
      return inst(armTemplate,{case:case_,body:compiler.matchExpression(value_,{role:'pinned Fragment::Match(Expr)',sourceSha256:adapter.sha256})},'source-ordered unit variant arm');
    });
    body=inst(matchTemplate,{self_var:leaf('self','ident','nonremote Parameters.self_var'),arms:compiler.sequence(arms,{role:'original variants.iter().enumerate()',variantSpans:input.variants.map(value=>value.span)})},'unit enum serializer body');
  }
  // allow_deprecated has two possible outputs. Both are separately confined;
  // this abstract proof does not guess which harmless output was selected.
  const deprecated=definition('src/deprecated.rs','allow_deprecated'),allowTemplate=selectedTemplate(inventory,deprecated,()=>true);
  const allow=inst(allowTemplate,{},'possible allow_deprecated attribute output');
  const implTemplate=selectedTemplate(inventory,expansion,text=>text.includes('impl #impl_generics _serde :: Serialize for #ident'));
  const impl=inst(implTemplate,{...common,body,allow_deprecated:allow},'nonremote Serialize impl');
  const serdeAlias=selectedTemplate(inventory,wrapper,text=>text.includes('extern crate serde as _serde'));
  const outer=selectedTemplate(inventory,wrapper,text=>text.includes('#use_serde')&&text.includes('#code'));
  const output=compiler.roundTrip(inst(outer,{use_serde:inst(serdeAlias,{},'default actual locked serde crate alias'),code:impl},'original anonymous const wrapper'));
  const observation=inspectQuoteFragment(output);
  if(observation.definitions.length||observation.macroExports.length||observation.bangCalls.length!==1||observation.bangCalls[0].writtenPath.join('::')!=='_serde::__require_serde_not_serde_core')throw new TypeError('Selected Serde output contains an unproved bang definition or call');
  const attributes=attributeOwnersForWholeSourceOperation({...original,context,module},certificate,new Set([...observation.attributes.map(attribute=>attribute.name),...certificate.attributes.map(attribute=>attribute.name)]));
  const fixedMacro=emptySerdeMacro(dependencies);
  // syn::Error builds only absolute core::compile_error with Literal::string,
  // and the input certificate already requires the actual standard core owner.
  const error=deriveDependencySource(dependencies,'syn','src/error.rs');
  if(!certificate.coreOwner||!error.source.includes('TokenTree::Literal(string)')||!error.source.includes('Ident::new("compile_error", start)'))throw new TypeError('Selected generator error output lacks its pinned literal/standard owner proof');
  const selectedOwners=certificate.owners.filter(owner=>owner.target.join('::')==='serde::Serialize'),residualOwners=certificate.owners.filter(owner=>owner.target.join('::')!=='serde::Serialize');
  const evidence={schema:'selected-serde-bang-footprint-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,deriveCertificateDigest:certificate.digest,dependenciesDigest:dependencies.digest,compilationProfile:certificate.compilationProfile,owners:selectedOwners,residualOwners,selectedOwnerBangComplete:true,inputStyle:input.style,fieldHelperInputs:fieldHelpers,inventoryDigest:inventory.digest,inventoryCounts:{sourceMembers:inventory.sourceMemberCount,quoteGroups:inventory.quoteCount},routes,branchProofs,bindingProofs,attributeOwners:attributes,fixedMacro,errorBranch:{source:error.path,sourceSha256:error.sha256,target:certificate.coreOwner.target,namespaceOutput:'compile-error only'},outputGrammarDigest:observation.fragmentSha256,semanticSyntaxRoundTrip:output.provenance.semanticRoundTrip===true,outputObservation:observation,dimensions:{bangMacroComplete:residualOwners.length===0,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['Serialize implementation behavior is not lowered','other original derives require separate output proofs','conditional modules and unrelated expansions retain independent namespace uncertainty']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate,output});return proof;
}
export const isSerdeSerializeBangFootprint=proof=>!!proof&&proofs.has(proof);
export function assertSerdeSerializeBangFootprint(proof,context,certificate){
  const state=proofs.get(proof);if(!state||state.context!==context||state.certificate!==certificate)throw new TypeError('Serialize output proof requires its original sealed invocation');return proof;
}

// Read only the complete output belonging to this exact private caller.
export function originalSerdeSerializeOutput(proof,context,certificate,module,item){
 assertSerdeSerializeBangFootprint(proof,context,certificate);const original=deriveFootprintOriginalModule(context,certificate),state=proofs.get(proof);
 if(!module||module.source!==original.source||module.sourceView!==original.sourceView||module.file!==original.file||JSON.stringify(module.path)!==JSON.stringify(original.path)||!item||item.start!==certificate.span.start||item.end!==certificate.span.end||item.name!==certificate.name||item.term!==certificate.kind||hash(original.source)!==certificate.sourceSha256||hash(original.source.slice(item.start,item.end))!==certificate.itemSha256)throw new TypeError('Serialize output requires its exact original source/view/span');
 return state.output;
}

const wholeOwnerOperation=createOriginalAttributeOwnerBulkOperation();
export function attributeOwnersForWholeSourceOperation(original,certificate,names){
  if(!wholeOwnerOperation.active())return attributeOwners(original,certificate,names);
  original=assertDeriveFootprintOriginalSelection(original,certificate);
  const current=wholeOwnerOperation.current(original.context);
  const {bindings}=current;
  const selected=bindings.scopes.filter(scope=>scope.file===certificate.source&&scope.path.length===original.module.path.length&&scope.path.every((part,index)=>part===original.module.path[index]));
  if(selected.length!==1)throw new TypeError('Generated attribute proof has no unique original source module');
  const ancestors=bindings.scopes.filter(scope=>scope.path.every((part,index)=>selected[0].path[index]===part));
  if(ancestors.some(scope=>macroScopeUncertain(scope,'attribute')))throw new TypeError('Generated builtin attribute namespace retains an unresolved ancestor');
  for(const name of names)if(ancestors.some(scope=>scope.bindings.some(binding=>binding.name===name&&macroBindingAffects(binding,'attribute'))))throw new TypeError('Generated builtin attribute is shadowed: '+name);
  return {names:[...names].sort(),scopes:ancestors.map(scope=>({source:scope.file,module:scope.path,configurationCondition:scope.configurationCondition,unresolvedAttributeMacroScope:scope.unresolvedAttributeMacroScope})),bindingsDigest:current.digest,compilationProfile:original.compilationProfile};
}
export function withWholeOriginalAttributeOwnerOperation(context,run,fallback){return wholeOwnerOperation.run(context,run,fallback);}
