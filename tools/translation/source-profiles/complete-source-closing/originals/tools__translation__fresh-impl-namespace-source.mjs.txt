// Fresh source DATA only. No source inventory, hash or verdict crosses calls.
// The private source-plan constructor supplies its own fixed default root.
// SOURCE ONLY; all behavior, performance and receiving qualification UNRUN.
import {openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalSourceCryptoIntrinsicsUnchanged as originalDeriveHelperCryptoUnchanged} from './derive-footprints.mjs';
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
