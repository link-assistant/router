// Complete locked Rust crates -> original module graph -> existing checked
// semantic IR and JS/TS. A source stage never issues a formatting capability.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {compilationProfile} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {loadJsonMacroSourceProof,isJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from '../json-macro-features.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const profileBytes=readFileSync(new URL('./numeric-source-profile.json',import.meta.url));
if(hash(profileBytes)!=='61eca5f104f707b28422aaa2cd423831a05d0240ef47f7391781a0d16ecfedf1')throw new TypeError('Numeric source profile differs from its original source audit');
export const NUMERIC_SOURCE_STAGE_PROFILE=freeze(JSON.parse(profileBytes));
const sourceContexts=new WeakMap(),stages=new WeakMap();
const authority=()=>({formatterEquivalence:false,targetBuildConfiguration:false,unsafeMemory:false,traitCompleteness:false,runtimeParity:false,parseAdmission:false});
function ordinaryBytes(value,label) {
  if(!value||utilTypes.isProxy(value)||!Buffer.isBuffer(value)||value.length>2*1024*1024)throw new TypeError(label+' requires bounded ordinary archive bytes');return Buffer.from(value);
}
function archiveMembers(encoded,pin) {
  const bytes=ordinaryBytes(encoded,pin.name);if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)throw new TypeError('Locked '+pin.name+' archive differs');
  const tar=gunzipSync(bytes,{maxOutputLength:8*1024*1024}),members=new Map();let longName=null;
  const string=(b,start,length)=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b.subarray(start,start+length)).split('\0')[0];
  for(let at=0;at+512<=tar.length;) {
    const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
    const sizeText=string(header,124,12).trim(),checksumText=string(header,148,8).trim();
    if(!/^[0-7]+$/.test(sizeText)||!/^[0-7]+$/.test(checksumText))throw new TypeError('Original archive header has no checked octal size/checksum');
    const size=parseInt(sizeText,8),checksum=header.reduce((sum,byte,index)=>sum+(index>=148&&index<156?32:byte),0);
    if(size>2*1024*1024||at+512+size>tar.length||checksum!==parseInt(checksumText,8))throw new TypeError('Original archive exceeds its source/checksum bound');
    const body=tar.subarray(at+512,at+512+size),kind=string(header,156,1);let name=string(header,0,100),prefix=string(header,345,155);if(prefix)name=prefix+'/'+name;
    if(kind==='L'){if(longName||size>4096)throw new TypeError('Original archive long name is unproved');longName=string(body,0,size);}
    else {if(longName){name=longName;longName=null;}if(name.startsWith('/')||name.split('/').some(part=>part==='..'||part===''))throw new TypeError('Original archive path escapes its member scope');
      if(kind==='0'||kind===''){if(members.has(name))throw new TypeError('Original archive member is duplicated');members.set(name,Buffer.from(body));}
      else if(!['5','x','g'].includes(kind))throw new TypeError('Original archive member kind is unsupported');}
    at+=512+Math.ceil(size/512)*512;
  }
  if(longName||members.size!==pin.members.length)throw new TypeError('Original archive complete member inventory differs');
  const result=new Map();for(const member of pin.members){const raw=members.get(pin.name+'-'+pin.version+'/'+member.path);if(!raw||raw.length!==member.bytes||hash(raw)!==member.sha256)throw new TypeError('Original source member differs: '+member.path);result.set(member.path,{...member,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});}return result;
}
function methodEvidence(source,term,name,method) {
  const owners=sourceItems(source).filter(item=>item.term===term&&item.name===name);if(owners.length!==1)throw new TypeError('Original formatter trait owner is absent or ambiguous');
  const owner=owners[0],t=owner.tokens.filter(token=>token.type!=='comment'),selected=[];
  for(let at=0;at<t.length;at++)if(t[at].text==='fn'&&t[at+1]?.text===method){let open=at+2;while(open<t.length&&!['{',';'].includes(t[open].text))open++;if(t[open]?.text!=='{')throw new TypeError('Original formatter method has no default body');let depth=1,end=open+1;for(;end<t.length&&depth;end++){if(t[end].text==='{')depth++;if(t[end].text==='}')depth--;}if(depth)throw new TypeError('Original formatter method body is incomplete');const span={start:t[at].start,end:t[end-1].end};selected.push({owner:{term,name,span:{start:owner.start,end:owner.end}},method,span,sha256:hash(source.slice(span.start,span.end)),source:source.slice(span.start,span.end)});}
  if(selected.length!==1)throw new TypeError('Original formatter method selection is ambiguous');return selected[0];
}
export function captureNumericFormatterSources({manifest,lock,consumerArchive,formatterArchive}={}) {
  const p=NUMERIC_SOURCE_STAGE_PROFILE;
  if(typeof manifest!=='string'||typeof lock!=='string'||hash(manifest)!==p.manifestSha256||hash(lock)!==p.lockSha256)throw new TypeError('Numeric stage requires the exact original Cargo inputs');
  const dependencies=loadJsonMacroSourceProof({manifest,lock});if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Actual Cargo source proof is unavailable');
  const features=proveJsonMacroFeatures(dependencies);if(!isJsonMacroFeatureProof(features))throw new TypeError('Actual consumer feature proof is unavailable');
  const consumer=archiveMembers(consumerArchive,p.consumer),formatter=archiveMembers(formatterArchive,p.formatter),selection=methodEvidence(consumer.get(p.consumerCallPath.source).source,'trait',p.consumerCallPath.trait,p.consumerCallPath.method);
  // This records the exact written dependency edge; it does not interpret the
  // formatter implementation or confer authority from the body hash.
  const blocks=lock.split(/^\[\[package\]\]\s*$/m).slice(1),selected=name=>blocks.filter(block=>new RegExp('^name = "'+name+'"$','m').test(block));
  for(const pin of [p.consumer,p.formatter]){const rows=selected(pin.name);if(rows.length!==1||!rows[0].includes('version = "'+pin.version+'"')||!rows[0].includes('checksum = "'+pin.sha256+'"')||!rows[0].includes('source = "'+pin.source+'"'))throw new TypeError('Cargo formatter package owner differs');}
  if(!selected(p.consumer.name)[0].match(/^dependencies = \[[\s\S]*?^\]/m)?.[0].includes('"'+p.formatter.name+'"'))throw new TypeError('Cargo consumer does not select the formatter');
  const evidence=freeze({schema:'original-locked-numeric-source-inputs-v1',profileSha256:hash(profileBytes),manifestSha256:p.manifestSha256,lockSha256:p.lockSha256,packages:[p.consumer,p.formatter].map(({name,version,sha256,bytes,members})=>({name,version,archiveSha256:sha256,archiveBytes:bytes,members})),consumerMethod:selection,consumerFeatures:features,formatterAlgorithm:'Schubfach/yy-derived original Rust implementation; no target implementation substituted',buildScript:{...formatter.get('build.rs'),executionAvailable:false,configurationAuthority:false},...authority()});
  sourceContexts.set(evidence,{consumer,formatter});return evidence;
}
export function numericSourceInputsFromFiles({manifest,lock,consumerArchiveURL,formatterArchiveURL}={}) {
  const p=NUMERIC_SOURCE_STAGE_PROFILE;
  return captureNumericFormatterSources({manifest,lock,consumerArchive:readFileSync(consumerArchiveURL??new URL(p.consumer.archive,import.meta.url)),formatterArchive:readFileSync(formatterArchiveURL??new URL(p.formatter.archive,import.meta.url))});
}
function originalRows(graph,result) {
  const rows=[];for(const module of graph.modules)for(const item of module.allItems??[]){if(item.comment||item.term==='trivia')continue;const source=module.source.slice(item.start,item.end),span={start:item.start,end:item.end,unit:'utf16'},executables=result?.meta.executable.filter(entry=>entry.source===module.file&&entry.span.start>=item.start&&entry.span.end<=item.end)??[],refusals=result?.meta.refused.filter(entry=>entry.file===module.file&&entry.span?.start>=item.start&&entry.span.start<=item.end)??[];rows.push({sourcePath:module.file,module:[...module.path],name:item.name,term:item.term,span,sha256:hash(source),source,status:executables.length?'contains-checked-declarations':'carried',executables,refusals,originalWholeSourceSha256:hash(module.source)});}return rows;
}
function compileOriginalStage({entry,files,inputEvidence,candidateConfiguration}) {
  const profile=compilationProfile(candidateConfiguration),paths=[...files.keys()],readSource=path=>{if(!files.has(path))throw new TypeError('Numeric stage source is not in its complete original input');return files.get(path);};
  const options={entry,paths,readSource,compilationProfile:profile},graph=resolveModuleGraph(options);let result=null,failure=null;
  try{result=translateProject(options);parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));parseProgram(JSON.stringify(result.meta.targetSemanticProgram));}
  catch(error){failure={kind:error.kind??'source-stage',message:error.reason??error.message,span:error.span??null};}
  const output=freeze({schema:'checked-original-numeric-source-stages-v1',inputs:inputEvidence,configuration:{profile,classification:profile?'explicit candidate, not actual Cargo target/build proof':'unknown actual build configuration',authority:false},meta:result?.meta??null,originalRows:originalRows(graph,result),unvisitedSourceFiles:[...files].filter(([path])=>!graph.modules.some(module=>module.file===path)).map(([sourcePath,source])=>({sourcePath,source,sha256:hash(source),status:'carried-not-in-checked-module-graph',diagnostic:'Original archive file has no selected reachable module edge; no executable body or authority inferred'})),moduleDiagnostics:graph.diagnostics,translationFailure:failure,javascript:result?.javascript??null,typescript:result?.typescript??null,...authority()});
  stages.set(output,{fingerprint:hash(JSON.stringify(output))});return output;
}
// A generic source input is not a locked external-package certificate. It may
// exercise the shared primitive translator, without minting formatter proof.
export function compileOriginalRustSourceStages({entry,sources,candidateConfiguration=null}={}) {
  if(typeof entry!=='string'||!sources||utilTypes.isProxy(sources)||![Object.prototype,null].includes(Object.getPrototypeOf(sources))||Object.getOwnPropertySymbols(sources).length)throw new TypeError('Original Rust stage requires ordinary complete source inputs');
  const files=new Map();let total=0;
  for(const [path,property] of Object.entries(Object.getOwnPropertyDescriptors(sources))) {
    if(!('value' in property)||typeof property.value!=='string'||!property.enumerable||!path.endsWith('.rs')||path.includes('\\')||path.includes(':')||path.includes('\0')||path.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Original Rust source path/data is invalid');
    total+=Buffer.byteLength(property.value);if(files.size>=64||total>512*1024)throw new TypeError('Original Rust source-stage budget exceeded');files.set(path,property.value);
  }
  if(!files.has(entry))throw new TypeError('Original Rust stage entry is absent');
  return compileOriginalStage({entry,files,candidateConfiguration,inputEvidence:freeze({kind:'provided-complete-original-module-inputs',entry,sources:[...files].map(([path,source])=>({path,sha256:hash(source),bytes:Buffer.byteLength(source)})),lockedExternalPackage:false,...authority()})});
}
export function compileNumericSourceStages(context,{candidateConfiguration=null}={}) {
  const sources=sourceContexts.get(context);if(!sources)throw new TypeError('Numeric stages require private captured original inputs');
  const files=new Map([...sources.formatter].filter(([path])=>path.startsWith('src/')&&path.endsWith('.rs')).map(([path,input])=>[path,input.source]));
  return compileOriginalStage({entry:NUMERIC_SOURCE_STAGE_PROFILE.formatterEntry,files,inputEvidence:context,candidateConfiguration});
}
export function emitNumericSourceStage(stage) {
  const proof=stages.get(stage);if(!proof||proof.fingerprint!==hash(JSON.stringify(stage)))throw new TypeError('Numeric emission requires the private unmodified original stage');
  if(stage.translationFailure)throw new TypeError('Numeric source stage remains refused: '+stage.translationFailure.message);
  return freeze({meta:JSON.stringify(stage)+'\n',javascript:stage.javascript,typescript:stage.typescript,...authority()});
}
export function requireNumericFormatterAuthority() {throw new TypeError('Numeric source stages do not yet prove decimal candidate rounding, actual target/build cfg, table layout, unsafe byte emission or UTF8 boundary; finite f64 formatting remains refused');}
