import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {proposeCoreAdoptionCorpus,CORE_ADOPTION_PACKET_LIMITS} from '../propose-core-adoption-corpus.mjs';
import {proposeCoreFormattingCorpus} from '../propose-core-formatting-corpus.mjs';
import {proposeCorePrimitivesCorpus} from '../migrate-core-primitives.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const sourceRoot=new URL('../../../',import.meta.url),script=fileURLToPath(new URL('../propose-core-adoption-corpus.mjs',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){if(!process.env.ROUTER_CORE_ADOPTION_VECTOR_DIR)return;fs.mkdirSync(process.env.ROUTER_CORE_ADOPTION_VECTOR_DIR,{recursive:true});fs.writeFileSync(join(process.env.ROUTER_CORE_ADOPTION_VECTOR_DIR,name+'.json.gz'),gzipSync(JSON.stringify(value)));}
function attempt(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message,stack:error.stack}};}}
const body='pub fn label(value:&str)->String{format!("value={}",value)}\n';
function fixture(extra={'src/sample.rs':body},root='pub mod translation_core;\nmod sample;\n'){
  const parent=fs.mkdtempSync(join(tmpdir(),'router-core-packets-')),directory=join(parent,'original');fs.mkdirSync(directory);
  const files={'src/lib.rs':root,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,...extra};
  for(const [path,source]of Object.entries(files)){fs.mkdirSync(dirname(join(directory,path)),{recursive:true});fs.writeFileSync(join(directory,path),source);}
  return {parent,root:directory,files,output:join(parent,'proposal'),close(){fs.rmSync(parent,{recursive:true,force:true});}};
}
function bytes(root){const rows=[];function scan(path){const s=fs.lstatSync(join(root,path));if(s.isDirectory()){for(const name of fs.readdirSync(join(root,path)).sort())scan(path?path+'/'+name:name);}else rows.push({path,base64:fs.readFileSync(join(root,path)).toString('base64')});}scan('');return rows;}
function readProposal(output){
  const index=JSON.parse(fs.readFileSync(join(output,'index.json'),'utf8'));
  for(const row of index.packets){const raw=fs.readFileSync(join(output,row.path));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.ok(row.bytes<=CORE_ADOPTION_PACKET_LIMITS.packetBytes);}
  assert.equal(index.packetBytes,index.packets.reduce((sum,row)=>sum+row.bytes,0));
  const read=row=>JSON.parse(fs.readFileSync(join(output,row.path),'utf8'));
  const assemble=(descriptor,replacements)=>{const metadata=read(descriptor);return Object.fromEntries(metadata.keys.map(key=>[key,Object.hasOwn(replacements,key)?replacements[key]:metadata.values[key]]));};
  const formatting=assemble(index.formatting.metadata,{inputs:index.formatting.inputs.map(read),rows:index.formatting.rows.map(read)}),p=index.primitives;
  const primitives=assemble(p.metadata,{before:Object.fromEntries(p.before.map(row=>{const r=read(row);return [r.path,r.source];})),after:Object.fromEntries(p.after.map(row=>{const r=read(row);return [r.path,r.source];})),inputs:p.inputs.map(read),proposals:p.proposals.map(read),moduleGraph:{modules:p.moduleGraph.modules.map(read),edges:read(p.moduleGraph.edges),diagnostics:read(p.moduleGraph.diagnostics),concreteSyntaxMeta:p.moduleGraph.concreteSyntaxMeta.map(read)}});
  return {index,formatting,primitives};
}
function expected(input){const files=Object.fromEntries(Object.keys(input).sort().map(path=>[path,input[path]]));const formatting=proposeCoreFormattingCorpus({files,compilationProfile:PRODUCTION_PROFILE}),after={...files};for(const row of formatting.rows)if(row.status==='proposed')after[row.path]=row.proposal.after.source;return {formatting,primitives:proposeCorePrimitivesCorpus({files:after,compilationProfile:PRODUCTION_PROFILE})};}
function undo(proposal){let source=proposal.after.source;for(let at=proposal.mapping.length-1;at>=0;at--){const row=proposal.mapping[at];if(row.kind==='substitution'){assert.equal(source.slice(...row.after),row.replacement);source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);}}assert.equal(source,proposal.before.source);}

