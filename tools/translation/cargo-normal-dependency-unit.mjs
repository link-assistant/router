// Private composition only. Missing manifest-to-typed-unit semantics remain a
// refusal; conditional source-program observations never become cfg authority.
import {types} from 'node:util';
import {requireOriginalCargoInvocationPlan} from './cargo-invocation-plan.mjs';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {parsePrivateOriginalCargoToml,assertPrivateOriginalCargoTomlExecution} from './private-cargo-toml.mjs';
import {originalCargoUnitSourceProgram,assertOriginalCargoUnitSourceProgram,revalidateOriginalCargoSourceText} from './cargo-unit-source-semantics.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';

const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
let units=null;
const fail=message=>throwOriginalCapturedTypeError('Original normal dependency unit: '+message);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified original source operations changed');assertPrivateOriginalCargoTomlExecution();}
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value))fail('ordinary original data required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own original data required');return field.value;}
function frozen(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
function consistentProfile(plan){const flags=plan.root.compilationProfile?.flags;if(flags&&Object.hasOwn(flags,'test')){const expected=plan.rootMode==='Test';if(own(flags,'test')!==expected)fail('explicit root test profile contradicts modeled root mode');}}
function noProfileFlags(parsed){
 const visit=(value,depth=0)=>{if(depth>32)fail('profile schema bound');if(!value||typeof value!=='object')return;for(const key of Reflect.ownKeys(value)){if(typeof key!=='string')fail('non-string profile key');if(key==='rustflags'||key==='rustdocflags')fail('manifest profile adds compiler flags outside modeled domain');visit(own(value,key),depth+1);}};
 if(parsed.profile)visit(parsed.profile);
}
function manifestBoundary(parsed,plan,originals){
 const packageData=parsed.package,library=parsed.lib;
 if(!packageData||packageData.name!==originals.dependency.package||!library||typeof library.name!=='string'||typeof library.path!=='string')fail('complete same original package library required');
 if(packageData.build!==false)fail('explicit original build=false required; filesystem inference is not modeled');
 if(packageData.links!==undefined)fail('native linking/build output remains unsupported');
 for(const key of ['proc-macro','proc_macro'])if(library[key]!==undefined&&library[key]!==false)fail('proc-macro dependency target is not an ordinary library');
 for(const key of ['crate-type','crate_type'])if(library[key]!==undefined)fail('explicit crate-type normalization remains unsupported');
 for(const key of ['patch','replace','workspace','target'])if(parsed[key]!==undefined)fail('package override/conditional dependency normalization remains open');
 if(parsed.dependencies&&Reflect.ownKeys(parsed.dependencies).length||parsed['build-dependencies']&&Reflect.ownKeys(parsed['build-dependencies']).length)fail('transitive normal/build output closure remains open');
 noProfileFlags(parsed);
 if(plan.root.package.name===packageData.name)fail('dependency selected as its own root');
 // These are raw TOML boundaries, not an assertion that Cargo has constructed
 // matching TomlTarget/Dependency values. The latter stays explicitly open.
 return {package:packageData,library,devDependencies:parsed['dev-dependencies']??null,rawManifest:parsed};
}
function sameData(value,expected,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('late original association bound');if(expected===null||typeof expected!=='object')return value===expected;
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)!==Array.isArray(expected))return false;
 const array=Array.isArray(value),parent=Object.getPrototypeOf(value);if(parent!==null&&parent!==(array?Array.prototype:Object.prototype))return false;
 const keys=Reflect.ownKeys(value),wanted=Reflect.ownKeys(expected);if(keys.length!==wanted.length)return false;
 for(let at=0;at<wanted.length;at++){const key=wanted[at];if(array&&keys[at]!==key||!Object.hasOwn(value,key))return false;const actual=Object.getOwnPropertyDescriptor(value,key),prior=Object.getOwnPropertyDescriptor(expected,key);if(!actual||!Object.hasOwn(actual,'value')||!Object.hasOwn(prior,'value')||actual.enumerable!==prior.enumerable||!sameData(actual.value,prior.value,depth+1,budget))return false;}return true;
}
// Snapshot exactly the caller's OWN raw representation. The existing genuine
// matchesParserFacts/253 canonicalizer independently checks normalized meaning;
// this final check must not invent defaults or run a normalizer after hashes.
function rawProfileCopy(value,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('raw original profile bound');if(value===null||['undefined','string','boolean','number'].includes(typeof value))return value;
 if(!value||typeof value!=='object'||types.isProxy(value))fail('plain own raw profile required');
 const array=Array.isArray(value),parent=Object.getPrototypeOf(value);if(parent!==null&&parent!==(array?Array.prototype:Object.prototype))fail('raw profile prototype differs');
 const result=array?[]:Object.create(null);for(const key of Reflect.ownKeys(value)){if(typeof key!=='string')fail('raw profile symbol key');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('raw profile accessor');if(array&&key==='length'){if(!Number.isSafeInteger(field.value)||field.value<0||field.value>200000)fail('raw profile array bound');result.length=field.value;}else Object.defineProperty(result,key,{value:rawProfileCopy(field.value,depth+1,budget),enumerable:field.enumerable,writable:true,configurable:true});}return result;
}
const sameRawProfile=(value,expected)=>sameData(value,expected);
function roots(frame){return ['modules','evidence','profile','compilationProfile','cargoEditionContext'].map(key=>[key,own(frame.facts,key)]);}
function finalAssociations(state){
 guard();if(Reflect.ownKeys(state.options).length!==2||own(state.options,'packageToken')!==state.packageToken||own(state.options,'domain')!==state.domain||!sameData(own(state.options,'domain'),state.plan.domain))fail('late original modeled options changed');
 if(own(state.frame,'facts')!==state.facts||own(state.frame,'module')!==state.module||own(state.parser,'cursor')!==state.cursor||own(state.cursor,'tokens')!==own(state.frame,'tokens')||!sameRawProfile(own(state.parser,'compilationProfile'),state.rawProfile)||!sameData(own(state.parser,'modulePath'),state.module.path))fail('late parser source association changed');
 for(const [key,value]of state.roots)if(own(state.facts,key)!==value)fail('late private context root changed');guard();
}
function authenticatedPackage(originals){
 guard();let total=0;if(!Array.isArray(originals.sources)||originals.sources.length>1024)fail('bounded complete original package census required');
 for(const row of originals.sources){const bytes=own(row,'bytes'),source=own(row,'source'),sha256=own(row,'sha256');revalidateOriginalCargoSourceText(source,bytes,sha256);total+=bytes;if(total>8388608)fail('complete package source bytes exceed bound');guard();}
 return originals;
}
function stable(state){
 guard();const originals=authenticatedPackage(originalExternalTraitPackageInputs(state.packageToken)),inputs=deriveDependencyOriginalInputs(state.dependencies);
 if(originals.crateRoot!==state.originals.crateRoot||originals.sources.length!==state.originals.sources.length||originals.sources.some((row,at)=>row!==state.originals.sources[at])||inputs.manifest!==state.inputs.manifest||inputs.lock!==state.inputs.lock)fail('full original root/package source changed');
 finalAssociations(state);
 if(requireOriginalCargoInvocationPlan(state.invocationPlan,state.parser,state.options)!==state.plan)fail('modeled invocation association changed');
 const frame=matchesParserFacts(state.parser);if(frame!==state.frame||frame.facts!==state.facts||originalMatchesDependencyProof(frame.facts)!==state.dependencies)fail('original parser/dependency association changed');
 assertOriginalCargoUnitSourceProgram(state.program);finalAssociations(state);
}
function joined(invocationPlan,parser,options){
 guard();const rawProfile=rawProfileCopy(own(parser,'compilationProfile'));
 const plan=requireOriginalCargoInvocationPlan(invocationPlan,parser,options),packageToken=own(options,'packageToken'),requestDomain=own(options,'domain'),frame=matchesParserFacts(parser),frameRoots=roots(frame),module=own(frame,'module'),cursor=own(parser,'cursor'),dependencies=originalMatchesDependencyProof(frame.facts),inputs=deriveDependencyOriginalInputs(dependencies),originals=authenticatedPackage(originalExternalTraitPackageInputs(packageToken));
 consistentProfile(plan);
 if(plan.toolchain.cargoCommit!=='c24e1064277fe51ab72011e2612e556ac56addf7'||plan.toolchain.rustCommit!=='29483883eed69d5fb4db01964cdf2af4d86e9cb2')fail('modeled toolchain differs');
 const rootParsed=parsePrivateOriginalCargoToml(inputs.manifest,{dependencies,packageToken});noProfileFlags(rootParsed);
 if(!rootParsed.dependencies||rootParsed.dependencies[originals.dependency.package]!==originals.dependency.requirement||typeof rootParsed.dependencies[originals.dependency.package]!=='string')fail('same direct unrenamed normal dependency required');
 const sourceManifest=originals.sources.filter(row=>row.path==='Cargo.toml');if(sourceManifest.length!==1)fail('complete original package Cargo source absent');
 const parsed=parsePrivateOriginalCargoToml(sourceManifest[0].source,{dependencies,packageToken}),boundary=manifestBoundary(parsed,plan,originals),program=originalCargoUnitSourceProgram();
 const state={invocationPlan,parser,options,plan,packageToken,domain:requestDomain,frame,facts:frame.facts,module,cursor,rawProfile,roots:frameRoots,dependencies,inputs,originals,boundary,program};stable(state);return state;
}
function facts(state){
 const parent=state.plan.rootMode,child=parent==='Check'?{mode:'Check',test:false}:{mode:'Build'};
 const result={schema:'original-normal-dependency-unit-obligations-v1',modeledSemanticsOnly:true,invocation:state.plan,originalPackage:state.originals,rawManifestBoundary:state.boundary,sourceProgram:state.program,
  conditionalTypedModeTransfer:{rootMode:parent,child,preconditionsStatus:'open',requires:['actual normalized ordinary Target/Dependency construction','actual Target.for_host() is false for Check','same complete original compute_deps mode forwarding and interner association'],rootCfgInherited:false},
  normalizationComplete:false,unitRoleProved:false,cfgTestProved:false,configuredProfile:null,devDependenciesExcluded:false,namespaceAuthority:false,runtimeAuthority:false,nativeParity:false,actualEnvironmentObserved:false,actualConfigurationObserved:false,
  obligations:state.program.obligations};
 frozen(result);stable(state);return result;
}
export function captureOriginalNormalDependencyUnit(invocationPlan,parser,options){
 const state=joined(invocationPlan,parser,options),obligations=facts(state);units??=new WeakMap();const token=Object.freeze({schema:'private-normal-dependency-unit-obligations-v1'});stable(state);units.set(token,{state,obligations});stable(state);return token;
}
function reissued(token,invocationPlan,parser,options){
 guard();const entry=units?.get(token);if(!entry)fail('copied or foreign normal unit token');const prior=entry.state;
 if(invocationPlan!==prior.invocationPlan||parser!==prior.parser||options!==prior.options)fail('foreign modeled unit association');
 stable(prior);const state=joined(invocationPlan,parser,options);stable(prior);stable(state);return {state,obligations:facts(state)};
}
// Inspection is deliberately separate from the strong consumer. Full inputs
// and every open obligation remain visible; copied reports cannot be consumed.
export function originalNormalDependencyUnitObligations(token,invocationPlan,parser,options){return reissued(token,invocationPlan,parser,options).obligations;}
export function requireOriginalNormalDependencyUnit(token,invocationPlan,parser,options){
 const {state}=reissued(token,invocationPlan,parser,options);stable(state);
 fail('complete manifest deserialization, Option/default-owner and normalized constructor forwarding remain unproved');
}
