// A checked modeled request, never an observation of a running Cargo process.
// Unit semantics and real CI/environment conformance remain separate proofs.
import {types} from 'node:util';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {parsePrivateOriginalCargoToml,assertPrivateOriginalCargoTomlExecution} from './private-cargo-toml.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';

const initiallyQualified=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
let plans=null;
const domainNames=['schema','argv','configurationFiles','environmentOverrides','compilerWrappers','rustflags','rustdocflags','profileCompilerFlags','extraRustcArguments','targetOverride','cargoUnstableOptions','buildScriptOverrides'];
const emptyInputs=['configurationFiles','environmentOverrides','compilerWrappers','rustflags','rustdocflags','profileCompilerFlags','extraRustcArguments','cargoUnstableOptions','buildScriptOverrides'];
const fail=message=>throwOriginalCapturedTypeError('Original modeled Cargo invocation: '+message);
function guard(){
 if(!initiallyQualified||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified original source operations changed');
 assertPrivateOriginalCargoTomlExecution();
}
function own(value,key){
 if(!value||typeof value!=='object'||types.isProxy(value))fail('non-proxy own data required');
 const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own data required: '+key);return field.value;
}
function record(value,names){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own request record required');
 const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>!names.includes(key)))fail('exact complete request schema required');for(const name of names)own(value,name);return value;
}
function array(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary request array required');
 const length=own(value,'length'),keys=Reflect.ownKeys(value);if(!Number.isSafeInteger(length)||length<0||length>32||keys.length!==length+1)fail('bounded dense request array required');
 const result=[];for(let at=0;at<length;at++){if(!Object.hasOwn(value,''+at))fail('request array hole');result.push(own(value,''+at));}return result;
}
function plainCopy(value,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('original request source bound');
 if(value===null||['string','boolean','number'].includes(typeof value))return value;
 if(!value||typeof value!=='object'||types.isProxy(value))fail('plain original source data required');
 const isArray=Array.isArray(value),parent=Object.getPrototypeOf(value);if(parent!==null&&parent!==(isArray?Array.prototype:Object.prototype))fail('original source prototype differs');
 const result=isArray?[]:Object.create(null);for(const key of Reflect.ownKeys(value)){if(typeof key!=='string')fail('symbol original data');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('accessor original data');if(isArray&&key==='length'){if(!Number.isSafeInteger(field.value)||field.value<0||field.value>200000)fail('original array bound');result.length=field.value;}else Object.defineProperty(result,key,{value:plainCopy(field.value,depth+1,budget),enumerable:field.enumerable,writable:true,configurable:true});}return result;
}
function sameData(value,expected,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('late original request bound');
 if(expected===null||typeof expected!=='object')return value===expected?(value!==0||1/value===1/expected):(value!==value&&expected!==expected);
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)!==Array.isArray(expected))return false;
 const parent=Object.getPrototypeOf(value);if(parent!==null&&parent!==Object.prototype&&parent!==Array.prototype)return false;
 const keys=Reflect.ownKeys(value),wanted=Reflect.ownKeys(expected);if(keys.length!==wanted.length)return false;
 for(let at=0;at<keys.length;at++){const key=keys[at];if(key!==wanted[at])return false;const actual=Object.getOwnPropertyDescriptor(value,key),prior=Object.getOwnPropertyDescriptor(expected,key);if(!actual||!Object.hasOwn(actual,'value')||!Object.hasOwn(prior,'value')||actual.enumerable!==prior.enumerable||!sameData(actual.value,prior.value,depth+1,budget))return false;}return true;
}
function frozen(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
function checkedDomain(domain,name){
 record(domain,domainNames);if(own(domain,'schema')!=='modeled-cargo-root-library-invocation-v1')fail('unsupported modeled invocation schema');
 const argv=array(own(domain,'argv'));if(argv.length!==5||argv.some(value=>typeof value!=='string')||argv[0]!=='cargo'||!['build','check','test'].includes(argv[1])||argv[2]!=='--package'||argv[3]!==name||argv[4]!=='--lib')fail('exact modeled root library command required');
 for(const name of emptyInputs)if(array(own(domain,name)).length)fail('unsupported modeled injection surface: '+name);
 if(own(domain,'targetOverride')!==null)fail('modeled target override is unsupported');
 return {domain:plainCopy(domain),argv,command:argv[1],rootMode:argv[1]==='test'?'Test':argv[1]==='check'?'Check':'Build'};
}
function rootLibrary(parsed,state){
 const packageData=parsed.package,library=parsed.lib;if(!packageData||typeof packageData.name!=='string'||!library||typeof library.name!=='string'||typeof library.path!=='string')fail('complete explicit root package and library required');
 if(library['proc-macro']!==undefined&&library['proc-macro']!==false||library['crate-type']!==undefined)fail('modeled root requires an ordinary library target');
 const path=library.path;if(!path.endsWith('.rs')||path.startsWith('/')||path.includes('\\')||path.includes(':')||path.includes('\0')||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('original root library path is unsupported');
 const modules=state.facts.modules,roots=modules.filter(module=>module.file===path&&module.path.length===0);if(roots.length!==1||typeof roots[0].source!=='string')fail('selected root library lacks its genuine complete original project module');
 return {name:library.name,path,kind:'lib',original:library,source:roots[0].source,sourceView:roots[0].sourceView};
}
function unchanged(state){
 guard();const options=record(state.options,['packageToken','domain']);if(own(options,'packageToken')!==state.packageToken||own(options,'domain')!==state.domain||!sameData(state.domain,state.domainSnapshot))fail('modeled request changed during source reissue');
 const now=matchesParserFacts(state.parser);if(now!==state.frame||now.facts!==state.facts||now.module!==state.module||originalMatchesDependencyProof(now.facts)!==state.dependencies)fail('original parser frame changed');
 const inputs=deriveDependencyOriginalInputs(state.dependencies),originals=originalExternalTraitPackageInputs(state.packageToken);if(inputs.manifest!==state.inputs.manifest||inputs.lock!==state.inputs.lock||originals.crateRoot!==state.packageOriginals.crateRoot||originals.sources.length!==state.packageOriginals.sources.length||originals.sources.some((row,index)=>row!==state.packageOriginals.sources[index]))fail('complete original Cargo or package source association changed');
 guard();if(!sameData(state.domain,state.domainSnapshot))fail('late modeled request changed');
}
function joined(parser,options){
 guard();record(options,['packageToken','domain']);if(!parser||typeof parser!=='object'||types.isProxy(parser))fail('genuine original parser required');
 const packageToken=own(options,'packageToken'),domain=own(options,'domain'),domainSnapshot=plainCopy(record(domain,domainNames)),frame=matchesParserFacts(parser),dependencies=originalMatchesDependencyProof(frame.facts),inputs=deriveDependencyOriginalInputs(dependencies),packageOriginals=originalExternalTraitPackageInputs(packageToken);
 const state={parser,options,packageToken,domain,domainSnapshot,frame,facts:frame.facts,module:frame.module,dependencies,inputs,packageOriginals};
 const parsed=parsePrivateOriginalCargoToml(inputs.manifest,{dependencies,packageToken});guard();
 if(parsed.package?.name===packageOriginals.dependency.package)fail('dependency itself-selected request is outside the modeled root domain');
 const target=rootLibrary(parsed,state),request=checkedDomain(domain,parsed.package.name);if(!sameData(domain,domainSnapshot))fail('request changed during Cargo source parsing');
 state.parsed=parsed;state.target=target;state.request=request;unchanged(state);return state;
}
function observations(state){return frozen({schema:'original-modeled-cargo-root-invocation-v1',modeledSemanticsOnly:true,
 toolchain:{rustCommit:'29483883eed69d5fb4db01964cdf2af4d86e9cb2',cargoCommit:'c24e1064277fe51ab72011e2612e556ac56addf7',semanticsProofRequiredSeparately:true},
 argv:state.request.argv,rootMode:state.request.rootMode,domain:state.request.domain,
 root:{package:state.parsed.package,target:state.target,manifest:state.inputs.manifest,lock:state.inputs.lock,compilationProfile:plainCopy(state.facts.compilationProfile)},
 originalPackage:state.packageOriginals,
 nativeInvocationObserved:false,actualEnvironmentObserved:false,actualConfigurationObserved:false,nativeParity:false,dependencyUnitRoleProved:false,cfgTestProved:false,namespaceAuthority:false,runtimeAuthority:false,
 obligations:['separate exact pinned Cargo/Rust unit semantics proof','actual CI command/environment/wrappers/flags/configuration must match this modeled plan before native parity','fresh original caller/module/Cargo/lock/package and direct dependency edge joins','no absent-plan or root-flag inheritance fallback']});}
export function planOriginalCargoInvocation(parser,options){
 const state=joined(parser,options),facts=observations(state);unchanged(state);plans??=new WeakMap();const token=Object.freeze({schema:'private-modeled-cargo-root-invocation-v1'});unchanged(state);plans.set(token,{state,facts});return token;
}
export function requireOriginalCargoInvocationPlan(token,parser,options){
 guard();const prior=plans?.get(token);if(!prior)fail('copied or foreign invocation plan');if(parser!==prior.state.parser||options!==prior.state.options)fail('foreign original request association');
 unchanged(prior.state);const state=joined(parser,options);if(state.frame!==prior.state.frame||state.dependencies!==prior.state.dependencies||state.packageToken!==prior.state.packageToken||!sameData(state.parsed,prior.state.parsed)||!sameData(state.request.domain,prior.state.request.domain))fail('original Cargo modeled request changed');
 unchanged(state);unchanged(prior.state);return prior.facts;
}
