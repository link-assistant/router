// Only actual private complete generated-output effects can narrow a source
// producer blocker. This operation never checks or executes generated traits.
import {types} from 'node:util';
import {deriveDependencyProfile,deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintSourceContext,deriveFootprintExternalModules} from './derive-footprints.mjs';
import {createDeriveBangContext} from './derive-bang-context.mjs';
import {proveDeriveEmptyEnclosingEffect,deriveEmptyEnclosingEffectFacts} from './derive-output-effects.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveModuleBindings,originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
const contexts=new WeakMap(),fail=message=>{throw new TypeError('Core adoption producer context: '+message);};
const same=(a,b)=>a.length===b.length&&a.every((name,at)=>name===b[at]);
function dependencySources(input){
 if(input===undefined)return undefined;
 if(!input||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('actual own Cargo source data required');
 const names=Reflect.ownKeys(input);if(names.length!==2||!names.includes('manifest')||!names.includes('lock'))fail('complete manifest and lock fields required');
 const result={};for(const name of names){const field=Object.getOwnPropertyDescriptor(input,name);if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||field.value.length>2000000)fail('bounded primitive Cargo source required');result[name]=field.value;}return result;
}
export function createCoreAdoptionProducerContext({modules,compilationProfile:inputProfile,dependencyInputs}){
 const inputs=dependencySources(dependencyInputs);if(!inputs)return null;
 // No dependency-archive reads or proof construction are added to an operation with no
 // actual derive invocation. Ordinary callers without Cargo retain old refusal.
 const profile=compilationProfile(inputProfile),hasDerive=modules.some(module=>originalSourceModuleItems(module).some(item=>itemConfiguration(item.tokens,profile).attributes.some(attribute=>attribute.name==='derive')));
 if(!hasDerive)return null;
 const dependencies=deriveDependencyProfile(inputs).proof;if(!dependencies)return null;
 const derive=createDeriveFootprintContext({modules,dependencies,externalModules:registeredStandardHostBindings(),compilationProfile:profile}),bang=createDeriveBangContext({deriveContext:derive}),original=deriveFootprintSourceContext(derive),selected=new Map();
 const binding=resolveModuleBindings({modules,deriveContext:derive,deriveBangContext:bang,externalModules:deriveFootprintExternalModules(derive),compilationProfile:profile});
 const token=Object.freeze({schema:'private-core-adoption-producer-context-v1'});contexts.set(token,{modules,profile,dependencies,derive,bang,original,binding,selected});return token;
}
function stateOf(context){const state=contexts.get(context);if(!state)fail('copied or foreign context');return state;}
function sourceModule(state,source,file,localPath){
 if(typeof source!=='string'||typeof file!=='string'||!Array.isArray(localPath)||localPath.some(part=>typeof part!=='string'))return null;
 const candidates=state.original.modules.filter(module=>module.file===file&&module.source===source&&same(module.sourceView?.modulePath??module.path,localPath));
 return candidates.length===1?candidates[0]:null;
}
// The scanner supplies whole original source and exact source coordinates.
// Copies of public certificate flags/digests are never an argument here.
export function coreAdoptionDeriveAttributeClosed(context,source,file,localPath,item,attribute){
 if(context===null||context===undefined)return false;const state=stateOf(context);
 if(attribute.name!=='derive')return false;
 const module=sourceModule(state,source,file,localPath);if(!module||module.configurationCondition!=='active')return false;
 const actual=originalSourceModuleItems(module).find(row=>row.start===item.start&&row.end===item.end&&row.term===item.term&&row.name===item.name);
 if(!actual||JSON.stringify(actual.tokens)!==JSON.stringify(item.tokens)||source.slice(item.start,item.end)!==module.source.slice(actual.start,actual.end))return false;
 const condition=itemConfiguration(actual.tokens,state.profile),selected=condition.attributes.find(row=>row.name==='derive'&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end);
 if(condition.status!=='active'||!selected||JSON.stringify(selected.tokens)!==JSON.stringify(attribute.tokens))return false;
 const input=deriveFootprintAt(state.derive,module,actual);if(!input)return false;
 const key=module.file+':'+JSON.stringify(module.path)+':'+actual.start+':'+actual.end;
 let row=state.selected.get(key);
 if(!row){
  try{row={module,item:actual,input,effect:proveDeriveEmptyEnclosingEffect(state.bang,state.derive,module,actual)};}catch(error){if(!(error instanceof TypeError))throw error;return false;}
  state.selected.set(key,row);
 }
 const facts=deriveEmptyEnclosingEffectFacts(row.effect,state.bang,state.derive,module,actual);
 return facts.enclosingTypeBindings.length===0&&facts.enclosingUsableValueBindings.length===0;
}
export function coreAdoptionProducerBindings(context){return context===null?null:stateOf(context).binding;}
export function finishCoreAdoptionProducerContext(context){
 if(context===null)return null;const state=stateOf(context),selections=[];
 for(const row of state.selected.values()){
  const facts=deriveEmptyEnclosingEffectFacts(row.effect,state.bang,state.derive,row.module,row.item);
  if(facts.enclosingTypeBindings.length||facts.enclosingUsableValueBindings.length)fail('original enclosing effect changed');
  selections.push({file:row.module.file,module:row.module.path,sourceSha256:row.input.sourceSha256,span:row.input.span,itemSha256:row.input.itemSha256,inputDigest:row.input.digest,languageRule:facts.rule.id,completeInvocationDigest:facts.certificate.digest,retainedAlternatives:facts.alternatives.map(alternative=>({invocation:alternative.invocation,kind:alternative.kind??null,rootKinds:alternative.roots?.map(root=>root.kind)??null})),enclosingTypeBindings:[],enclosingUsableValueBindings:[],runtimeAuthority:false,generatedImplBehavior:false});
 }
 return {schema:'core-adoption-original-producer-effects-v1',dependencyInputs:deriveDependencyOriginalInputs(state.dependencies),dependenciesDigest:state.dependencies.digest,compilationProfile:state.profile,deriveDiagnostics:state.derive.diagnostics,bangDiagnostics:state.bang.diagnostics,selections,runtimeAuthority:false,generatedImplBehavior:false};
}

