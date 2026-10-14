// Lower a privately selected original compiler Default AST sink to ordinary
// record IR. Primitive calls use the independently parsed original Rust impls.
// No Rust function printer, JavaScript body template or per-owner table.
import {createHash} from 'node:crypto';
import {assertDefaultCaller,defaultSourceContextFacts} from './default-trait-source.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {deriveFootprintAt} from './derive-footprints.mjs';
import {proveBuiltinScalarSourceOutput,assertBuiltinScalarSourceOutput,builtinScalarOriginalSourcePlan} from './builtin-scalar-ast-route.mjs';
import {pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence} from './extensions/standard-body-source.mjs';
// This execution bridge is above the parser layer. The trait identity leaf
// never imports this module, so impl/data loading cannot acquire a Host edge.
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {astSyntaxText} from './builtin-derive-ast-meta.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {originalUnitDefaultSource,assertOriginalUnitDefaultSource,assertOriginalDefaultCoherence} from './default-unit-source.mjs';
import {originalBuiltinDefaultBangOutput} from './builtin-derive-bang-footprints.mjs';
import {validateBuiltinDefaultAstOutput} from './builtin-default-ast-route.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {moduleScopeKey} from './source-module-views.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
const generated=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original Default AST lowering: '+message);};
function originalFieldType(state,module,field,Parser){
  const scope=state.binding.scopes.find(row=>moduleScopeKey(row)===moduleScopeKey(module));if(!scope)fail('field original scope is absent');
  const parser=new Parser(tokenizeRust(module.source));configureParserSourceScope(parser,scope,state.binding.scopes,module.path);parser.modulePath=[...module.path];
  const snapshot=originalHostParserIdentitySnapshot(),identity=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};identity();
  parser.cursor.index=parser.cursor.tokens.findIndex(token=>token.start===field.typeSpan.start);if(parser.cursor.index<0)fail('field type has no actual original token boundary');
  const first=parser.cursor.index;let type;
  try{type=parser.type();}catch(error){if(!(error instanceof TranslationError))throw error;fail('field original type remains unproved: '+error.message);}
  const last=parser.cursor.tokens[parser.cursor.index-1];
  identity();
  if(last?.end!==field.typeSpan.end||module.source.slice(field.typeSpan.start,field.typeSpan.end)!==field.typeSource)fail('field complete original type span differs');
  const syntax=parser.cursor.tokens.slice(first,parser.cursor.index).map(token=>token.value),generic=type.rustGeneratedTypeOwner&&parser.genericTypes.get(type.rustGeneratedTypeOwner.name);
  let owner;
  if(type.kind==='string'&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String')owner='String';
  else if(type.kind==='array'&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec')owner='Vec';
  else if(generic?.standardGeneric?.kind==='Option'&&generic.standardGeneric.arguments.length===1)owner='Option';
  else if(['bool','fixed','float','string'].includes(type.kind)&&syntax.length===1&&!type.rustReference&&!type.rustOwnership)owner=syntax[0];
  if(!owner)fail('field needs an actual supported standard Default implementation: '+field.typeSource);
  return {type,owner,syntax,generic:generic??null,sourceScopeSha256:hash(JSON.stringify(scope)),typeSpan:field.typeSpan};
}
function originalContainerGeneratedMethod(context,state,original,item,Parser,certificate,invocation){
  if(!certificate)fail('named field route requires its genuine original input certificate');
  const joined=originalBuiltinDefaultBangOutput({context:state.deriveContext,certificate,invocation}),{route,output,plan}=joined;
  validateBuiltinDefaultAstOutput(route,output);
  const method=output.items[0],statement=method?.body?.statements?.[0],body=statement?.expr,slots=body?.slots;
  if(output.items.length!==1||method.name!=='default'||method.parameters.length||method.generics.length||method.header.constness!=='No'||method.body.statements.length!==1||statement.variant!=='Expr'||body.constructor.variant.name!=='Struct'||!same(slots.path?.segments,[item.name])||slots.fields.length!==route.typedSource.fields.length)fail('original complete named Default method/body slots differ');
  const selected=[],fields=slots.fields.map((field,index)=>{
    const originalField=route.typedSource.fields[index],call=field.expr,callee=call?.slots?.callee,segments=callee?.slots?.path?.segments;
    if(field.ident!==originalField.name||field.attrs.length||field.is_placeholder||call?.constructor?.variant?.name!=='Call'||call.slots.args.length||callee?.constructor?.variant?.name!=='Path'||segments?.length!==4||segments[0]?.symbol!=='kw::DollarCrate'||!same(segments.slice(1),['default','Default','default']))fail('original field Default call/type/hygiene slots differ');
    const fieldType=originalFieldType(state,original,originalField,Parser),selection=pinnedDefaultBody(fieldType.owner),parsed=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(parsed);
    if(selection.evidence.trait!=='core::default::Default'||selection.evidence.owner!==fieldType.owner)fail('field selected original trait body differs');
    let value=parsed;
    if(fieldType.owner==='Option'){
      if(parsed.k!=='name'||!same(parsed.path,['None'])||selection.evidence.genericParameters?.join(',')!=='T'||selection.evidence.payloadDefaultBound!==false)fail('original Option Default is not its bound-free None body');
      value={k:'routerRegisteredConstructor',kind:'Option',constructor:parsed.path[0],args:[],span:parsed.span};
    }
    const relocate=node=>Array.isArray(node)?node.map(relocate):node&&typeof node==='object'?Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='span'?{...originalField.span}:relocate(value)])):node;
    selected.push({field:originalField.name,fieldType,selection,syntaxSha256:syntax.syntaxSha256,originalBody:parsed,loweredBody:value,allocatorInternalsCompiled:false});return {name:field.ident,value:relocate(value)};
  });
  const typePath=['crate',...original.path,item.name],methodName=context.keywordSymbols.Default.value;if(methodName!=='default')fail('original Default keyword differs');
  const span={start:item.start,end:item.end},name=`ml_impl_${Buffer.from(typePath.join('.')).toString('hex')}_${Buffer.from(methodName).toString('hex')}`;
  const sourceProof={schema:'original-generated-container-default-ir-v1',contextDigest:context.digest,source:original.file,sourceSha256:route.sourceSha256,span:route.span,itemSha256:route.itemSha256,originalOutputDigest:route.digest,originalCompilerPlanDigest:plan.digest,methodDescriptor:plan.method.digest,sourceBangProof:joined.proof,fields:selected,bodyMapped:true,checkedBody:false,wholeCompilerExecuted:false,wholeTraitTranslated:false,allocatorInternalsCompiled:false,runtimeParity:false};
  const surface={k:'fn',name,params:[],ret:{kind:'named',path:typePath,rustSourceType:true,span},body:{k:'routerRecord',path:typePath,fields,span},span,async:false,generated:'router-source-generated-default-method',impl:{type:{kind:'named',path:typePath},method:methodName,receiver:null,receiverName:null,defaultSourceProof:sourceProof,assumptions:['Complete original named Default AST field sinks select actual standard bodies; the ordinary checker must validate all field types and owned constructors.']}};
  generated.set(surface,{context,module:original,item,containerRoute:route,containerOutput:output,digest:hash(JSON.stringify(surface))});return surface;
}
export function originalDefaultGeneratedMethod(context,module,item,Parser){
  if(Parser!==HostRustParser)fail('primitive bodies require the actual original Host parser');
  const {state,original}=assertDefaultCaller(context,module);
  const selectedItem=originalSourceModuleItems(original).find(candidate=>candidate.start===item.start&&candidate.end===item.end&&candidate.name===item.name);
  if(!selectedItem||!same(selectedItem.tokens,item.tokens))fail('original declaration differs');
  item=selectedItem;
  const input=inspectDeriveInput(item,state.compilationProfile),defaults=input.derives.filter(row=>same(row.path,['Default']));
  if(defaults.length!==1)fail('one actual original builtin Default invocation required');
  if(input.genericParameters||input.lifetimeParameters)fail('generic generated method remains unproved');
  const certificate=deriveFootprintAt(state.deriveContext,original,item);
  if(input.attributes.some(attribute=>attribute.helpers)&&!certificate)fail('helper owner lacks its genuine original certificate');
  assertOriginalDefaultCoherence(context,original,item);
  // Any original explicit impl for this target is a coherence obligation;
  // even an unsupported/conditional header cannot be silently overwritten.
  if(originalSourceModuleItems(original).some(candidate=>candidate.term==='impl'&&candidate.tokens.some(token=>token.text==='Default')&&candidate.tokens.some(token=>token.text===item.name)))fail('manual and generated Default may overlap');
  if(item.term==='enum'){
    const unitSource=originalUnitDefaultSource(context,original,item),typePath=unitSource.typePath,methodName=context.keywordSymbols.Default.value;
    if(methodName!=='default')fail('original Default keyword data differs');
    const name=`ml_impl_${Buffer.from(typePath.join('.')).toString('hex')}_${Buffer.from(methodName).toString('hex')}`,span={start:item.start,end:item.end};
    const sourceProof={schema:'original-generated-unit-default-ir-v1',contextDigest:context.digest,source:original.file,sourceSha256:unitSource.sourceSha256,span:unitSource.span,itemSha256:unitSource.itemSha256,typePath,unitSourceProof:unitSource,bodyMapped:true,checkedBody:false,wholeCompilerExecuted:false,wholeTraitTranslated:false,runtimeParity:false};
    const surface={k:'fn',name,params:[],ret:{kind:'named',path:typePath,rustSourceType:true,span},body:{k:'routerRecord',path:[...typePath,unitSource.selectedVariant.variant.name],fields:[],span},span,async:false,generated:'router-source-generated-default-method',impl:{type:{kind:'named',path:typePath},method:methodName,receiver:null,receiverName:null,defaultSourceProof:sourceProof,assumptions:['Original unit Default path selected; the ordinary checker must validate its exact owned unit constructor.']}};
    generated.set(surface,{context,module:original,item,unitSource,digest:hash(JSON.stringify(surface))});return surface;
  }
  const args={dependencies:state.dependencies,source:original.source,span:{start:item.start,end:item.end},owner:'Default'};let output;
  try{output=proveBuiltinScalarSourceOutput(args);}catch(error){if(!(error instanceof TypeError))throw error;return originalContainerGeneratedMethod(context,state,original,item,Parser,certificate,defaults[0]);}
  assertBuiltinScalarSourceOutput(output,args);const plan=builtinScalarOriginalSourcePlan(output);
  for(const [name,expected]of [['name','kw :: Default'],['nonself_args','Vec :: new ()'],['ret_ty','Self_'],['explicit_self','false']]){
    const field=plan.descriptors.Default.method.fields.find(field=>field.name===name);
    if(!field||astSyntaxText(field.expression)!==expected)fail('original MethodDef signature slot differs: '+name);
  }
  const methodName=context.keywordSymbols.Default.value;
  if(methodName!=='default'||context.keywordSymbols.DollarCrate.value!=='$crate')fail('original keyword data does not join the selected standard trait signature/hygiene');
  if(output.branches.length!==1)fail('selected original field-default branch is ambiguous');
  const branch=output.branches[0],body=branch.body,slots=body.slots;
  if(body.kind!=='Expr'||!slots||!same(slots.path?.segments,[item.name])||slots.fields?.length!==output.input.fields.length)fail('original record AST slots differ');
  const selected=[];
  const fields=slots.fields.map((field,index)=>{
    const originalField=output.input.fields[index],call=field.expr,callee=call?.slots?.expr,segments=callee?.slots?.path?.segments;
    if(field.kind!=='ExprField'||field.ident!==originalField.name||field.attrs?.length||field.is_placeholder!==false||call?.slots?.args?.length!==0||segments?.length!==4||segments[0]?.symbol!=='kw::DollarCrate'||segments[0]?.hygiene!=='original with_def_site_ctxt(DUMMY_SP) std_path recipe'||!same(segments.slice(1),['default','Default','default']))fail('original standard Default call/field/hygiene slots differ');
    const selection=pinnedDefaultBody(originalField.type),parser=new Parser(tokenizeRust(selection.method.bodySource));
    assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(originalHostParserIdentitySnapshot().parserMethods));
    assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(originalHostParserIdentitySnapshot().cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
    const parsed=parsePinnedBody(Parser,selection),syntax=parsedPinnedBodyEvidence(parsed);
    if(selection.evidence.owner!==originalField.type||selection.evidence.trait!=='core::default::Default')fail('field dispatch differs from original primitive impl');
    // Preserve the complete selected primitive body and its source evidence;
    // relocation uses the original field only for caller refusal attribution.
    selected.push({field:originalField.name,type:originalField.type,selection,syntaxSha256:syntax.syntaxSha256,originalBody:parsed});
    const relocate=node=>Array.isArray(node)?node.map(relocate):node&&typeof node==='object'?Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='span'?{...originalField.span}:relocate(value)])):node;
    return {name:field.ident,value:relocate(parsed)};
  });
  const typePath=['crate',...original.path,item.name],name=`ml_impl_${Buffer.from(typePath.join('.')).toString('hex')}_${Buffer.from(methodName).toString('hex')}`;
  const sourceProof={schema:'original-generated-default-ir-v1',contextDigest:context.digest,source:original.file,sourceSha256:output.sourceSha256,span:output.span,itemSha256:output.itemSha256,originalOutputDigest:output.digest,originalCompilerPlanDigest:plan.digest,methodDescriptor:plan.descriptors.Default.method.digest,selectedBranch:branch.feature,hygiene:slots.fields.map(field=>field.expr.slots.expr.slots.path.segments[0]),fields:selected,bodyMapped:true,checkedBody:false,wholeCompilerExecuted:false,wholeTraitTranslated:false,runtimeParity:false};
  const span={start:item.start,end:item.end},surface={k:'fn',name,params:[],ret:{kind:'named',path:typePath,rustSourceType:true,span},body:{k:'routerRecord',path:typePath,fields,span},span,async:false,generated:'router-source-generated-default-method',impl:{type:{kind:'named',path:typePath},method:'default',receiver:null,receiverName:null,defaultSourceProof:sourceProof,assumptions:['Original standard Default signature and primitive implementation calls selected; the ordinary checker must validate the whole generated record body.']}};
  generated.set(surface,{context,module:original,item,output,args,digest:hash(JSON.stringify(surface))});return surface;
}
export function assertOriginalDefaultGeneratedMethod(surface,context){const state=generated.get(surface);if(!state||state.context!==context||hash(JSON.stringify(surface))!==state.digest)fail('surface is copied, changed or rebound');if(state.unitSource)assertOriginalUnitDefaultSource(state.unitSource,context,state.module,state.item);else if(state.containerRoute)validateBuiltinDefaultAstOutput(state.containerRoute,state.containerOutput);else assertBuiltinScalarSourceOutput(state.output,state.args);return surface;}
export function originalDefaultGeneratedMethods(context,module,Parser){
  const state=defaultSourceContextFacts(context),methods=[],refused=[];
  for(const item of originalSourceModuleItems(module).filter(item=>['struct','enum'].includes(item.term)&&itemConfiguration(item.tokens,state.compilationProfile).status==='active')){
    let input;try{input=inspectDeriveInput(item,state.compilationProfile);}catch{continue;}
    if(!input.derives.some(row=>same(row.path,['Default'])))continue;
    try{methods.push({item,surface:originalDefaultGeneratedMethod(context,module,item,Parser)});}catch(error){if(!(error instanceof TypeError))throw error;refused.push({item,message:error.message});}
  }
  return {methods,refused};
}
