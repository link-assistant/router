// Source-only Cargo/Rust program evidence. Full-source identity is necessary,
// never sufficient, for manifest normalization, caller/type ownership or cfg.
import {constants,openSync,closeSync,readSync,fstatSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {assertPrivateOriginalCargoTomlExecution} from './private-cargo-toml.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';

const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
// Qualification belongs to THIS source reader and does not expand a shared
// bootstrap domain. A cold changed parser stays disqualified after restore.
const parseOwner=initial?Object.getOwnPropertyDescriptor(globalThis,'JSON')?.value:null;
const parseField=initial&&parseOwner?Object.getOwnPropertyDescriptor(parseOwner,'parse'):null;
const parseInitial=!!(initial&&parseField&&Object.hasOwn(parseField,'value')&&originalCapturedFunctionSource(parseField.value)==='function parse() { [native code] }');
let root=null,programs=null;
const fail=message=>throwOriginalCapturedTypeError('Original Cargo unit source: '+message);
function guard(){if(!initial||!parseInitial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified source operations changed');const field=Object.getOwnPropertyDescriptor(parseOwner,'parse');if(!field||!Object.hasOwn(field,'value')||field.value!==parseField.value||field.writable!==parseField.writable||field.enumerable!==parseField.enumerable||field.configurable!==parseField.configurable)fail('qualified source JSON parser changed');assertPrivateOriginalCargoTomlExecution();}
function hash(bytes){const digest=createHash('sha256').update(bytes).digest('hex');guard();return digest;}
// Rebind the ENTIRE decoded primitive to its authenticated raw UTF8 pin.
// Buffer decoding is callback-capable under the existing I/O boundary; neither
// its return value nor a prior issuer's decode is trusted without this join.
export function revalidateOriginalCargoSourceText(value,bytes,sha256){
 guard();if(typeof value!=='string'||!Number.isSafeInteger(bytes)||bytes<0||bytes>2097152||value.length>bytes||typeof sha256!=='string'||!/^[a-f0-9]{64}$/u.test(sha256))fail('bounded primitive source text and pin required');
 let count=0;for(let at=0;at<value.length;at++){const code=value.charCodeAt(at);if(code<128)count++;else if(code<2048)count+=2;else if(code>=55296&&code<=56319){if(at+1>=value.length)fail('source text has an unpaired surrogate');const low=value.charCodeAt(++at);if(low<56320||low>57343)fail('source text has an unpaired surrogate');count+=4;}else if(code>=56320&&code<=57343)fail('source text has an unpaired surrogate');else count+=3;}
 if(count!==bytes||hash(value)!==sha256)fail('complete decoded source text differs from raw pin');guard();return value;
}
function decoded(raw,bytes,sha256){const value=raw.toString('utf8');guard();return revalidateOriginalCargoSourceText(value,bytes,sha256);}
const identity=stat=>({dev:stat.dev,ino:stat.ino,size:stat.size,mode:stat.mode,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs});
const directoryIdentity=stat=>({dev:stat.dev,ino:stat.ino,mode:stat.mode});
const sameDirectory=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mode===b.mode&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
function original(path,limit,records){
 let parent=dirname(path);while(parent!==dirname(parent)){const row=lstatSync(parent);if(!row.isDirectory()||row.isSymbolicLink())fail('linked source directory');records.push({path:parent,kind:'directory',identity:directoryIdentity(row)});parent=dirname(parent);}
 const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size>limit)fail('bounded regular source required');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const opened=fstatSync(fd);if(!same(identity(before),identity(opened)))fail('source fd differs');const raw=Buffer.alloc(opened.size);let at=0;
  while(at<raw.length){const count=readSync(fd,raw,at,raw.length-at,at);if(!count)fail('source truncated');at+=count;}
  if(readSync(fd,Buffer.alloc(1),0,1,at)||!same(identity(opened),identity(fstatSync(fd)))||!same(identity(opened),identity(lstatSync(path))))fail('source changed while reading');
  records.push({path,kind:'file',identity:identity(opened)});return raw;
 }finally{closeSync(fd);}
}
// Directory identity binds ancestry, not unrelated sibling mtime/size. Each
// original file retains the full size/mtime/ctime identity independently.
function unchanged(records){guard();for(const row of records){const now=lstatSync(row.path);if(row.kind==='directory'){if(!now.isDirectory()||now.isSymbolicLink()||!sameDirectory(directoryIdentity(now),row.identity))fail('original source directory identity changed');}else if(!now.isFile()||now.isSymbolicLink()||!same(identity(now),row.identity))fail('full source identity changed');}guard();}
function sameEvidence(left,right,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('serialized source evidence bound');
 if(left===null||typeof left!=='object')return left===right;
 if(!right||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
 const keys=Reflect.ownKeys(left),other=Reflect.ownKeys(right);if(keys.length!==other.length)return false;
 for(let at=0;at<keys.length;at++){const key=keys[at];if(key!==other[at])return false;const a=Object.getOwnPropertyDescriptor(left,key),b=Object.getOwnPropertyDescriptor(right,key);if(!a||!b||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||!sameEvidence(a.value,b.value,depth+1,budget))return false;}return true;
}
function frozen(value){if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
const U='src/cargo/core/compiler/unit_dependencies.rs',M='src/cargo/core/manifest.rs',D='src/cargo/core/dependency.rs',T='src/cargo/util/toml/targets.rs',N='src/cargo/util/toml/mod.rs',S='crates/cargo-util-schemas/src/manifest/mod.rs';
// A selector retains the COMPLETE item and enclosing implementation. Selection
// is not permission to treat an opaque body/default/derive as an interpretation.
const selectors=[
 [U,'fn','compute_deps'],[U,'fn','calc_artifact_deps'],[U,'fn','check_or_build_mode'],[U,'fn','new_unit_dep'],[U,'fn','new_unit_dep_with_profile'],[U,'fn','deps','State'],
 ['src/cargo/core/compiler/unit.rs','struct','UnitInner'],['src/cargo/core/compiler/unit.rs','fn','intern','UnitInterner'],
 ['src/cargo/core/compiler/build_config.rs','enum','CompileMode'],['src/cargo/core/compiler/build_config.rs','fn','is_any_test','CompileMode'],
 ['src/cargo/core/compiler/mod.rs','fn','prepare_rustc'],['src/cargo/core/compiler/mod.rs','fn','build_base_args'],['src/cargo/core/compiler/mod.rs','fn','add_custom_flags'],
 ['src/cargo/ops/cargo_compile/unit_generator.rs','fn','generate_root_units','UnitGenerator'],['src/cargo/ops/cargo_compile/unit_generator.rs','fn','proposals_to_units','UnitGenerator'],
 [D,'fn','parse','Dependency'],[D,'fn','new_override','Dependency'],[D,'fn','is_transitive','Dependency'],
 [M,'fn','new','Target'],[M,'fn','lib_target','Target'],[M,'fn','is_lib','Target'],[M,'fn','is_test','Target'],[M,'fn','is_example','Target'],[M,'fn','is_custom_build','Target'],
 [T,'fn','to_targets'],[T,'fn','to_lib_target'],[T,'fn','configure'],[T,'fn','normalize_build'],
 [N,'fn','deserialize_toml'],[N,'fn','normalize_toml'],[N,'fn','normalize_package_toml'],[N,'fn','normalize_dependencies'],[N,'fn','to_real_manifest'],[N,'fn','gather_dependencies'],[N,'fn','dep_to_dependency'],[N,'fn','detailed_dep_to_dependency'],
 [S,'enum','TomlDependency'],[S,'fn','deserialize','forTomlDependency'],[S,'struct','TomlDetailedDependency'],[S,'type','TomlLibTarget'],[S,'struct','TomlTarget'],[S,'fn','default','DefaultforTomlDetailedDependency'],[S,'fn','proc_macro','TomlTarget'],[S,'fn','crate_types','TomlTarget'],[S,'fn','normalized_build','TomlPackage'],
 ['compiler/rustc_session/src/config.rs','fn','build_session_options'],['compiler/rustc_session/src/config.rs','fn','build_configuration'],
 ['compiler/rustc_session/src/session.rs','fn','is_test_crate','Session'],
 ['compiler/rustc_session/src/config/cfg.rs','fn','disallow_cfgs'],['compiler/rustc_session/src/config/cfg.rs','fn','default_configuration'],
];
function compact(text){return rustTokens(text).filter(token=>token.type!=='comment').map(token=>token.text).join('');}
function selected(origin,term,name,owner){
 const found=[];
 function walk(source,offset,enclosing){
  for(const item of sourceItems(source)){
   if(item.comment)continue;const start=offset+item.start,end=offset+item.end,original=origin.source.slice(start,end);
   if(item.term===term&&item.name===name&&(!owner||enclosing&&enclosing.header.includes(owner)))found.push({repository:origin.repository,path:origin.sourcePath,sha256:origin.sha256,span:{start,end},original,enclosing:enclosing??null});
   if(item.term==='impl'){
    const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);
    if(!open||close?.text!=='}')fail('complete implementation syntax required');
    const header=compact(source.slice(item.start,open.start));
    walk(source.slice(open.end,close.start),offset+open.end,{header,span:{start,end},original});
   }
  }
 }
 walk(origin.source,0,null);if(found.length!==1)fail('whole original item absent or ambiguous: '+origin.sourcePath+'::'+name);return found[0];
}
// These complete-body rules have deliberately narrow semantic conclusions.
// They cannot construct the Target/Dependency/Session receiver themselves.
const modeRecipe='fn check_or_build_mode(mode:CompileMode,target:&Target)->CompileMode{match mode{CompileMode::Check{..}|CompileMode::Doc{..}|CompileMode::Docscrape=>{if target.for_host(){CompileMode::Build}else{CompileMode::Check{test:false}}}_=>CompileMode::Build,}}';
const testRecipe='pub fn is_any_test(self)->bool{matches!(self,CompileMode::Test|CompileMode::Check{test:true}|CompileMode::Doctest)}';
const sessionRecipe='pub fn is_test_crate(&self)->bool{self.opts.test}';
function recipe(value,expected){const actual=compact(value.original);if(actual!==compact(expected))fail('complete original semantic recipe differs: '+value.path);return {source:value,actualTokens:rustTokens(value.original).filter(token=>token.type!=='comment').map(token=>({text:token.text,start:token.start,end:token.end})),expected:expected,completeBodyChecked:true};}
export function originalCargoUnitSourceProgram(){
 guard();root??=fileURLToPath(new URL('./source-profiles/cargo-normal-dependency-unit/',import.meta.url));
 const records=[],profileRaw=original(join(root,'manifest.json'),32768,records);
 if(hash(profileRaw)!=='01ffc3d96113b8530c3e9b23c37a37e60c438c5a275447213f751611c798be95')fail('source registry differs');
 const profileText=decoded(profileRaw,profileRaw.length,'01ffc3d96113b8530c3e9b23c37a37e60c438c5a275447213f751611c798be95');guard();const profile=JSON.parse(profileText);guard();if(profile.sources.length!==17||profile.originalBytes!==696289||profile.cargoCommit!=='c24e1064277fe51ab72011e2612e556ac56addf7'||profile.rustCommit!=='29483883eed69d5fb4db01964cdf2af4d86e9cb2')fail('complete pinned source profile required');
 const sources=[];let total=0;
 for(const row of profile.sources){
  if(typeof row.archive!=='string'||row.archive.startsWith('/')||row.archive.split('/').some(part=>!part||part==='.'||part==='..'))fail('original source archive path escapes');
  const packed=original(join(root,row.archive),262144,records);if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete source archive differs');
  const raw=row.encoding==='gzip'?gunzipSync(packed,{maxOutputLength:262144}):packed;guard();total+=raw.length;
  if(raw.length!==row.bytes||hash(raw)!==row.sha256||total>1048576)fail('complete original decoded source differs');guard();const source=decoded(raw,row.bytes,row.sha256);guard();sources.push({...row,source});
 }
 if(total!==696289)fail('complete source census differs');
 const selections=selectors.map(([path,term,name,owner])=>{const originals=sources.filter(row=>row.sourcePath===path);if(originals.length!==1)fail('original source path ambiguous');return {term,name,owner:owner??null,...selected(originals[0],term,name,owner)};});
 const find=name=>{const rows=selections.filter(row=>row.name===name);if(rows.length!==1)fail('semantic recipe selection ambiguous');return rows[0];};
 const rules=[{id:'cargo.complete-check-or-build-mode.v1',...recipe(find('check_or_build_mode'),modeRecipe),conclusion:'Given an actual ordinary dependency Target and parent Build/Test, return Build. Given parent Check and !Target.for_host(), return Check{test:false}.'},
  {id:'cargo.complete-is-any-test.v1',...recipe(find('is_any_test'),testRecipe),conclusion:'Actual CompileMode::Build and CompileMode::Check{test:false} are not any-test.'},
  {id:'rust.complete-session-test-projection.v1',...recipe(find('is_test_crate'),sessionRecipe),conclusion:'Given an actual Session receiver, return its opts.test. This alone does not construct Options or close user cfg.'}];
 const obligations=[
  {id:'cargo.manifest-deserialization-and-normalization',status:'open',reason:'Exact Cargo schema uses derived Deserialize and workspace/manifest normalization. Matching serde/toml deserializer semantics and fresh typed-value forwarding are not proved by these source selections.'},
  {id:'cargo.schema-option-default-owner',status:'open',reason:'Full Option fields and TomlDetailedDependency Default are retained. Selecting an original core Option Default method does not prove the Cargo caller/type/trait/default-owner join.'},
  {id:'cargo.actual-normal-unit-constructor-forwarding',status:'open',reason:'Whole dependency/target/mode/interner control flow is retained, but until normalized Target and Dependency constructors are proved, a modeled request is not an issued normal-unit value.'},
  {id:'rust.actual-options-user-cfg-forwarding',status:'open',reason:'User --cfg test is legal. Options/session and all flags/custom-output forwarding must be joined to the same closed modeled unit; no inferred absence or root cfg inheritance.'},
  {id:'cargo.real-ci-conformance',status:'independent',reason:'The private request models a supported command. Actual argv/environment/configuration/wrappers must be verified in CI before native parity.'},
 ];
 const program={schema:'original-cargo-normal-unit-source-program-v1',profileSha256:hash(profileRaw),sources,selections,rules,obligations,serializedCheckedEvidence:null,normalizationComplete:false,unitRoleAuthority:false,cfgAuthority:false,namespaceAuthority:false,runtimeAuthority:false,nativeParity:false};
 // Source-bearing evidence round trip does not promote an obligation to proof.
 const evidence={schema:program.schema,selections,rules,obligations},wire=JSON.stringify(evidence);guard();const reparsed=JSON.parse(wire);guard();if(!sameEvidence(evidence,reparsed))fail('serialized source evidence differs');program.serializedCheckedEvidence={wire,reparsed};
 unchanged(records);frozen(program);unchanged(records);programs??=new WeakMap();programs.set(program,records);unchanged(records);return program;
}

export function assertOriginalCargoUnitSourceProgram(program){
 guard();const records=programs?.get(program);if(!records)fail('copied or foreign source program');unchanged(records);return program;
}
