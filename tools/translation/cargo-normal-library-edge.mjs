// A relational Cargo postcondition, independent of rustc cfg flags. This does
// not reconstruct a Target from raw TOML or claim that a native unit ran.
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalCargoUnitSourceProgram,assertOriginalCargoUnitSourceProgram,revalidateOriginalCargoSourceText} from './cargo-unit-source-semantics.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {parsePrivateOriginalCargoToml,assertPrivateOriginalCargoTomlExecution} from './private-cargo-toml.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalPrivateParserIngressUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const plans=initial?new WeakSet():null,edges=initial?new WeakMap():null;
const fail=message=>throwOriginalCapturedTypeError('Original Cargo library edge: '+message);
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
function guard(){if(!initial||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified original source operations changed');assertPrivateOriginalCargoTomlExecution();}
const compact=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join('');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function select(program,path,name,owner=null){
 const origin=program.sources.find(row=>row.sourcePath===path);if(!origin)fail('complete original source absent');const found=[];
 function walk(source,offset,enclosing){for(const item of sourceItems(source)){
  if(item.comment)continue;const start=offset+item.start,end=offset+item.end;
  if(item.term==='fn'&&item.name===name&&(!owner||enclosing?.header.includes(owner)))found.push({path,sourceSha256:origin.sha256,name,span:{start,end},original:origin.source.slice(start,end),enclosing});
  if(item.term==='impl'){const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);if(!open||close?.text!=='}')fail('complete original implementation required');walk(source.slice(open.end,close.start),offset+open.end,{header:compact(source.slice(item.start,open.start)),span:{start,end},original:origin.source.slice(start,end)});}
 }}walk(origin.source,0,null);if(found.length!==1)fail('complete original callback absent/ambiguous: '+name);return found[0];
}
function whole(callback,source,conclusion){if(compact(callback.original)!==compact(source))fail('complete original relational body differs: '+callback.name);return {callback,source,conclusion,completeBodyChecked:true};}
function route(callback,source,conclusion){const all=compact(callback.original),part=compact(source),at=all.indexOf(part);if(!part||at<0||all.indexOf(part,at+1)>=0)fail('original forwarding route differs: '+callback.name);return {callback,source,conclusion,completeCallbackRetained:true};}
export function originalCargoNormalLibraryEdgeSourcePlan(){
 guard();const program=originalCargoUnitSourceProgram(),unit='src/cargo/core/compiler/unit_dependencies.rs',manifest='src/cargo/core/manifest.rs';
 const callbacks={compute:select(program,unit,'compute_deps'),select:select(program,unit,'calc_artifact_deps'),mode:select(program,unit,'check_or_build_mode'),dep:select(program,unit,'new_unit_dep'),profile:select(program,unit,'new_unit_dep_with_profile'),filter:select(program,unit,'deps','State'),
  intern:select(program,'src/cargo/core/compiler/unit.rs','intern','UnitInterner'),internInner:select(program,'src/cargo/core/compiler/unit.rs','intern_inner','UnitInterner'),lib:select(program,manifest,'is_lib','Target'),test:select(program,manifest,'is_test','Target'),example:select(program,manifest,'is_example','Target'),kind:select(program,manifest,'kind','Target'),
  anyTest:select(program,'src/cargo/core/compiler/build_config.rs','is_any_test','CompileMode'),transitive:select(program,'src/cargo/core/dependency.rs','is_transitive','Dependency')};
 const rules=[
  whole(callbacks.lib,'pub fn is_lib(&self)->bool{matches!(self.kind(),TargetKind::Lib(_))}','an actual selected library has TargetKind::Lib'),
  whole(callbacks.test,'pub fn is_test(&self)->bool{*self.kind()==TargetKind::Test}','a Lib target is not a Test target'),
  whole(callbacks.example,'pub fn is_example(&self)->bool{matches!(self.kind(),TargetKind::ExampleBin|TargetKind::ExampleLib(..))}','a Lib target is not an Example target'),
  whole(callbacks.kind,'pub fn kind(&self)->&TargetKind{&self.inner.kind}','all target predicates project the same actual kind'),
  whole(callbacks.anyTest,'pub fn is_any_test(self)->bool{matches!(self,CompileMode::Test|CompileMode::Check{test:true}|CompileMode::Doctest)}','Build and Check(false) are never any-test'),
  whole(callbacks.transitive,'pub fn is_transitive(&self)->bool{match self.inner.kind{DepKind::Normal|DepKind::Build=>true,DepKind::Development=>false,}}','all Development edges are nontransitive'),
  whole(callbacks.mode,'fn check_or_build_mode(mode:CompileMode,target:&Target)->CompileMode{match mode{CompileMode::Check{..}|CompileMode::Doc{..}|CompileMode::Docscrape=>{if target.for_host(){CompileMode::Build}else{CompileMode::Check{test:false}}}_=>CompileMode::Build,}}','for every parent mode and either host predicate, dependency mode is Build or Check(false)'),
  route(callbacks.select,'if has_artifact_lib || maybe_non_artifact_lib { Ok(artifact_pkg.targets().iter().find(|t| t.is_lib())) } else { Ok(None) }','every returned Some target satisfies the actual library predicate; opaque artifact internals cannot supply a Test or Example'),
  route(callbacks.compute,'let Some(dep_lib) = calc_artifact_deps(unit, unit_for, dep_pkg_id, &deps, state, &mut ret)? else { continue; }; let dep_pkg = state.get(dep_pkg_id); let mode = check_or_build_mode(unit.mode, dep_lib);','same selected actual target enters the total dependency-mode transfer'),
  route(callbacks.compute,`if state.gctx.cli_unstable().dual_proc_macros && dep_lib.proc_macro() && !unit.kind.is_host() {
   let unit_dep = new_unit_dep(state, unit, dep_pkg, dep_lib, dep_unit_for, unit.kind, mode, IS_NO_ARTIFACT_DEP,)?; ret.push(unit_dep);
   let unit_dep = new_unit_dep(state, unit, dep_pkg, dep_lib, dep_unit_for, CompileKind::Host, mode, IS_NO_ARTIFACT_DEP,)?; ret.push(unit_dep);
  } else {
   let unit_dep = new_unit_dep(state, unit, dep_pkg, dep_lib, dep_unit_for, unit.kind.for_target(dep_lib), mode, IS_NO_ARTIFACT_DEP,)?; ret.push(unit_dep);
  }`,'ordinary and both dual-proc-macro library edges forward that same target and mode'),
  route(callbacks.dep,'new_unit_dep_with_profile(state, parent, pkg, target, unit_for, kind, mode, profile, artifact,)','profile lookup preserves the actual target and mode arguments'),
  route(callbacks.profile,'let unit = state.interner.intern(pkg,target,profile,kind,mode,features,','unit construction forwards the same actual target and mode'),
  route(callbacks.intern,'_ => target.clone(),','ordinary interning retains the actual target'),
  route(callbacks.intern,'new_target.set_kind(TargetKind::Lib(vec![CrateType::Rlib]));','the build-std special branch preserves Lib; no test/example kind is introduced'),
  route(callbacks.intern,'let inner = self.intern_inner(&UnitInner { pkg: pkg.clone(), target, profile, kind, mode, features,','the actual unit stores the selected target and transferred mode; rustflags are a separate field'),
  whole(callbacks.internInner,`fn intern_inner(&self,item:&UnitInner)->Rc<UnitInner>{let mut me=self.state.borrow_mut();if let Some(item)=me.cache.get(item){return item.clone();}let item=Rc::new(item.clone());me.cache.insert(item.clone());item}`,'interning returns the same complete UnitInner key, freshly cloned or equal under its actual Eq owner'),
  route(callbacks.filter,'if !dep.is_transitive() && !unit.target.is_test() && !unit.target.is_example() && !unit.mode.is_any_test() { return false; }','every Development edge is rejected for this dependency-library unit, independently of rustc cfg test'),
 ];
 // This range proof quantifies over both target-host branches. It needs no
 // Option Default, TOML deserializer, profile, target triple or cfg evaluation.
 const cases=[{parent:'Check/Doc/Docscrape',forHost:false,mode:{kind:'Check',test:false}},{parent:'Check/Doc/Docscrape',forHost:true,mode:{kind:'Build'}},{parent:'all remaining original modes',forHost:false,mode:{kind:'Build'}},{parent:'all remaining original modes',forHost:true,mode:{kind:'Build'}}];
 assertOriginalCargoUnitSourceProgram(program);guard();const value=freeze({schema:'original-normal-library-edge-relational-source-v1',program,callbacks,rules,cases,
  postcondition:{selectedTargetKind:'Lib',isTest:false,isExample:false,isAnyTest:false,developmentEdgesExcluded:true},
  cfgTestSelected:false,rawManifestNormalizationClaimed:false,wholeCargoExecuted:false,actualInvocationObserved:false,namespaceAuthority:false,runtimeAuthority:false});plans.add(value);return value;
}
export function requireOriginalCargoNormalLibraryEdgeSourcePlan(plan){guard();if(!plans.has(plan))fail('copied or foreign relational source plan');assertOriginalCargoUnitSourceProgram(plan.program);return plan;}
function join(dependencies,packageToken){
 guard();const inputs=deriveDependencyOriginalInputs(dependencies),original=originalExternalTraitPackageInputs(packageToken),name=original.dependency.package;
 if(hash(inputs.manifest)!==original.dependency.manifestSha256||hash(inputs.lock)!==original.dependency.lockSha256)fail('original dependency/package association differs');
 for(const row of original.sources)revalidateOriginalCargoSourceText(row.source,row.bytes,row.sha256);guard();
 const root=parsePrivateOriginalCargoToml(inputs.manifest,{dependencies,packageToken}),manifests=original.sources.filter(row=>row.path==='Cargo.toml');if(manifests.length!==1)fail('complete original package manifest absent');
 const parsed=parsePrivateOriginalCargoToml(manifests[0].source,{dependencies,packageToken});
 if(root.dependencies?.[name]!==original.dependency.requirement||typeof root.dependencies[name]!=='string')fail('same direct unrenamed original normal dependency required');
 if(parsed.package?.name!==name||parsed.package?.version!==original.dependency.version||parsed.lib?.path!==original.crateRoot||parsed.lib?.name!==name||parsed.package.autolib!==false||parsed.package.build!==false)fail('same explicit original library and build=false required');
 if(parsed.dependencies&&Object.keys(parsed.dependencies).length||parsed['build-dependencies']&&Object.keys(parsed['build-dependencies']).length||parsed.target||parsed.patch||parsed.replace||parsed.workspace)fail('additional original normal/build/conditional/overridden producer namespace remains open');
 if(parsed.lib['proc-macro']!==undefined&&parsed.lib['proc-macro']!==false||parsed.lib['proc_macro']!==undefined&&parsed.lib['proc_macro']!==false)fail('original library is not an ordinary source library');
 const plan=originalCargoNormalLibraryEdgeSourcePlan();guard();return {inputs,original,parsed,plan};
}
export function captureOriginalNormalLibraryDependencyEdge(dependencies,packageToken){
 const state=join(dependencies,packageToken),token=Object.freeze({schema:'private-original-normal-library-dependency-edge-v1'});edges.set(token,{dependencies,packageToken,state});return token;
}
export function originalNormalLibraryDependencyEdgeFacts(token,dependencies,packageToken){
 guard();const prior=edges.get(token);if(!prior||prior.dependencies!==dependencies||prior.packageToken!==packageToken)fail('copied foreign or changed original library edge');const current=join(dependencies,packageToken);
 if(current.inputs.manifest!==prior.state.inputs.manifest||current.inputs.lock!==prior.state.inputs.lock||current.original.sources.some((row,at)=>row!==prior.state.original.sources[at]))fail('complete original namespace inputs changed');
 requireOriginalCargoNormalLibraryEdgeSourcePlan(current.plan);guard();return freeze({schema:'original-dependency-library-development-edge-exclusion-v1',dependency:current.original.dependency,crateRoot:current.original.crateRoot,sourcePlan:current.plan,originalDevDependencies:current.parsed['dev-dependencies']??null,
  declaredNormalDependencies:[],developmentEdgesExcluded:true,sourceNamespaceOnly:true,unresolvedChildImportDiagnosticsRetained:true,cfgTestProved:false,cfgBranches:['false','true'],manifestNormalizationComplete:false,actualInvocationObserved:false,actualEnvironmentObserved:false,nativeParity:false,wholeCrateValidity:false,namespaceAuthority:false,runtimeAuthority:false});
}
