// Fresh source DATA only. No source inventory, hash or verdict crosses calls.
// The private source-plan constructor supplies its own fixed default root.
// SOURCE ONLY; all behavior, performance and receiving qualification UNRUN.
import {openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalDeriveHelperCryptoUnchanged} from './derive-footprints.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const ROOT=fileURLToPath(new URL('./source-profiles/derive-ancestor-scope/',import.meta.url));
const MANIFEST_BYTES=6307,MANIFEST_SHA256='9113a635e5534c083dbc3af97ef815040fc916548a245e5477941873f7dc62f5';
const SOURCE={"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_resolve/src/build_reduced_graph.rs","archive":"rust-build-reduced-graph.rs.gz","bytes":65553,"sha256":"dca3a2782dc08787fb88cf3a131165b95b02eba5153dcfecc47ad1bf87e03f6c","archiveBytes":14211,"archiveSha256":"d88a7702b589027bed50c5d5126be80b2d0410c0210a54f7272c2597a038e2e1"};
const fail=message=>{throw new TypeError('Fresh impl namespace source: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function guard(){if(!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalLexingIntrinsicsUnchanged())fail('original parser and DATA intrinsics changed');}
function read(path,size,digest){
 const descriptor=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{
  const before=fstatSync(descriptor);if(!before.isFile()||before.size!==size)fail('actual complete source file size differs');
  const bytes=Buffer.alloc(size+1);let length=0;while(length<bytes.length){const count=readSync(descriptor,bytes,length,bytes.length-length,length);if(count===0)break;length+=count;}
  const after=fstatSync(descriptor);if(length!==size||after.size!==size||before.dev!==after.dev||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||hash(bytes.subarray(0,size))!==digest)fail('current complete source bytes differ');
  return bytes.subarray(0,size);
 }finally{closeSync(descriptor);}
}
/** The directory option supports independent DATA-reader fixtures only. */
export function withFreshImplNamespaceSource(run,{directory=ROOT}={}){
 if(typeof run!=='function'||typeof directory!=='string'||directory.length>4096||directory.includes(String.fromCharCode(0)))fail('bounded source reader inputs required');guard();
 const base=resolve(directory),manifest=join(base,'manifest.json'),archive=resolve(base,SOURCE.archive);if(relative(base,archive)!==SOURCE.archive)fail('source archive escapes its pinned profile');
 const profile=read(manifest,MANIFEST_BYTES,MANIFEST_SHA256),packed=read(archive,SOURCE.archiveBytes,SOURCE.archiveSha256);
 const current=JSON.parse(profile.toString('utf8')),selected=current.sources.filter(row=>row.path===SOURCE.path);if(selected.length!==1||JSON.stringify(selected[0])!==JSON.stringify(SOURCE))fail('complete manifest source owner differs');
 const raw=gunzipSync(packed,{maxOutputLength:SOURCE.bytes});if(raw.length!==SOURCE.bytes||hash(raw)!==SOURCE.sha256)fail('complete native source differs');
 const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),reparsed=transportConcreteSyntaxMeta(concrete.meta);if(reparsed.source!==source||hash(source)!==SOURCE.sha256)fail('full original Rust CST round trip differs');
 guard();try{const result=run(Object.freeze({path:SOURCE.path,sha256:SOURCE.sha256,source:reparsed.source,profileSha256:MANIFEST_SHA256,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false}));if(result&&typeof result==='object'&&typeof result.then==='function')fail('source reader callback must finish synchronously');return result;}
 finally{try{read(manifest,MANIFEST_BYTES,MANIFEST_SHA256);read(archive,SOURCE.archiveBytes,SOURCE.archiveSha256);}finally{guard();}}
}

const SOURCE_PINS=[{"path":"compiler/rustc_resolve/src/build_reduced_graph.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_resolve/src/build_reduced_graph.rs","archive":"rust-build-reduced-graph.rs.gz","bytes":65553,"sha256":"dca3a2782dc08787fb88cf3a131165b95b02eba5153dcfecc47ad1bf87e03f6c","archiveBytes":14211,"archiveSha256":"d88a7702b589027bed50c5d5126be80b2d0410c0210a54f7272c2597a038e2e1"},{"path":"compiler/rustc_resolve/src/def_collector.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_resolve/src/def_collector.rs","archive":"rust-def-collector.rs.gz","bytes":20848,"sha256":"ca7983669e2cf8c7efa1be4191f3c557c1c3a8ccabfb87f1395e563b214538e8","archiveBytes":5224,"archiveSha256":"6abe0f16b8829f2eb4229a11a95194743c205528965f4fc5c4d6241b50ee4e0f"},{"path":"compiler/rustc_resolve/src/macros.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_resolve/src/macros.rs","archive":"../tool-attributes/rust-resolve-macros-1.89.0.rs.gz","bytes":49779,"sha256":"301b413a2fe0c2aaee658165993272a9fa39f4aca6cc22b0ca38d08ef80b405e","archiveBytes":12478,"archiveSha256":"f8b07424cafe525fb9ab14238a7c71c2cde9b2d3b52ab6dffb1b1b0224a5a697","reuse":"complete retained original bytes; no earlier profile row or archive changed"},{"path":"compiler/rustc_expand/src/mbe/macro_rules.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_expand/src/mbe/macro_rules.rs","archive":"../source-clone/rust-1.89-macro_rules.rs.gz","bytes":56723,"sha256":"8e6dbbb0ec8bcb49b2f8e5b943621a95039c2779131a34930f516db13ff7a8d5","archiveBytes":14900,"archiveSha256":"ee1c5bd38944837a73044b3879966e612876ab169c8a8547ff05cd5af27b74d2","reuse":"complete retained original bytes; no earlier profile row or archive changed"},{"path":"compiler/rustc_expand/src/base.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_expand/src/base.rs","archive":"../clap-concat/rust-1.89-base.rs.gz","bytes":52174,"sha256":"0bf27a4b3d96610af84dd2dd9780587e0fb4ac0fb951bbc53f982295f837077f","archiveBytes":12220,"archiveSha256":"203c8d2ef3a0774863906f41da8d5d398d08b65834468946f7d79aee6224c4d9","reuse":"complete retained original bytes; no earlier profile row or archive changed"},{"path":"compiler/rustc_expand/src/config.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_expand/src/config.rs","archive":"../conditional-attributes/rust-expand-config-1.89.0.rs.gz","bytes":19343,"sha256":"164793e06f844ef96778a8d5593cc3e44cea542d764f49a27aebc42daa711f0e","archiveBytes":5323,"archiveSha256":"a87988a492b51b47fe9984e0afb5475c6f88770580fe95d998a18cf045471db6","reuse":"complete retained original bytes; no earlier profile row or archive changed"},{"path":"compiler/rustc_parse/src/parser/item.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_parse/src/parser/item.rs","archive":"../builtin-derive-bang/rust-1.89-compiler_rustc_parse_src_parser_item.rs.gz","bytes":138843,"sha256":"072e9ef9c2554296643fdb16102462b5d15b8255e39142a9d697e03d6a9240c2","archiveBytes":29991,"archiveSha256":"7a825544f645089aa9c3f872e89f40fced2e8c32bb1429b24b8fd046bf6ad659","reuse":"complete retained original bytes; no earlier profile row or archive changed"},{"path":"compiler/rustc_feature/src/builtin_attrs.rs","url":"https://raw.githubusercontent.com/rust-lang/rust/29483883eed69d5fb4db01964cdf2af4d86e9cb2/compiler/rustc_feature/src/builtin_attrs.rs","archive":"../tool-attributes/rust-builtin-attrs-1.89.0.rs.gz","bytes":53039,"sha256":"2f6de6720effcaef643447287b65cc471e8f0f00122e3ec8dae3fb129f106a32","archiveBytes":10242,"archiveSha256":"1146eb5e90bf1f88a57daac5be5d2596d5256beeb0a82e82c2e853061ff2050e","reuse":"complete retained original bytes; no earlier profile row or archive changed"}];
// Multi-source DATA reader. Native private plan constructors choose their
// own fixed selections and fixed default root; no caller proof is admitted.
export function withFreshAncestorNamespaceSources(paths,run,{directory=ROOT}={}){
 if(!Array.isArray(paths)||paths.length<1||paths.length>8||paths.some(path=>typeof path!=='string')||new Set(paths).size!==paths.length||typeof run!=='function'||typeof directory!=='string'||directory.length>4096||directory.includes(String.fromCharCode(0)))fail('bounded explicit source selections required');
 guard();const base=resolve(directory),profiles=resolve(base,'..'),manifest=join(base,'manifest.json'),profile=read(manifest,MANIFEST_BYTES,MANIFEST_SHA256),current=JSON.parse(profile.toString('utf8')),inputs=[],sources=[];let total=0;
 function archivePath(pin){
  const archive=resolve(base,pin.archive),local=relative(profiles,archive);if(local==='..'||local.startsWith('..'+sep)||isAbsolute(local))fail('ancestor archive escapes the pinned profiles');return archive;
 }
 for(const path of paths){
  const selected=SOURCE_PINS.filter(pin=>pin.path===path),actual=current.sources.filter(pin=>pin.path===path);if(selected.length!==1||actual.length!==1||JSON.stringify(selected[0])!==JSON.stringify(actual[0]))fail('actual complete selected source owner differs');
  const pin=selected[0];if(pin.bytes>180000||(total+=pin.bytes)>1048576)fail('bounded complete ancestor source bytes required');
  const archive=archivePath(pin),packed=read(archive,pin.archiveBytes,pin.archiveSha256),raw=gunzipSync(packed,{maxOutputLength:pin.bytes});if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete selected native source differs');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),reparsed=transportConcreteSyntaxMeta(concrete.meta);if(reparsed.source!==source||hash(source)!==pin.sha256)fail('whole selected Rust CST round trip differs');
  inputs.push({pin,archive});sources.push(Object.freeze({path,source:reparsed.source,sha256:pin.sha256}));
 }
 function close(){try{read(manifest,MANIFEST_BYTES,MANIFEST_SHA256);for(const {pin,archive}of inputs)read(archive,pin.archiveBytes,pin.archiveSha256);}finally{guard();}}
 guard();try{
  const result=run(Object.freeze({profileSha256:MANIFEST_SHA256,sourceInputs:Object.freeze(current.sources.map(row=>Object.freeze(row))),sources:Object.freeze(sources),sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false}));if(result&&typeof result==='object'&&typeof result.then==='function')fail('ancestor source callback must finish synchronously');return result;
 }finally{close();inputs.length=0;}
}
