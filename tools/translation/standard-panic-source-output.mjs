// Every retained standard producer alternative is expanded from its complete
// original definition. No written invocation name selects one of these owners.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {originalNamespaceFunctionFacts,originalNamespacePositionFacts,captureOriginalNamespaceInvocationInput,originalNamespaceInvocationInputFacts} from './original-namespace-parser.mjs';
import {originalNamespaceSourceSupersetFacts} from './conditional-namespace-superset.mjs';
import {originalStandardBangOutputSourcePlan,requireOriginalStandardBangOutputSourcePlan} from './standard-bang-output-source.mjs';
import {compileOriginalLiteralMacro,expandOriginalLiteralMacro,originalLiteralMacroHeader,originalLiteralMacroGrammar,observeOriginalBlockCapturedOutput,originalBlockCapturedOutputFacts} from './original-block-captured-output.mjs';
import {COMPILER_OUTPUT_COLLECTION_WORKLIST} from './compiler-output-ast.mjs';
const sourceInitial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const parsePin=sourceInitial?Object.getOwnPropertyDescriptor(JSON,'parse'):null;
const initial=!!(sourceInitial&&parsePin&&Object.hasOwn(parsePin,'value')&&typeof parsePin.value==='function'&&!types.isProxy(parsePin.value)&&originalCapturedFunctionSource(parsePin.value)==='function parse() { [native code] }');
const issued=initial?new WeakMap():null;
const fail=message=>throwOriginalCapturedTypeError('Original standard panic output: '+message);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');const actual=Object.getOwnPropertyDescriptor(JSON,'parse');if(!actual||!Object.hasOwn(actual,'value')||actual.value!==parsePin.value||actual.enumerable!==parsePin.enumerable||actual.writable!==parsePin.writable||actual.configurable!==parsePin.configurable)fail('original source operations changed');}
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))fail('own non-proxy source options required');const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value'))fail('own source data required');return field.value;}
function exact(input,names){guard();if(!input||typeof input!=='object'||types.isProxy(input))fail('exact own options required');const keys=Reflect.ownKeys(input);if(keys.length!==names.length||keys.some(key=>!names.includes(key)))fail('exact own option fields required');const result={};for(const key of names)Object.defineProperty(result,key,{value:own(input,key),enumerable:true});return result;}
function sameData(left,right,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('original source scope bound');
 if(right===null||typeof right!=='object')return left===right?(left!==0||1/left===1/right):(left!==left&&right!==right);
 if(!left||typeof left!=='object'||types.isProxy(left)||Array.isArray(left)!==Array.isArray(right))return false;
 const parent=Object.getPrototypeOf(left);if(parent!==null&&parent!==Object.prototype&&parent!==Array.prototype)return false;
 const keys=Reflect.ownKeys(left),expected=Reflect.ownKeys(right);if(keys.length!==expected.length||Array.isArray(right)&&keys.some((key,at)=>key!==expected[at]))return false;
 // The genuine issuer copyMetadata sorts object keys; array positions remain exact.
 for(const key of expected){if(!Object.hasOwn(left,key))return false;const a=Object.getOwnPropertyDescriptor(left,key),b=Object.getOwnPropertyDescriptor(right,key);if(!a||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||!sameData(a.value,b.value,depth+1,budget))return false;}return true;
}
function current(state){
 guard();const value=exact(state.input,['dependencies','source','frame','position','superset']);for(const key of Object.keys(value))if(value[key]!==state.value[key])fail('original invocation options changed');const source=exact(value.source,['module','item','memberIndex']),module=source.module,prior=state.snapshot;
 if(module!==state.module||source.item!==state.source.item||source.memberIndex!==state.source.memberIndex||own(module,'source')!==prior.source||own(module,'file')!==prior.file||own(module,'sourceView')!==prior.sourceView||!sameData(own(module,'path'),state.frame.source.module)||!sameData(own(module,'compilationProfile'),state.frame.source.compilationProfile))fail('original source module/item/profile changed');guard();
}
function joined(input){
 const value=exact(input,['dependencies','source','frame','position','superset']),source=exact(value.source,['module','item','memberIndex']),module=source.module;
 // Inspect public ingress before the older genuine issuers touch its fields.
 const snapshot={};for(const key of ['source','file','path','compilationProfile','sourceView'])Object.defineProperty(snapshot,key,{value:own(module,key),enumerable:true});
 const frame=originalNamespaceFunctionFacts(value.frame,value.source),position=originalNamespacePositionFacts(value.position,value.frame,value.source),superset=originalNamespaceSourceSupersetFacts(value.superset,{module,dependencies:value.dependencies});
 if(position.position!=='Expr')fail('only exact original expression-position invocation supported');
 const originalInput=captureOriginalNamespaceInvocationInput(value.position,value.frame,value.source),original=originalNamespaceInvocationInputFacts(originalInput,value.position,value.frame,value.source);const state={input,value,source,module,snapshot,frame,position,superset,originalInput,original};current(state);return state;
}
function wellFormed(source){for(let at=0;at<source.length;at++){const first=source.charCodeAt(at);if(first>=0xd800&&first<=0xdbff){const next=source.charCodeAt(++at);if(!(next>=0xdc00&&next<=0xdfff))return false;}else if(first>=0xdc00&&first<=0xdfff)return false;}return true;}
const manifestSha256='b42662682e70f19e28844150363768d22da4fbc486c6c7be86f38e4259ef49d8';
function authenticatedManifest(){
 guard();const bytes=readFileSync(new URL('./source-profiles/standard-bang-output/manifest.json',import.meta.url));guard();if(hash(bytes)!==manifestSha256)fail('complete source inventory changed');const text=bytes.toString('utf8');guard();if(typeof text!=='string'||text.length>256000||!wellFormed(text))fail('complete decoded manifest requires bounded well-formed primitive text');if(hash(text)!==manifestSha256)fail('complete decoded manifest text differs from original bytes');guard();const manifest=JSON.parse(text);guard();return manifest;
}
function authenticatedPlan(plan,state){
 guard();requireOriginalStandardBangOutputSourcePlan(plan);const manifest=authenticatedManifest();
 // The old issuer's own internal callback ordering is unchanged. Independently
 // join its complete parsed manifest and every source row to pinned text here.
 if(plan.manifestSha256!==manifestSha256||!sameData(plan.manifest,manifest)||plan.sources.length!==manifest.sources.length)fail('complete original source inventory association changed');
 for(let at=0;at<plan.sources.length;at++){const origin=plan.sources[at],source=origin.source;if(typeof source!=='string'||source.length>2*1024*1024||!wellFormed(source))fail('complete decoded source requires bounded well-formed primitive text');if(!sameData(origin,{...manifest.sources[at],source}))fail('complete original source row association changed');if(hash(source)!==manifest.sources[at].sha256)fail('complete decoded source text differs from original bytes');}
 current(state);return plan;
}
function samePlan(prior,current){if(prior.manifestSha256!==current.manifestSha256||prior.sources.length!==current.sources.length)fail('source plan changed');for(let at=0;at<prior.sources.length;at++){const a=prior.sources[at],b=current.sources[at];for(const key of ['sourcePath','source','sha256','bytes','archive','archiveBytes','archiveSha256'])if(a[key]!==b[key])fail('complete registered source changed');}}
const authority={callerMacroOwnerResolved:false,callerScopeComplete:false,configurationSelected:false,definitionAttributesResolved:false,editionSelected:false,panicImmediateAbortSelected:false,globalBangComplete:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false};
const remaining=[
 {id:'rust.compiler.format.original-argument-ast',requires:['genuine nested format_args and const_format_args input occurrences','actual parse_args original TT/Expr/argument insertion and capture flow']},
 {id:'rust.compiler.format.complete-callback-effects',requires:['complete expand_format_args_impl Ready/Retry and parse/make Ok/Err branches','all generated ExprKind::FormatArgs and DummyResult original source slots','all original nested expansion/helper/diagnostic effects']},
 {id:'rust.compiler.return.complete-carrier-effects',requires:['all eight MacEager fields and all nine MacResult methods','actual derived Default and Option field defaults','P/Box allocation/dereference and all error/retry/update effects']},
];
export function captureOriginalStandardPanicOutputs(input){
 const selected=joined(input),plan=authenticatedPlan(originalStandardBangOutputSourcePlan(),selected),routes=[];
 for(const [role,declarations]of Object.entries(plan.panicDefinitions))for(let alternative=0;alternative<declarations.length;alternative++){
  const declaration=declarations[alternative],origins=plan.sources.filter(row=>row.sourcePath===declaration.sourcePath);if(origins.length!==1)fail('complete original definition source missing');const origin=origins[0];
  if(origin.sha256!==declaration.sourceSha256||origin.source.slice(declaration.span.start,declaration.span.end)!==declaration.original)fail('complete original definition association changed');
  guard();const owner=role==='std2015'?['std']:['core'],definition=compileOriginalLiteralMacro(declaration.original,{name:declaration.name,owner}),header=originalLiteralMacroHeader(definition);
  if(header.sourceSha256!==hash(declaration.original)||header.name!==declaration.name||header.span.start!==0||header.span.end!==declaration.original.length)fail('complete original declaration/header changed');
  const expansion=expandOriginalLiteralMacro(definition,selected.original.trees),output=observeOriginalBlockCapturedOutput(expansion,selected.originalInput,selected.value.position,selected.value.frame,selected.value.source),observed=originalBlockCapturedOutputFacts(output,expansion,selected.originalInput,selected.value.position,selected.value.frame,selected.value.source);
  routes.push({role,alternative,declaration,definition,header,expansion,output,observed,
   originalWholeDeclarationAndSelectedOutputJoined:true,conditionalOnExactOriginalProducerSelection:true,
   completeSelectedOutputEffectsProved:observed.completeSelectedOutputEffectsProved,
   completeProducerEffectBranchSetProved:false,...authority});
 }
 if(routes.length!==6)fail('all six original definition alternatives required');
 // The exact actual input is applied to every still-possible definition. A
 // complete syntax observation of one branch never closes the branch set.
 const facts=freeze({schema:'original-standard-panic-output-alternatives-v1',source:selected.frame.source,position:selected.position,originalInput:selected.original,sourcePlan:plan,literalGrammar:originalLiteralMacroGrammar(),registeredCallbacks:plan.callbacks,registeredRecipes:plan.recipes,originalScopeAlternatives:selected.superset,routes,
  completeOriginalProducerAlternativesRetained:true,allSelectedOutputsActuallyExpanded:true,completeProducerEffectBranchSetProved:false,
  missingContracts:[...COMPILER_OUTPUT_COLLECTION_WORKLIST,...remaining],...authority});
 joined(input);current(selected);const token=Object.freeze({schema:'private-original-standard-panic-outputs-v1'});issued.set(token,{input,selected,plan,routes,facts});return token;
}
function rejoin(token,input){
 guard();const state=issued.get(token);if(!state)fail('copied or foreign output token');const selected=joined(input),prior=state.selected;
 for(const key of ['dependencies','source','frame','position','superset'])if(selected.value[key]!==prior.value[key])fail('foreign original invocation association');
 if(selected.module!==prior.module||selected.source.item!==prior.source.item||selected.source.memberIndex!==prior.source.memberIndex||selected.frame!==prior.frame||selected.position!==prior.position||selected.superset!==prior.superset)fail('original source/frame/profile changed');
 samePlan(state.plan,authenticatedPlan(originalStandardBangOutputSourcePlan(),selected));
 for(const route of state.routes)originalBlockCapturedOutputFacts(route.output,route.expansion,prior.originalInput,prior.value.position,prior.value.frame,prior.value.source);current(selected);current(prior);return state;
}
export function originalStandardPanicOutputFacts(token,input){return rejoin(token,input).facts;}
export function requireOriginalStandardPanicAlternativeEffects(token,input,index){
 const state=rejoin(token,input);if(typeof index!=='number'||index%1!==0||index<0||index>=state.routes.length)fail('exact retained alternative index required');const route=state.routes[index];if(!route.completeSelectedOutputEffectsProved)fail('nested format and complete callback/carrier effects remain open');return route;
}
export function requireOriginalStandardPanicEffects(token,input){rejoin(token,input);fail('complete producer branch-set effects remain open');}
