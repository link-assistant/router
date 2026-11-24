import {crateModuleSourcePath} from './repository-layout.mjs';
// Explicit owned optional decoding, not general serde Deserialize admission.
// Source qualification selects the existing locked float_roundtrip adapter.
import {JSON_TYPES,JSON_CONTRACTS,JSON_DATA} from './extensions/json-contracts.mjs';
import {sameType} from './checked-types.mjs';
import {monomorphicTypeName} from './monomorphic.mjs';
import {SOURCE_STR} from './extensions/source-contract-types.mjs';
import {jsonRoundtripCandidateProfile,isJsonRoundtripCandidateProfile} from './json-roundtrip-capabilities.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {jsonMacroDependencyProfile} from './json-macro-inputs.mjs';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';

const qualified=originalDataFreezeIntrinsicsUnchanged(),names=new Set(['json_parse','json_parse_bytes']);
export const isRouterCoreJsonParse=name=>names.has(name);
const optionalJson={kind:'named',path:[monomorphicTypeName('Option',[JSON_TYPES.value])],rustStandardGeneric:{kind:'Option',arguments:[JSON_TYPES.value]}};
const borrowedBytes=JSON_CONTRACTS.find(row=>row.id==='serde_json_from_slice').params[0];
export const ROUTER_CORE_JSON_PARSE_CONTRACTS=Object.freeze(['json_parse','json_parse_bytes'].map(name=>Object.freeze({
 id:'router_core_'+name,jsExport:'router_core_'+name,rustPath:['crate','translation_core',name],kind:'function',family:'json-update',
 params:[name==='json_parse'?SOURCE_STR:borrowedBytes],ret:optionalJson,async:false,pure:true,constEligible:false,requiresRefinement:'genuine-router-owned-json-parse',
 assumptions:['Actual complete owned facade/primitive sources and the locked original float_roundtrip feature/source profile select this fixed API.',
  'The native Rust serde_json implementation remains untranslated; no generic Deserialize, Error Drop or old parser capability is granted.',
  'One borrowed input evaluates once. Successful parsing returns owned Some(Json), including Some(Null); JSON/UTF8 syntax failure returns None.',
  'The existing 1MiB input, 769 retained-mantissa/4096 digit and depth128 adapter bounds remain. Malformed adapter values and resource-domain failures throw instead of returning None.',
  'Canonical numeric constructors, signed zero, original lexical rounding, duplicate-key last value and UTF8-sorted keys retain the existing roundtrip runtime domain.'],
})));
const fail=()=>{throw new TypeError('Owned JSON parse requires its exact facade, leaf and locked roundtrip source profile');};
export function parseRouterCoreJsonParse(parser,path){
 const c=parser.cursor;if(!['crate','::','translation_core','::'].every((word,at)=>c.is(word,at))||[0,2,4].some(at=>c.peek(at).kind!=='identifier')||!names.has(c.peek(4).value))return null;
 if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();
 const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser),inputProof=originalMatchesDependencyProof(state.facts),inputs=deriveDependencyOriginalInputs(inputProof),dependencies=jsonMacroDependencyProfile(inputs).proof;
 if(!dependencies)fail();const profile=jsonRoundtripCandidateProfile({dependencies,compilationProfile:state.facts.compilationProfile});if(!isJsonRoundtripCandidateProfile(profile))fail();
 const leaves=state.facts.modules.filter(module=>module.path.join('::')==='translation_core::primitives'),leaf=leaves[0];
 if(leaves.length!==1||leaf.file!==crateModuleSourcePath(state.facts.modules,'src/translation_core/primitives.rs')||leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE||leaf.configurationCondition!=='active'||!leaf.sourceView)fail();const declarations=originalSourceModuleItems(leaf),selected=declarations.filter(item=>item.term==='fn'&&item.name===c.peek(4).value);
 const definition=c.peek(4).value==='json_parse'?'pub fn json_parse(value: &Str) -> Maybe<Json> {\n    ::serde_json::from_str::<Json>(value).ok()\n}':'pub fn json_parse_bytes(value: &[u8]) -> Maybe<Json> {\n    ::serde_json::from_slice::<Json>(value).ok()\n}';
 const source=selected[0]?.tokens.filter(token=>token.type!=='comment'),fn=source?.findIndex(token=>token.text==='fn');
 if(selected.length!==1||fn<1||source[fn-1].text!=='pub'||leaf.source.slice(source[fn-1].start,selected[0].end)!==definition||!state.facts.modules.find(module=>module.path.join('::')==='translation_core')?.source.includes('pub use self::primitives::{json_parse, json_parse_bytes};'))fail();
 const tokens=c.tokens,start=c.index,first=c.peek(),operation=c.peek(4).value;
 const stage=createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-parse:reparse-complete-native-contract-and-feature-profile',apply:()=>{const value=transportConcreteSyntaxSource(leaf.source,{language:'Rust'});if(value.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail();return value;}}]},
  {phase:'repository',rules:[{id:'router-core:select-qualified-optional-json-decoder',apply:value=>value}]},
 ]).run(null);
 const current=index=>{requireRouterCoreFacadeCurrent(parser,facade);if(!originalDataFreezeIntrinsicsUnchanged()||matchesParserFacts(parser)!==state||originalMatchesDependencyProof(state.facts)!==inputProof||deriveDependencyOriginalInputs(inputProof)!==inputs||leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE||parser.cursor!==c||c.tokens!==tokens||c.index!==index)fail();};
 current(start);c.index+=5;c.expect('(','owned JSON parse');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned JSON parse');current(c.index);
 return {node:{k:'routerCoreJsonUpdateCall',operation,args,span:{start:first.start,end:last.end}},trace:stage.trace,numericProfile:{schema:profile.schema,sourceProfileSha256:profile.sourceProfileSha256,dependencyDigest:profile.dependencyDigest,features:profile.features.features,sources:profile.sources,domain:profile.domain}};
}
function canonical(checker,type,path,span){
 const expected=checker.hostType(JSON_TYPES.value,path,span),entry=type?.kind==='data'?checker.items.get(type.name):null,wanted=JSON_DATA[0].items.find(row=>row.name==='Value');
 if(!sameType(type,expected)||entry?.hostTypePath?.join('::')!=='serde_json::Value'||entry.generated!=='router-json-contract'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||entry.ctors.length!==wanted.ctors.length)throw unsupported('owned JSON parse result','requires the actual canonical owned Json layout',span);
 for(let at=0;at<wanted.ctors.length;at++){const a=entry.ctors[at],b=wanted.ctors[at];if(a.name!==b.name||a.fields.length!==b.fields.length)fail();for(let index=0;index<b.fields.length;index++){const actual=checker.resolveType(a.fields[index].type,entry.modulePath,span),expected=checker.hostType(b.fields[index].type,entry.modulePath,span);if(a.fields[index].name!==b.fields[index].name||!sameType(actual,expected))fail();checker.expectedOwnership(actual,expected,path,span);checker.expectedPrimitiveIdentity(actual,expected,path,span);}}
 return expected;
}
export function checkRouterCoreJsonParse(checker,node,env,path,expected){
 const current=()=>{requireOriginalPrimitiveTryFromChecker(checker);if(!qualified||!originalDataFreezeIntrinsicsUnchanged())fail();};current();if(node.args.length!==1)throw typeError('owned JSON parse needs one borrowed input',node.span);
 const value=checker.expr(node.args[0],env,path),type=value.type;current();
 if(node.operation==='json_parse'){
  if(type.kind!=='string'||type.rustReference||type.rustOwnership?.kind!=='borrowed'||type.rustOwnership.source!=='str'||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved)throw unsupported('owned JSON parse input','requires actual borrowed scalar text',node.span);
 }else{
  const pointee=type.rustReference?.pointee,byte=t=>t?.kind==='fixed'&&t.bits===8&&t.signed===false&&t.rustPrimitiveName==='u8'&&t.rustSourceType===true&&!t.rustReference&&!t.rustOwnership&&!t.patternOwnershipRefusal&&!t.rustBorrowingUnresolved&&!t.rustGenericIdentityUnresolved;
  const slice=t=>t?.kind==='array'&&t.rustSourceType===true&&t.rustOwnership?.kind==='borrowed'&&t.rustOwnership.source==='slice'&&!t.rustFixedArray&&!t.rustBorrowingUnresolved&&!t.rustGenericIdentityUnresolved&&byte(t.element);
  if(type.rustReference?.kind!=='shared'||!slice(type)||!slice(pointee)||pointee.rustReference||pointee.patternOwnershipRefusal||type.patternOwnershipRefusal!=='shared source reference'||type.rustReference.tokens?.[0]?.value!=='&'||!sameType(type.element,pointee.element))throw unsupported('owned JSON parse byte input','requires one actual shared source u8 slice',node.span);
  checker.expectedOwnership(type.element,pointee.element,path,node.span);checker.expectedPrimitiveIdentity(type.element,pointee.element,path,node.span);
 }
 const json=canonical(checker,checker.hostType(JSON_TYPES.value,path,node.span),path,node.span),result=checker.instantiations.option(json,node.span),owner=checker.items.get(result.name);
 if(owner?.standardGeneric?.kind!=='Option'||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)fail();
 const some=owner.ctors.find(row=>row.name==='Some'),none=owner.ctors.find(row=>row.name==='None');if(some?.fields.length!==1||some.fields[0].name!=='field0'||none?.fields.length!==0)fail();
 for(const written of [owner.standardGeneric.arguments[0],some.fields[0].type])canonical(checker,checker.resolveType(written,owner.modulePath,node.span),path,node.span);
 if(expected){if(!sameType(result,expected))throw typeError('owned JSON parse result type differs',node.span);checker.expectedOwnership(result,expected,path,node.span);checker.expectedPrimitiveIdentity(result,expected,path,node.span);}current();
 return {k:'routerHostCall',id:'router_core_'+node.operation,args:[value],type:result,constEligible:false,span:node.span};
}
