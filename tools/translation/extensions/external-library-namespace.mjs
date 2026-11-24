// An explicitly requested supported input domain, not a proved Cargo unit.
// Capturing it never closes attribute owners, tool imports or trait execution.
import {types} from 'node:util';
import {matchesParserFacts,originalMatchesDependencyProof} from '../matches-macro-context.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs,originalExternalTraitClosure} from './external-trait-sources.mjs';
import {captureOriginalExternalTraitDefaultContext} from './external-trait-default-context.mjs';
import {registerOriginalExternalDefaultProfile,captureOriginalExternalDependencyDefaults,originalExternalDependencyDefaultsFacts} from '../external-dependency-defaults.mjs';
import {parsePrivateOriginalCargoToml,assertPrivateOriginalCargoTomlExecution} from '../private-cargo-toml.mjs';
import {compilationProfile} from '../cfg-profile.mjs';
import {copyMetadata} from './source-links.mjs';
import {throwOriginalCapturedTypeError} from '../original-json-intrinsics.mjs';

let registrations=null,contexts=null;
const fail=message=>throwOriginalCapturedTypeError('Original external library domain: '+message);
const samePath=(left,right)=>Array.isArray(right)&&left.length===right.length&&left.every((part,index)=>part===right[index]);
function guarded(){assertPrivateOriginalCargoTomlExecution();registrations??=new WeakMap();contexts??=new WeakMap();}
function requestInput(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own-data modeled request required');
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);
 if(keys.length!==3||!['schema','package','injectedCfg'].every(key=>Object.hasOwn(fields,key)&&Object.hasOwn(fields[key],'value')))fail('exact modeled request fields required');
 if(fields.schema.value!=='modeled-external-ordinary-library-v1'||fields.package.value!=='base64')fail('unsupported modeled library domain');
 const cfg=fields.injectedCfg.value;
 if(!Array.isArray(cfg)||types.isProxy(cfg)||Object.getPrototypeOf(cfg)!==Array.prototype)fail('empty own-data injected configuration required');
 const entries=Object.getOwnPropertyDescriptors(cfg);
 if(Reflect.ownKeys(entries).length!==1||!Object.hasOwn(entries.length,'value')||entries.length.value!==0)fail('injected configuration is outside this modeled domain');
 return Object.freeze({schema:fields.schema.value,package:fields.package.value,injectedCfg:Object.freeze([])});
}
function frame(parser){const state=matchesParserFacts(parser),dependencies=originalMatchesDependencyProof(state.facts);return {state,dependencies};}
function currentFrame(record){
 const now=frame(record.parser);
 if(now.state!==record.state||now.dependencies!==record.dependencies||now.state.facts!==record.facts||now.state.module!==record.module)fail('original parser/frame/dependency association changed');
 return now;
}
export function configureOriginalExternalLibraryDomain(parser,request){
 guarded();const selected=requestInput(request),{state,dependencies}=frame(parser);
 const record={parser,state,dependencies,facts:state.facts,module:state.module,request:selected};
 currentFrame(record);guarded();registrations.set(parser,record);return parser;
}
function selectedRegistration(parser,request){
 guarded();const record=registrations.get(parser);
 if(!record)fail('parser has no explicit modeled library request');
 if(request!==undefined){const selected=requestInput(request);if(selected.schema!==record.request.schema||selected.package!==record.request.package)fail('modeled request differs');}
 currentFrame(record);return record;
}
function facts(record){
 currentFrame(record);
 const original=originalExternalTraitPackageInputs(record.packageToken),defaults=originalExternalDependencyDefaultsFacts(record.defaults,record.options);
 if(original.crateRoot!=='src/lib.rs'||original.sources.length!==39||defaults.dependency.package!==record.registration.request.package)fail('complete original package domain differs');
 const manifests=original.sources.filter(row=>row.path==='Cargo.toml');if(manifests.length!==1)fail('one complete original package manifest required');
 const manifest=parsePrivateOriginalCargoToml(manifests[0].source,{dependencies:record.dependencies,packageToken:record.packageToken});
 if(manifest.package?.name!==record.registration.request.package||manifest.package?.version!==original.dependency.version||manifest.package?.edition!=='2021'||manifest.package?.build!==false||!['autolib','autobins','autoexamples','autotests','autobenches'].every(key=>manifest.package[key]===false)||manifest.lib?.name!==record.registration.request.package||manifest.lib?.path!==original.crateRoot||manifest.lib?.['proc-macro']!==undefined&&manifest.lib['proc-macro']!==false||manifest.lib?.['crate-type']!==undefined)fail('ordinary explicit original library declaration differs');
 const profile=compilationProfile({flags:{test:false},values:{feature:defaults.positiveFeatures},closedKeys:[]});
 currentFrame(record);guarded();
 return {schema:'modeled-original-external-library-inputs-v1',request:record.registration.request,profile,dependency:original.dependency,crateRoot:original.crateRoot,sources:original.sources,positiveDefaults:defaults,
  modeledInput:true,actualCargoConformance:false,actualEnvironmentObserved:false,actualConfigurationObserved:false,unitRoleProved:false,cfgTestProved:false,callerOwnerResolved:false,namespaceAuthority:false,traitExecutionAuthority:false,copyAuthority:false,noDropAuthority:false,nativeParity:false,
  unresolved:['original attribute and tool owner closure','complete current derive outputs for every actual owner','actual Cargo normalization and invocation role']};
}
export function captureOriginalExternalLibraryContext(parser,path,request=undefined){
 const registration=selectedRegistration(parser,request),selected=copyMetadata(path);
 if(!Array.isArray(selected)||selected.length<2||selected[0]!==registration.request.package||selected.some(part=>typeof part!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(part)))fail('complete requested original trait path required');
 const packageToken=captureOriginalExternalTraitPackage(registration.dependencies,selected[0]),module=registration.module;
 const options={module:{source:module.source,file:module.file,path:[...module.path],sourceView:module.sourceView,compilationProfile:registration.facts.compilationProfile},dependencies:registration.dependencies,packageToken};
 const profile=registerOriginalExternalDefaultProfile(options),defaults=captureOriginalExternalDependencyDefaults(profile,options);
 const record={...registration,registration,path:selected,packageToken,options,profile,defaults};facts(record);currentFrame(record);guarded();
 const token=Object.freeze({schema:'private-modeled-external-library-inputs-v1'});contexts.set(token,record);return token;
}
export function requireOriginalExternalLibraryContext(token,dependencies,path){
 guarded();const record=contexts.get(token);
 if(!record||record.dependencies!==dependencies||!samePath(record.path,copyMetadata(path)))fail('copied, foreign or changed modeled library context');
 if(selectedRegistration(record.parser)!==record.registration)fail('original modeled registration changed');return facts(record);
}
// Until the source namespace/provider obligation closes, this deliberately
// retains the existing exact refusal. A modeled profile is never that proof.
export function originalExternalTraitLibraryClosure(dependencies,path,token){
 const domain=requireOriginalExternalLibraryContext(token,dependencies,path),record=contexts.get(token);
 const originalDefault=captureOriginalExternalTraitDefaultContext(record.parser,path),result=originalExternalTraitClosure(dependencies,path,originalDefault);
 requireOriginalExternalLibraryContext(token,dependencies,path);return {...result,modeledLibraryInput:domain};
}
