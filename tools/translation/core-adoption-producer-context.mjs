// Only actual private complete generated-output effects can narrow a source
// producer blocker. This operation never checks or executes generated traits.
import {types} from 'node:util';
import {deriveDependencyProfile,deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintSourceContext,deriveFootprintExternalModules} from './derive-footprints.mjs';
import {createDeriveBangContext} from './derive-bang-context.mjs';
import {proveDeriveEmptyEnclosingEffect,deriveEmptyEnclosingEffectFacts} from './derive-output-effects.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
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