// A per-operation source candidate selector. The existing binder owns the crate
// identity; this function cannot issue type, trait, borrow or runtime authority.
export function createCoreAdoptionSelfAliasSelector({modules,compilationProfile:inputProfile,context=null}){
 const profile=compilationProfile(inputProfile),state=context===null?null:stateOf(context);
 if(state&&(JSON.stringify(state.profile)!==JSON.stringify(profile)||state.modules.length!==modules.length||state.modules.some((module,at)=>module!==modules[at])))fail('self-alias context source/profile differs');
 const binding=state?.binding??resolveModuleBindings({modules,compilationProfile:profile}),scopes=binding.scopes;
 const origins=modules.map(module=>({module,file:module.file,path:[...module.path],source:module.source,view:module.sourceView,condition:module.configurationCondition}));
 const reserved=new Set('as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn abstract become box do final macro override priv typeof unsized virtual yield try gen _ std core serde_json Option Some None Result Ok Err String str usize Vec Value Map translation_core Json Maybe Outcome Text Str'.split(' '));
 const pathEqual=(a,b)=>Array.isArray(a)&&same(a,b),scopeFor=module=>scopes.filter(scope=>scope.file===module.file&&pathEqual(scope.path,module.path));
 return (module,item,consumer=module)=>{
  if(origins.some(row=>row.module.file!==row.file||row.module.source!==row.source||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition||!pathEqual(row.module.path,row.path)))fail('self-alias original graph changed');
  if(!origins.some(row=>row.module===module)||!origins.some(row=>row.module===consumer)||module.configurationCondition!=='active'||consumer.configurationCondition!=='active')return false;
  const actual=originalSourceModuleItems(module).filter(row=>row.start===item.start&&row.end===item.end&&row.term===item.term);
  if(actual.length!==1||JSON.stringify(actual[0].tokens)!==JSON.stringify(item.tokens)||module.source.slice(item.start,item.end)!==module.source.slice(actual[0].start,actual[0].end))return false;
  const condition=itemConfiguration(actual[0].tokens,profile);if(condition.status!=='active'||condition.attributes.length)return false;
  const tokens=actual[0].tokens.filter(token=>token.type!=='comment');let at=0;
  if(tokens[at]?.text==='pub'){at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return false;}}
  const tail=tokens.slice(at),alias=tail[4];
  if(tail.length!==6||tail[0].text!=='extern'||tail[1].text!=='crate'||tail[2].text!=='self'||tail[3].text!=='as'||tail[5].text!==';'||alias?.type!=='ident'||!/^(?:\p{ID_Start}|_)\p{ID_Continue}*$/u.test(alias.text)||reserved.has(alias.text)||alias.rawIdentifier)return false;
  const own=scopeFor(module);if(own.length!==1||own[0].configurationCondition!=='active')return false;
  const selected=own[0].bindings.filter(row=>row.namespace==='type'&&row.name===alias.text);
  const original=row=>row.status==='resolved'&&row.externCrateSelf===true&&row.externCrateBinding===true&&pathEqual(row.target,['crate'])&&row.source===module.file&&row.span?.start===item.start&&row.span?.end===item.end&&row.declaration?.source===module.file&&row.declaration?.span?.start===item.start&&row.declaration?.span?.end===item.end;
  if(selected.length!==1||!original(selected[0]))return false;
  // Neither a second declaration/import nor a higher-priority child binding
  // may silently replace the exact self alias while its ancestor is scanned.
  for(const parent of modules.filter(parent=>parent.path.length<=consumer.path.length&&parent.path.every((name,at)=>consumer.path[at]===name))){
   const scoped=scopeFor(parent);if(scoped.length!==1)return false;
   if(scoped[0].bindings.some(row=>row.namespace==='type'&&row.name===alias.text&&!original(row)))return false;
   for(const other of originalSourceModuleItems(parent)){if(other.comment||itemConfiguration(other.tokens,profile).status==='inactive'||parent===module&&other.start===item.start&&other.end===item.end)continue;
    if(originalDeclarationHeader(other,parent.path)?.name===alias.text)return false;
    if(other.term==='use')try{if(originalUseDeclarationLeaves(other,parent.path).some(leaf=>leaf.glob||leaf.name===alias.text))return false;}catch{return false;}
   }
  }
  return true;
 };
}
