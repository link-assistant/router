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
const generated=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original Default AST lowering: '+message);};
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
  // Any original explicit impl for this target is a coherence obligation;
  // even an unsupported/conditional header cannot be silently overwritten.
  if(originalSourceModuleItems(original).some(candidate=>candidate.term==='impl'&&candidate.tokens.some(token=>token.text==='Default')&&candidate.tokens.some(token=>token.text===item.name)))fail('manual and generated Default may overlap');
  const args={dependencies:state.dependencies,source:original.source,span:{start:item.start,end:item.end},owner:'Default'},output=proveBuiltinScalarSourceOutput(args);
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
export function assertOriginalDefaultGeneratedMethod(surface,context){const state=generated.get(surface);if(!state||state.context!==context||hash(JSON.stringify(surface))!==state.digest)fail('surface is copied, changed or rebound');assertBuiltinScalarSourceOutput(state.output,state.args);return surface;}
export function originalDefaultGeneratedMethods(context,module,Parser){
  const state=defaultSourceContextFacts(context),methods=[],refused=[];
  for(const item of originalSourceModuleItems(module).filter(item=>item.term==='struct'&&itemConfiguration(item.tokens,state.compilationProfile).status==='active')){
    let input;try{input=inspectDeriveInput(item,state.compilationProfile);}catch{continue;}
    if(!input.derives.some(row=>same(row.path,['Default'])))continue;
    try{methods.push({item,surface:originalDefaultGeneratedMethod(context,module,item,Parser)});}catch(error){if(!(error instanceof TypeError))throw error;refused.push({item,message:error.message});}
  }
  return {methods,refused};
}
