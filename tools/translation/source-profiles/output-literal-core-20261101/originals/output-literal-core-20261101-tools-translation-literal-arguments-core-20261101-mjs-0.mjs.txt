// Qualified owned static-piece operations. No std Arguments/builtin admission.
import {types} from 'node:util';
import {rustTokens} from './rust-structure.mjs';
import {BOOL,fixed,sameType} from './checked-types.mjs';
import {SOURCE_STR} from './extensions/source-contract-types.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalCargoEditionEvidence} from './cargo-edition-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveNominalImplTarget} from './project-nominal.mjs';
import {crateModuleSourcePath} from './repository-layout.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedDeclarationSource,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {validateOwnedJsonFlow} from './owned-json-flow.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE,LITERAL_ARGUMENTS_FACADE_SOURCE,LITERAL_ARGUMENTS_SOURCE_PROFILE} from './literal-arguments-core-20261101-source.mjs';
const TYPE_NAME='ml_LiteralArgumentsCoreStatic',CARRIER=Object.freeze({kind:'data',name:TYPE_NAME}),COUNT=Object.freeze({...fixed(64,false),rustPrimitiveName:'u64'}),MAX=2097152;
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const LITERAL_ARGUMENTS_DATA=freeze([{k:'data',name:TYPE_NAME,ctors:[{name:TYPE_NAME,fields:[]}]}]);
const make=(suffix,leaf,params,ret)=>freeze({id:'literal_arguments_'+suffix,jsExport:'literal_arguments_'+suffix,rustPath:['crate','translation_core',leaf],kind:'function',family:'literal-arguments-core-20261101',params,ret,async:false,pure:true,constEligible:false,requiresRefinement:'original-owned-static-literal-arguments',profile:'owned-literal-static-pieces-v1',assumptions:['Actual complete owned facade/leaf source and original qualified call are rejoined.','Static pieces are empty or one direct source string literal, not runtime arguments.','Carrier is move-only and consumed exactly once; no fields or borrowed return escape.','This owned ABI does not identify std::fmt::Arguments, a builtin, or any output sink.']});
export const LITERAL_ARGUMENTS_CONTRACTS=freeze([make('empty','literal_arguments',[],CARRIER),make('literal','literal_arguments',[SOURCE_STR],CARRIER),make('piece_count','literal_arguments_piece_count',[CARRIER],COUNT),make('byte_len','literal_arguments_byte_len',[CARRIER],COUNT),make('is_empty','literal_arguments_is_empty',[CARRIER],BOOL)]);
const raw=new WeakMap(),captures=new WeakMap(),issued=new WeakMap();let frame=null;
const fail=message=>{throw new TypeError('Owned literal arguments: '+message);};
const validate=run=>withSourceInputValidation(run);
export const literalArgumentsCoreActive=()=>frame!==null;
export const literalArgumentsHostData=()=>frame?LITERAL_ARGUMENTS_DATA:[];
export function withLiteralArgumentsCore(run){
 requireSynchronousSourceCallback(run);if(frame)fail('one synchronous whole-project operation required');const current={observed:new Set(),activeEntries:new WeakSet()};
 return withSourceFailureOperation(()=>{frame=current;try{return withCompleteSourceClosingFence(run,[()=>validate(()=>{let failed=false,error;for(const close of current.observed)try{close();}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;})]);}finally{current.observed.clear();frame=null;}});
}
function same(actual,expected,budget={cells:200000},depth=0){
 if(--budget.cells<0||depth>160)return false;if(actual===expected)return true;
 if(!actual||!expected||typeof actual!=='object'||typeof expected!=='object'||types.isProxy(actual)||types.isProxy(expected)||Array.isArray(actual)!==Array.isArray(expected)||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(actual)))return false;
 const keys=Reflect.ownKeys(actual),wanted=Reflect.ownKeys(expected);if(keys.length!==wanted.length)return false;
 for(const key of wanted){if(typeof key!=='string')return false;const a=Object.getOwnPropertyDescriptor(actual,key),b=Object.getOwnPropertyDescriptor(expected,key);if(!a||!b||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||!same(a.value,b.value,budget,depth+1))return false;}return true;
}
function sourceLeaf(parser){
 const state=matchesParserFacts(parser),modules=state.facts.modules,core=modules.filter(row=>row.path.join('::')==='translation_core'),leaves=modules.filter(row=>row.path.join('::')==='translation_core::literal_arguments_core_20261101');
 if(core.length!==1||leaves.length!==1||core[0].source!==LITERAL_ARGUMENTS_FACADE_SOURCE)fail('complete actual owned facade required');const leaf=leaves[0];
 if(leaf.file!==crateModuleSourcePath(modules,'src/translation_core/literal_arguments_core_20261101.rs')||leaf.source!==LITERAL_ARGUMENTS_LEAF_SOURCE||leaf.configurationCondition!=='active')fail('complete actual static-piece leaf required');
 const items=originalSourceModuleItems(core[0]).filter(item=>item.term==='mod'&&item.name==='literal_arguments_core_20261101');if(items.length!==1||core[0].source.slice(items[0].start,items[0].end)!=='mod literal_arguments_core_20261101;')fail('one original unmodified tracked leaf declaration required');
 const scope=state.facts.evidence.scopes.find(row=>row.file===core[0].file&&row.path.join('::')==='translation_core'),bindings=scope?.bindings.filter(row=>row.name==='literal_arguments_core_20261101'&&row.namespace==='type');
 if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='mod'||bindings[0].via!=='declaration'||bindings[0].source!==core[0].file||bindings[0].span.start!==items[0].start||bindings[0].span.end!==items[0].end||bindings[0].target?.join('::')!=='crate::translation_core::literal_arguments_core_20261101'||bindings[0].declaration?.source!==core[0].file||bindings[0].declaration?.span?.start!==items[0].start||bindings[0].declaration?.span?.end!==items[0].end)fail('genuine exact leaf binding required');
 const scopes=state.facts.evidence.scopes,root=scopes.find(row=>row.path.length===0),caller=state.module.path,related=scopes.filter(row=>row.path.every((name,at)=>caller[at]===name)||row===scope||row.file===leaf.file&&row.path.join('::')==='translation_core::literal_arguments_core_20261101');
 if(!root||related.some(row=>row.configurationCondition!=='active'||row.unresolvedTypeScope!==false||row.unresolvedBangMacroScope!==false||row.unresolvedAttributeMacroScope!==false||row.bindings.some(binding=>binding.namespace==='type'&&['std','core','alloc'].includes(binding.name))))fail('original caller/library type, bang, attribute or standard-root identity remains unresolved');
 for(const module of modules.filter(module=>module.path.every((name,at)=>caller[at]===name)))for(const item of originalSourceModuleItems(module))if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'&&item.tokens.some(token=>['no_std','no_core','no_implicit_prelude'].includes(token.text)))fail('original standard source profile is disabled');
 const definitions=originalSourceModuleItems(core[0]).filter(item=>item.name==='__router_translation_core_literal_arguments_20261101'&&item.term==='macro_rules!'),aliases=originalSourceModuleItems(core[0]).filter(item=>item.term==='use'&&core[0].source.slice(item.start,item.end)==='pub use crate::__router_translation_core_literal_arguments_20261101 as literal_arguments;'),hidden=root.bindings.filter(binding=>binding.namespace==='macro'&&binding.name==='__router_translation_core_literal_arguments_20261101'),selected=scope.bindings.filter(binding=>binding.namespace==='macro'&&binding.name==='literal_arguments');
 const original=binding=>binding.status==='resolved'&&binding.macroKind==='bang'&&binding.target?.join('::')==='crate::__router_translation_core_literal_arguments_20261101'&&binding.declaration?.source===core[0].file&&binding.declaration.span.start===definitions[0]?.start&&binding.declaration.span.end===definitions[0]?.end;
 if(definitions.length!==1||aliases.length!==1||hidden.length!==1||selected.length!==1||!original(hidden[0])||!original(selected[0])||selected[0].via!=='named-import'||selected[0].source!==core[0].file||selected[0].span.start!==aliases[0].start||selected[0].span.end!==aliases[0].end)fail('exact original qualified macro declaration/reexport binding required');
 const edition=state.facts.cargoEditionContext&&originalCargoEditionEvidence(state.facts.cargoEditionContext);if(edition?.status!=='explicit-package-edition'||edition.edition!==LITERAL_ARGUMENTS_SOURCE_PROFILE.definitionEdition)fail('actual explicit package edition2024 required');
 // The immutable leaf seals Drop/Copy coherence. Invalid duplicate source impls
 // must still refuse before translation; do not defer that obligation to rustc.
 const carrierFamily=['crate','translation_core','literal_arguments_core_20261101','LiteralArguments'];
 for(const module of modules){if(module===leaf||module===core[0])continue;const originals=originalSourceModuleItems(module);for(const item of originals)if(item.term==='impl'){
  const target=resolveNominalImplTarget({span:{start:item.start,end:item.end}},{...module,items:originals},scopes);
  if(!target||same(target.family,carrierFamily))fail('external implementation target is unresolved or overlaps the exact owned carrier');
 }}
 originalSourceModuleItems(leaf);return {state,leaf};
}
function current(receipt){validate(()=>{requireRouterCoreFacadeCurrent(receipt.parser,receipt.facade);const value=sourceLeaf(receipt.parser);if(value.state!==receipt.state||value.leaf!==receipt.leaf||value.leaf.sourceView!==receipt.view)fail('original source/view/profile changed');});}
function guarded(run,span){try{return validate(run);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('owned literal arguments',error.message,span);}}
export function parseLiteralArgumentsCore(parser,path){
 const c=parser.cursor,leaf=c.peek(4)?.value,constructor=leaf==='literal_arguments',index=LITERAL_ARGUMENTS_CONTRACTS.findIndex(row=>row.rustPath.at(-1)===leaf);
 if(!frame||index<0||!['crate','::','translation_core','::',leaf].every((word,at)=>c.is(word,at)))return null;
 if(c.peek().kind!=='identifier'||c.peek(2).kind!=='identifier'||c.peek(4).kind!==(constructor?'macro':'identifier'))return null;
 const first=c.peek(),start=c.index,tokens=c.tokens,source=guarded(()=>sourceLeaf(parser),first),facade=guarded(()=>requireRouterCoreFacade(parser),first),receipt={parser,facade,state:source.state,leaf:source.leaf,view:source.leaf.sourceView};
 const trace=createRulePipeline([{phase:'language',rules:[{id:'language:whole-owned-static-piece-facade-CST',apply:()=>{const stage=transportConcreteSyntaxSource(source.leaf.source,{language:'Rust'});if(transportConcreteSyntaxMeta(stage.meta).source!==source.leaf.source)fail('whole native leaf CST inverse');return stage;}}]},{phase:'repository',rules:[{id:'repository:qualified-zero-runtime-argument-static-pieces',apply:value=>value}]}]).run(null).trace;
 if(c.index!==start||c.tokens!==tokens)fail('cursor changed during source selection');c.index+=5;c.expect('(','owned literal arguments');const args=[];
 if(constructor){if(!c.is(')')){if(c.peek().kind!=='string')throw unsupported('static literal arguments','requires a direct source string token',c.peek());const arg=parser.expr(path);if(arg.k!=='str'||typeof arg.value!=='string'||/\p{Surrogate}/u.test(arg.value)||arg.value.length>MAX||Buffer.byteLength(arg.value)>MAX)throw unsupported('static literal arguments','requires one bounded original string literal',arg.span);args.push(arg);}if(!c.is(')'))throw unsupported('static literal arguments','runtime arguments, grouping, concatenation and trailing comma are outside this profile',c.peek());}
 else{args.push(parser.expr(path));if(!c.is(')'))throw unsupported('literal inspection','requires exactly one by-value carrier',c.peek());}
 const last=c.expect(')','owned literal arguments'),node={k:'literalArgumentsCoreCall',args,span:{start:first.start,end:last.end}},contract=constructor?LITERAL_ARGUMENTS_CONTRACTS[args.length?1:0]:LITERAL_ARGUMENTS_CONTRACTS[index];
 current(receipt);raw.set(node,{...receipt,contract,trace,syntax:copyMetadata(node),literal:constructor&&args.length?args[0].value:null});return node;
}
export function captureLiteralArgumentsCore(checker,surface){
 const nodes=new WeakMap();let observed=false;function visit(node,owner,depth=0){if(!node||typeof node!=='object'||depth>160)return;
  if(node.k==='literalArgumentsCoreCall'){if(!observed){requireOriginalPrimitiveTryFromChecker(checker);observed=true;}const origin=originalParsedSyntaxNode(owner,node),receipt=origin&&raw.get(origin.original);if(origin?.actual===node&&receipt?.parser===origin.parser&&same(origin.original,receipt.syntax)&&same(node,origin.relocated))nodes.set(node,{owner,receipt,syntax:copyMetadata(node)});}
  for(const [key,value]of Object.entries(node))if(!['type','span'].includes(key))for(const child of Array.isArray(value)?value:[value])visit(child,owner,depth+1);
 }
 function items(rows){for(const item of rows)if(item.k==='module')items(item.items);else if(item.k==='fn'&&originalParsedDeclarationEvidence(item))visit(item.body,item);}items(surface.items);captures.set(checker,nodes);
}
function carrierLayout(checker){const entry=checker.items.get(TYPE_NAME);if(entry?.k!=='data'||entry.fullName!==TYPE_NAME||entry.generated!=='router-host-contract'||entry.hostTypePath?.length!==1||entry.hostTypePath[0]!==TYPE_NAME||entry.ctors?.length!==1||entry.ctors[0].name!==TYPE_NAME||entry.ctors[0].fields.length!==0||originalParsedDeclarationEvidence(entry))fail('actual private registered carrier layout required');}
export function checkLiteralArgumentsCore(checker,node,env,path,expected){
 const capture=captures.get(checker)?.get(node);if(!frame||!capture||!same(node,capture.syntax))throw typeError('literal call lacks its original owned source association',node.span);requireOriginalPrimitiveTryFromChecker(checker);carrierLayout(checker);current(capture.receipt);
 const contract=capture.receipt.contract,call=checker.hostCall([contract],node.args,env,path,expected,node.span);
 if(contract===LITERAL_ARGUMENTS_CONTRACTS[1]&&(call.args[0]?.k!=='lit'||typeof call.args[0].value!=='string'||call.args[0].value!==capture.receipt.literal||node.args[0]?.k!=='str'))throw typeError('static literal custody differs from actual source',node.span);
 const boundary=Object.freeze({profile:contract.profile,symbol:contract.rustPath.join('::'),libraryImplementation:'portable-owned-static-pieces',stdArgumentsAbi:false}),checked={...call,compatibilityCore:boundary};
 issued.set(boundary,{checker,capture,original:node,syntax:copyMetadata(checked),owner:capture.owner,ownerName:typeof capture.owner.fullName==='string'?capture.owner.fullName:[...path,capture.owner.name].join('.'),ownerSpan:copyMetadata(capture.owner.span)});if(frame.observed.size>=256)fail('bounded original literal operation source closure');frame.observed.add(()=>{current(capture.receipt);if(!same(node,capture.syntax))fail('original literal call changed');});return checked;
}
function genuine(checker,node,entry){
 if(!node||typeof node!=='object'||types.isProxy(node)||!entry||typeof entry!=='object'||types.isProxy(entry))return false;const boundary=Object.getOwnPropertyDescriptor(node,'compatibilityCore');if(!boundary||!Object.hasOwn(boundary,'value'))return false;const proof=issued.get(boundary.value);
 if(!frame||!proof||proof.checker!==checker||checker.items.get(entry.fullName)!==entry||!same(node,proof.syntax)||!originalParsedDeclarationEvidence(proof.owner)||captures.get(checker)?.get(proof.original)!==proof.capture)return false;
 requireOriginalPrimitiveTryFromChecker(checker);carrierLayout(checker);current(proof.capture.receipt);return proof.ownerName===entry.fullName&&same(proof.ownerSpan,entry.span)&&same(proof.original,proof.capture.syntax);
}
const carrier=type=>type?.kind==='data'&&type.name===TYPE_NAME&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
export function literalArgumentsFlowDomain(checker,type,entry){return frame?.activeEntries.has(entry)&&carrier(type)?'linear':null;}
export function literalArgumentsFlowCall(checker,node,entry){
 if(!frame?.activeEntries.has(entry)||!genuine(checker,node,entry))return null;const row=LITERAL_ARGUMENTS_CONTRACTS.find(row=>row.id===node.id);return row?{constructor:row.ret===CARRIER}:null;
}
export function finalizeLiteralArgumentsCore(checker,program){
 if(!frame)return;requireOriginalPrimitiveTryFromChecker(checker);
 const isCall=(node,ctor)=>node?.k==='routerHostCall'&&LITERAL_ARGUMENTS_CONTRACTS.some(row=>row.id===node.id&&(row.ret===CARRIER)===ctor);
 for(const entry of program.declarations.values())if(entry.k==='fn'){
  let relevant=false,cells=0;function scan(node,depth=0){if(!node||typeof node!=='object')return;if(++cells>100000||depth>160)fail('complete literal function occurrence bound');if(carrier(node.type)||node.k==='routerHostCall'&&LITERAL_ARGUMENTS_CONTRACTS.some(row=>row.id===node.id))relevant=true;for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore'].includes(key))for(const child of Array.isArray(value)?value:[value])scan(child,depth+1);}scan(entry.body);
  if(entry.params.some(param=>carrier(param.type))||carrier(entry.ret))relevant=true;if(!relevant)continue;
  const body=entry.body,local=body?.k==='let'?body:null,tail=local?local.body:body;let constructor;
  if(entry.async||entry.constant||entry.constFunction||entry.params.length||!isCall(tail,false)||tail.args.length!==1)throw unsupported('literal caller flow','requires one whole synchronous parameter-free constructor/inspection function',entry.span);
  if(!local)constructor=tail.args[0];else{if(local.mutable||tail.args[0]?.k!=='var'||tail.args[0].name!==local.name)throw unsupported('literal local ownership','requires one immutable local consumed exactly once',entry.span);constructor=local.value;}
  if(!isCall(constructor,true)||!genuine(checker,constructor,entry)||!genuine(checker,tail,entry))throw unsupported('literal source closure','requires both original private constructor/inspection joins',entry.span);
  const sourceProof=issued.get(tail.compatibilityCore),original=originalParsedDeclarationSource(sourceProof.owner);if(typeof original!=='string'||rustTokens(original).some(token=>token.type!=='comment'&&token.text==='mut'))throw unsupported('literal local ownership','mutable original bindings remain unsupported',entry.span);
  frame.activeEntries.add(entry);try{validateOwnedJsonFlow(checker,entry,{genuine:()=>false,genuineTextMatch:()=>false});}finally{frame.activeEntries.delete(entry);}
 }
}
