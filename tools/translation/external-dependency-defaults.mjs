// Positive source facts under an explicitly registered default dependency
// domain. This never selects a Cargo unit or removes a namespace alternative.
// Language rule cargo.external-default-positive-features.v1: genuine project
// association -> complete TOML records -> bounded activation -> private proof
// -> source-bound predicate observations. Repository rule sequence is empty.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {types,isDeepStrictEqual} from 'node:util';
import {parsePrivateOriginalCargoToml,assertPrivateOriginalCargoTomlExecution} from './private-cargo-toml.mjs';
import {activateCargoFeatureRecords} from './cargo-feature-worklist.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {copyMetadata,ownData} from './extensions/source-links.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {compilationProfile,evaluateConfiguration} from './cfg-profile.mjs';
import {inspectConditionalAttribute} from './conditional-attributes.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalStaticSourceIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';

const initialQualified=originalStaticSourceIntrinsicsUnchanged();
let profiles=null,proofs=null,bytes=null,registry=null;
const descriptor=initialQualified?Object.getOwnPropertyDescriptor:null,prototype=initialQualified?Object.getPrototypeOf:null,keys=initialQualified?Reflect.ownKeys:null,own=initialQualified?Object.hasOwn:null,isArray=initialQualified?Array.isArray:null,isProxy=initialQualified?types.isProxy:null;
const objectType=initialQualified?Object:null,objectPrototype=initialQualified?prototype({}):null,arrayPrototype=initialQualified?prototype([]):null,objectValues=initialQualified?Object.values:null,objectFreeze=initialQualified?Object.freeze:null;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>throwOriginalCapturedTypeError('Original external dependency defaults: '+message);
function originalRegistry(){
  assertPrivateOriginalCargoTomlExecution();
  if(!initialQualified)fail('native source operations unavailable at import');
  if(!registry){bytes=readFileSync(new URL('./source-profiles/external-dependency-defaults/manifest.json',import.meta.url));if(hash(bytes)!=='d6b391594e58f0639235fbd2b7008e189d8b65ae2f76e1b43a8b176168cffba5')fail('source domain changed');assertPrivateOriginalCargoTomlExecution();registry=JSON.parse(bytes);assertPrivateOriginalCargoTomlExecution();}
  return registry;
}
function freeze(value){
  assertPrivateOriginalCargoTomlExecution();
  if(descriptor(globalThis,'Object')?.value!==objectType||descriptor(objectType,'values')?.value!==objectValues||descriptor(objectType,'freeze')?.value!==objectFreeze)fail('captured native data operations differ');
  function visit(value){if(value&&typeof value==='object'){for(const child of objectValues(value))visit(child);objectFreeze(value);}return value;}return visit(value);
}
function stateMaps(){originalRegistry();profiles??=new WeakMap();proofs??=new WeakMap();}
const noAuthority={closedFeatureKey:false,dependencyUnitRoleProved:false,testConfigurationProved:false,operatingSystemProved:false,stdPreludeAuthority:false,namespaceAuthority:false,attributeOwnerResolved:false,runtimeAuthority:false,runtimeParity:false};
function record(value,names){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value))fail('own data options required');
  const keys=Reflect.ownKeys(value);
  if(keys.length!==names.length||keys.some(key=>!names.includes(key)))fail('unexpected options');
  for(const name of names)ownData(value,name);
  return value;
}
function input(options){
  record(options,['module','dependencies','packageToken']);
  const module=ownData(options,'module'),dependencies=ownData(options,'dependencies'),packageToken=ownData(options,'packageToken');
  const originals=deriveDependencyOriginalInputs(dependencies),originalPackage=originalExternalTraitPackageInputs(packageToken);
  const source=ownData(module,'source'),file=ownData(module,'file'),sourceView=ownData(module,'sourceView');
  const path=copyMetadata(ownData(module,'path'));
  const profileInput=copyMetadata(ownData(module,'compilationProfile'),{preserveKeyOrder:true});
  const profile=compilationProfile(profileInput);
  if(typeof source!=='string'||Buffer.byteLength(source)>256000||typeof file!=='string'||file.length>4096||!Array.isArray(path)||path.some(part=>typeof part!=='string'))fail('bounded complete project module required');
  if(profile?.values.feature?.length||Object.hasOwn(profile?.flags??{},'feature'))fail('registered default profile has no command-line feature override proof');
  const carrier={source,file,path,sourceView,compilationProfile:profile},items=originalSourceModuleItems(carrier);
  const selected=registry.packages.filter(row=>row.name===originalPackage.dependency.package&&row.version===originalPackage.dependency.version&&row.archiveSha256===originalPackage.dependency.archiveSha256);
  if(selected.length!==1)fail('package has no registered complete default source domain');
  if(originalPackage.dependency.manifestSha256!==hash(originals.manifest)||originalPackage.dependency.lockSha256!==hash(originals.lock))fail('package capture belongs to another project dependency source');
  return {module,dependencies,packageToken,originals,originalPackage,selected:selected[0],carrier,items,profileInput};
}
// A final descriptor-only check runs after all parsing/hash observations. It
// cannot invoke a late caller getter or serializer while checking the context.
function unchanged(state,options){
  const value=(object,key)=>{if(!object||typeof object!=='object'||isProxy(object))fail('late proxy context');const field=descriptor(object,key);if(!field||!own(field,'value'))fail('late context accessor');return field.value;};
  if(!options||typeof options!=='object'||isProxy(options)||keys(options).length!==3||value(options,'module')!==state.module||value(options,'dependencies')!==state.dependencies||value(options,'packageToken')!==state.packageToken)fail('late project options changed');
  const module=state.module;if(value(module,'source')!==state.carrier.source||value(module,'file')!==state.carrier.file||value(module,'sourceView')!==state.carrier.sourceView)fail('late original module association changed');
  let cells=200000;
  function sameData(actual,expected,depth=0){
    if(--cells<0||depth>160)fail('late context data bound');
    if(expected===null||typeof expected!=='object')return actual===expected;
    if(!actual||typeof actual!=='object'||isProxy(actual)||isArray(actual)!==isArray(expected))return false;
    const parent=prototype(actual);if(parent!==objectPrototype&&parent!==arrayPrototype&&parent!==null)return false;
    const names=keys(actual),wanted=keys(expected);if(names.length!==wanted.length)return false;
    for(let at=0;at<names.length;at++){const key=names[at];if(key!==wanted[at])return false;const field=descriptor(actual,key),other=descriptor(expected,key);if(!field||!own(field,'value')||!own(other,'value')||field.enumerable!==other.enumerable||!sameData(field.value,other.value,depth+1))return false;}
    return true;
  }
  if(!sameData(value(module,'path'),state.carrier.path)||!sameData(value(module,'compilationProfile'),state.profileInput))fail('late project path/profile changed');
}
function current(prior,options){
  const next=input(options);
  if(next.module!==prior.module||next.dependencies!==prior.dependencies||next.packageToken!==prior.packageToken||next.carrier.sourceView!==prior.carrier.sourceView||next.carrier.source!==prior.carrier.source||next.carrier.file!==prior.carrier.file||next.items!==prior.items||!isDeepStrictEqual(next.carrier.path,prior.carrier.path)||!isDeepStrictEqual(next.carrier.compilationProfile,prior.carrier.compilationProfile))fail('registered project/module/package/profile association changed');
  return next;
}
// These source records are parsed afresh. The generic worklist's Map is never
// accepted from a caller and is never a certificate or compilation profile.
function sourceFeatures(state){
  const {originalPackage,originals,selected}=state;
  const manifest=originalPackage.sources.filter(row=>row.path===selected.manifestPath);
  if(manifest.length!==1||manifest[0].bytes!==selected.manifestBytes||manifest[0].sha256!==selected.manifestSha256||Buffer.byteLength(manifest[0].source)!==selected.manifestBytes||hash(manifest[0].source)!==selected.manifestSha256)fail('complete original package manifest changed');
  const parserInputs={dependencies:state.dependencies,packageToken:state.packageToken};
  const root=parsePrivateOriginalCargoToml(originals.manifest,parserInputs),parsed=parsePrivateOriginalCargoToml(manifest[0].source,parserInputs);
  const name=selected.name,version=selected.version;
  if(parsed.package?.name!==name||parsed.package?.version!==version||typeof root.package?.name!=='string'||root.package.name===name)fail('original package identities differ');
  // A string ordinary dependency has no rename, optional flag or default=false
  // override. The private original-package issuer independently checks lock and
  // registry identity; this complete TOML parse checks the actual declaration.
  if(!root.dependencies||typeof root.dependencies[name]!=='string'||root.dependencies[name]!==originalPackage.dependency.requirement)fail('ordinary unrenamed default string dependency required');
  if(Object.keys(parsed.dependencies??{}).length||Object.values(parsed.target??{}).some(target=>Object.keys(target.dependencies??{}).length))fail('package dependency forwarding requires its separate complete source rule');
  const features=parsed.features;
  if(!features||Array.isArray(features)||Object.keys(features).length>256||!Object.hasOwn(features,'default'))fail('bounded complete feature table required');
  for(const [key,values]of Object.entries(features)){
    if(!/^[A-Za-z0-9_+-]+$/u.test(key)||!Array.isArray(values)||values.length>256||values.some(value=>typeof value!=='string'||!Object.hasOwn(features,value)))fail('nonlocal or unregistered default feature edge');
  }
  const owner={name,features,dependencies:[],unrelatedDependencyAliases:[]};
  const rootRecord={name:root.package.name,features:{},dependencies:[{kind:'dependencies',alias:name,package:name,defaultFeatures:true,features:[],optional:false}],unrelatedDependencyAliases:[]};
  const active=activateCargoFeatureRecords(()=>rootRecord.name,new Map([[rootRecord.name,rootRecord],[name,owner]]),{label:'External default'});
  const activated=[...active.get(name)].sort();
  // The synthetic worklist's default entry is retained in the full trace. The
  // consumer only exposes the concrete non-default labels reached from it.
  const positiveFeatures=activated.filter(feature=>feature!=='default');
  return {positiveFeatures,activated,records:[rootRecord,owner],rootManifest:originals.manifest,packageManifest:manifest[0],rootLock:originals.lock};
}
function facts(state){
  const selected=sourceFeatures(state);
  return freeze({schema:'private-original-positive-external-defaults-v1',profile:'explicit registered ordinary direct default dependency; no command-line dependency-feature overrides',project:{file:state.carrier.file,path:state.carrier.path,source:state.carrier.source,sourceViewDigest:state.carrier.sourceView.digest,compilationProfile:state.carrier.compilationProfile},dependency:state.originalPackage.dependency,packageSourceDomainSha256:hash(bytes),parserExecution:{kind:'private exact copied CJS graph, fresh full file authentication, live native operations',input:'primitive string Cargo data only',optionalUtilInspection:'upstream caught-unavailable branch; inspector equivalence not claimed',publicCjsCacheUsed:false,parserClassesExposed:false},...selected,...noAuthority,scope:'Positive feature membership only; additional unified features and every unproved configuration atom remain unknown.'});
}
export function registerOriginalExternalDefaultProfile(options){
  stateMaps();
  const state=input(options);sourceFeatures(state);unchanged(state,options);
  const token=freeze({schema:'private-registered-external-default-profile-v1'});unchanged(state,options);profiles.set(token,state);return token;
}
export function captureOriginalExternalDependencyDefaults(profile,options){
  stateMaps();
  const prior=profiles.get(profile);if(!prior)fail('genuine private registered project profile required');
  const state=current(prior,options),value=facts(state),token=freeze({schema:'private-external-default-feature-proof-v1'});unchanged(state,options);
  proofs.set(token,{profile,input:state,value});return token;
}
export function originalExternalDependencyDefaultsFacts(token,options){
  stateMaps();
  const state=proofs.get(token);if(!state||!profiles.has(state.profile))fail('genuine private positive feature proof required');
  const next=current(state.input,options),value=facts(next);
  if(!isDeepStrictEqual(value,state.value))fail('complete original positive feature reissue differs');
  unchanged(next,options);
  return value;
}
const pairs={'(':')','[':']','{':'}'};
function endOf(tokens,at){
  const stack=[pairs[tokens[at]?.text]];if(!stack[0])fail('original delimiter required');
  for(let index=at+1;index<tokens.length;index++){
    const text=tokens[index].text;
    if(tokens[index].type!=='punct')continue;
    if(Object.hasOwn(pairs,text)){if(stack.length>=64)fail('predicate depth bound');stack.push(pairs[text]);}
    else if([')',']','}'].includes(text)){if(stack.pop()!==text)fail('predicate delimiter differs');if(!stack.length)return index;}
  }
  fail('incomplete original predicate delimiter');
}
export function observeOriginalExternalDefaultConditions(token,options,selection){
  stateMaps();
  record(selection,['path']);const path=ownData(selection,'path');
  const proof=originalExternalDependencyDefaultsFacts(token,options),state=proofs.get(token);
  if(typeof path!=='string')fail('exact original package source path required');
  const selected=state.input.originalPackage.sources.filter(row=>row.path===path);
  if(selected.length!==1||!path.endsWith('.rs')||selected[0].bytes>256000)fail('bounded complete original Rust source required');
  const source=selected[0],tokens=rustTokens(source.source).filter(token=>token.type!=='comment');
  if(tokens.length>32000)fail('original predicate token bound');
  const profile=compilationProfile({values:{feature:proof.positiveFeatures}}),conditions=[];
  for(let at=0;at<tokens.length;at++){
    if(tokens[at].text!=='#')continue;
    const open=at+(tokens[at+1]?.text==='!'?2:1);if(tokens[open]?.text!=='[')continue;
    const close=endOf(tokens,open),body=tokens.slice(open+1,close),kind=body[0]?.text;
    if(!['cfg','cfg_attr'].includes(kind))continue;
    let predicate;
    if(kind==='cfg'){
      if(body[1]?.text!=='('||endOf(body,1)!==body.length-1)fail('complete written cfg predicate required');
      predicate=body.slice(2,-1);
    }else predicate=inspectConditionalAttribute(body).predicate;
    if(!predicate.length)fail('nonempty original predicate required');
    const span={start:predicate[0].start,end:predicate.at(-1).end};
    conditions.push({kind,attributeSpan:{start:tokens[at].start,end:tokens[close].end},span,original:source.source.slice(span.start,span.end),tokens:predicate.map(row=>({text:row.text,type:row.type,start:row.start,end:row.end})),evaluation:evaluateConfiguration(predicate,profile),availabilitySelected:false,unknownBranchesRetained:true,attributeOwnerResolved:false});
    if(conditions.length>4096)fail('original condition bound');
  }
  const observed=freeze({schema:'source-bound-positive-feature-predicate-observations-v1',source,project:proof.project,dependency:proof.dependency,positiveFeatures:proof.positiveFeatures,conditions,...noAuthority,scope:'Predicate truth observations only, never attribute ownership, expansion or namespace selection.'});
  unchanged(state.input,options);const field=descriptor(selection,'path');if(keys(selection).length!==1||!field||!own(field,'value')||field.value!==path)fail('late source selection changed');return observed;
}