test('complete packets reconstruct both unchanged APIs exactly and never alter original sources',{timeout:60000},()=>{
  const f=fixture();try{const before=bytes(f.root),direct=expected(f.files),result=proposeCoreAdoptionCorpus({root:f.root,output:f.output}),actual=readProposal(f.output);retain('01-complete',{inputs:f.files,before,result,actual,outputs:bytes(f.output)});
    assert.equal(JSON.stringify(actual.formatting),JSON.stringify(direct.formatting));assert.equal(JSON.stringify(actual.primitives),JSON.stringify(direct.primitives));assert.deepEqual(bytes(f.root),before);assert.equal(result.semanticAdmission,false);assert.equal(actual.index.complete,true);assert.equal(actual.index.semanticAdmission,false);assert.ok(actual.index.changes.length>0);
    for(const pass of Object.values(actual.index.phaseTrace))assert.deepEqual(pass.map(row=>row.phase),['language','repository']);
    for(const row of actual.index.changes){assert.equal(fs.readFileSync(join(f.output,row.source.path),'utf8'),actual.primitives.after[row.path]);assert.equal(hash(f.files[row.path]),row.beforeSha256);assert.equal(hash(actual.primitives.after[row.path]),row.afterSha256);}
  }finally{f.close();}
});
test('BOM CRLF Unicode comments complete CST and both inverse mappings survive packet boundaries',{timeout:60000},()=>{
  const source='\uFEFF// format!("comment") Ω😀\r\npub fn label(value:&str)->String{format!("Ω{}😀",value)}\r\n',f=fixture({'src/sample.rs':source});
  try{proposeCoreAdoptionCorpus({root:f.root,output:f.output});const actual=readProposal(f.output);retain('02-complete',{source,actual});
    const row=actual.formatting.rows.find(row=>row.path==='src/sample.rs');assert.equal(row.status,'proposed');undo(row.proposal);assert.equal(transportConcreteSyntaxMeta(row.proposal.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.proposal.after.meta).source,row.proposal.after.source);
    for(const p of actual.primitives.proposals){undo(p);assert.equal(transportConcreteSyntaxMeta(p.before.meta).source,p.before.source);assert.equal(transportConcreteSyntaxMeta(p.after.meta).source,p.after.source);}
    assert.ok(actual.primitives.after['src/sample.rs'].startsWith('\uFEFF// format!("comment") Ω😀\r\n'));assert.ok(actual.primitives.after['src/sample.rs'].endsWith('\r\n'));
  }finally{f.close();}
});
test('actual complete production files retain graph skip and full source evidence without filtering',{timeout:60000},()=>{
  const originals=Object.fromEntries(['src/api_error.rs','src/emergency_auth.rs'].map(path=>[path,fs.readFileSync(new URL(path,sourceRoot),'utf8')]));
  const f=fixture(originals,'pub mod translation_core;\nmod api_error;\nmod emergency_auth;\n');
  try{const direct=expected(f.files);proposeCoreAdoptionCorpus({root:f.root,output:f.output});const actual=readProposal(f.output);retain('03-full-production',{originals,actual});assert.equal(JSON.stringify(actual.formatting),JSON.stringify(direct.formatting));assert.equal(JSON.stringify(actual.primitives),JSON.stringify(direct.primitives));
    for(const [path,source]of Object.entries(originals)){assert.equal(actual.formatting.inputs.find(row=>row.path===path).source,source);assert.ok(actual.primitives.moduleGraph.modules.some(row=>row.file===path));}
    assert.ok(actual.primitives.moduleGraph.concreteSyntaxMeta.length>=Object.keys(f.files).length);assert.equal(actual.index.summary.sourceFiles,Object.keys(f.files).length);
  }finally{f.close();}
});
test('real source Hash mutation before publication refuses without a completed proposal',{timeout:60000},()=>{
  const f=fixture(),native=Hash.prototype.update;let calls=0,mutated=false,result;
  try{Hash.prototype.update=function(value,...args){calls++;if(!mutated&&value===body){mutated=true;fs.writeFileSync(join(f.root,'src/sample.rs'),body+'// changed by actual hash observer\n');}return Reflect.apply(native,this,[value,...args]);};result=attempt(()=>proposeCoreAdoptionCorpus({root:f.root,output:f.output}));}
  finally{Hash.prototype.update=native;}
  try{const evidence={calls,mutated,result,partial:fs.existsSync(f.output)?bytes(f.output):[]};retain('04-source-hash-mutation',evidence);assert.ok(calls>0);assert.equal(mutated,true);assert.ok(result.error);assert.equal(fs.existsSync(join(f.output,'index.json')),false);assert.match(result.error.message,/source.*changed|identity|corpus/i);
    fs.writeFileSync(join(f.root,'src/sample.rs'),body);const restored=proposeCoreAdoptionCorpus({root:f.root,output:join(f.parent,'restored')});assert.equal(restored.complete,true);
  }finally{f.close();}
});
test('late source census mutation retains bounded incomplete packets and never an installable index',{timeout:60000},async()=>{
  const f=fixture(),native=Hash.prototype.update;let calls=0,mutated=false,result;
  try{Hash.prototype.update=function(value,...args){calls++;if(!mutated&&fs.existsSync(join(f.output,'formatting/metadata.json'))){mutated=true;fs.writeFileSync(join(f.root,'src/late.rs'),'pub fn late()->u8{1}\n');}return Reflect.apply(native,this,[value,...args]);};result=attempt(()=>proposeCoreAdoptionCorpus({root:f.root,output:f.output}));}
  finally{Hash.prototype.update=native;}
  try{const files=bytes(f.output),failure=JSON.parse(fs.readFileSync(join(f.output,'failure.json'),'utf8'));retain('05-late-census',{calls,mutated,result,files,failure});assert.ok(calls>0);assert.equal(mutated,true);assert.ok(result.error);assert.equal(fs.existsSync(join(f.output,'index.json')),false);assert.equal(failure.complete,false);assert.ok(failure.packetCount>0);assert.ok(failure.packetBytes<CORE_ADOPTION_PACKET_LIMITS.outputBytes);assert.ok(files.some(row=>row.path==='formatting/metadata.json'));
    fs.unlinkSync(join(f.root,'src/late.rs'));assert.equal(proposeCoreAdoptionCorpus({root:f.root,output:join(f.parent,'restored')}).complete,true);
    // Full source-paired writer failure: actual pending bytes are written by
    // the original producer, then only the pre-rename point throws. This does
    // not rely on Bun updating a named fs import after module initialization.
    const original=fs.readFileSync(script,'utf8'),point="writeFileSync(join(target.path,'index.pending.json'),text,{flag:'wx'});";
    assert.equal(original.split(point).length,2);const injected=original.replace(point,point+"throw new Error('test-only pending-index failure');");
    const relocations=[];const copied=injected.replace(/from '(\.[^']+)'/gu,(whole,specifier)=>{const replacement='from '+JSON.stringify(new URL(specifier,pathToFileURL(script)).href);relocations.push({whole,replacement});return replacement;});
    let reversed=copied;for(let at=relocations.length-1;at>=0;at--){const row=relocations[at];assert.equal(reversed.split(row.replacement).length,2);reversed=reversed.replace(row.replacement,row.whole);}assert.equal(reversed,injected);assert.equal(injected.replace(point+"throw new Error('test-only pending-index failure');",point),original);
    const copy=join(f.parent,'paired-producer.mjs');fs.writeFileSync(copy,copied);assert.equal(fs.readFileSync(copy,'utf8'),copied);
    const output=join(f.parent,'pending-failure'),paired=await import(pathToFileURL(copy).href),failed=attempt(()=>paired.proposeCoreAdoptionCorpus({root:f.root,output}));
    const pending=fs.readFileSync(join(output,'index.pending.json'),'utf8'),receipt=JSON.parse(fs.readFileSync(join(output,'failure.json'),'utf8'));retain('05-pending-index-failure',{original,point,injected,copied,relocations,failed,pending,receipt,files:bytes(output)});
    assert.match(failed.error.message,/pending-index failure/);assert.equal(JSON.parse(pending).complete,true);assert.equal(fs.existsSync(join(output,'index.json')),false);assert.equal(receipt.complete,false);assert.ok(receipt.packetCount>0);

  }finally{f.close();}
});
test('unknown accessor proxy and linked output inputs refuse before writing source proposals',{timeout:60000},()=>{
  const f=fixture();let calls=0;
  try{const accessor={output:f.output};Object.defineProperty(accessor,'root',{get(){calls++;return f.root;},enumerable:true});const proxy=new Proxy({root:f.root,output:f.output},{ownKeys(){calls++;return [];}});
    for(const input of [accessor,proxy,{root:f.root,output:f.output,skip:true},{root:f.root,output:null}])assert.throws(()=>proposeCoreAdoptionCorpus(input));assert.equal(calls,0);assert.equal(fs.existsSync(f.output),false);
    const before=fs.readdirSync(f.root).sort();fs.symlinkSync(f.root,join(f.parent,'linked-source'),'dir');const nested=join(f.parent,'linked-source','new-proposal');assert.throws(()=>proposeCoreAdoptionCorpus({root:f.root,output:nested}),/overlap/);assert.equal(fs.existsSync(join(f.root,'new-proposal')),false);assert.deepEqual(fs.readdirSync(f.root).sort(),before);
    fs.symlinkSync(join(f.root,'src/sample.rs'),join(f.root,'src/link.rs'),'file');assert.throws(()=>proposeCoreAdoptionCorpus({root:f.root,output:f.output}),/links/);assert.equal(fs.existsSync(f.output),false);retain('06-input-refusals',{calls,before,after:fs.readdirSync(f.root).sort()});
  }finally{f.close();}
});
test('source file count bounds reject before any output and successful packets obey all new limits',{timeout:60000},()=>{
  const f=fixture();try{for(let at=0;at<CORE_ADOPTION_PACKET_LIMITS.files;at++)fs.writeFileSync(join(f.root,'src','extra_'+at+'.rs'),'// retained extra\n');const result=attempt(()=>proposeCoreAdoptionCorpus({root:f.root,output:f.output}));retain('07-file-count-bound',{result,files:fs.readdirSync(join(f.root,'src')).length});assert.ok(result.error);assert.match(result.error.message,/count/);assert.equal(fs.existsSync(f.output),false);
    for(let at=0;at<CORE_ADOPTION_PACKET_LIMITS.files;at++)fs.unlinkSync(join(f.root,'src','extra_'+at+'.rs'));
    const receipt=proposeCoreAdoptionCorpus({root:f.root,output:f.output}),actual=readProposal(f.output);assert.ok(receipt.packetBytes<=CORE_ADOPTION_PACKET_LIMITS.outputBytes);assert.ok(actual.index.packets.length<=CORE_ADOPTION_PACKET_LIMITS.packets);assert.deepEqual(actual.index.limits,CORE_ADOPTION_PACKET_LIMITS);
  }finally{f.close();}
});
test('actual same-engine CLI produces checked JS and strict TS from the complete adopted source map',{timeout:60000},async()=>{
  const f=fixture();try{const child=spawnSync(process.execPath,[script,'--root',f.root,'--output',f.output],{encoding:'utf8',timeout:20000,maxBuffer:1024*1024});retain('08-cli-process',{source:f.files,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{message:child.error.message}});assert.equal(child.status,0);assert.equal(child.signal,null);assert.equal(JSON.parse(child.stdout).complete,true);
    const actual=readProposal(f.output),files=actual.primitives.after,result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});retain('08-complete-checked-targets',{actual,result});assert.ok(result.meta.executable.some(row=>row.name==='sample.label'));assert.equal(result.meta.runtimeParity,false);
    const declaration=result.executableDeclarations.find(row=>row.name==='label');assert.ok(declaration);const lowered=declaration.lower();const target=lowered.emitted.mappings.find(row=>row.source==='label').target;const emitted={...result,javascript:result.javascript+`\nexport {${target} as adoptedLabel};`,typescript:result.typescript+`\nexport {${target} as adoptedLabel};`};
    await verifyTypedTargets(emitted,(_api,_result,module)=>{assert.equal(module.adoptedLabel('Ω😀'),'value=Ω😀');assert.equal(module.adoptedLabel(''),'value=');},{childTimeoutMs:20000});
  }finally{f.close();}
});
