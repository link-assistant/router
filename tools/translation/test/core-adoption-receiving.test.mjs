// Complete source/data receiving; copied metadata never supplies private proofs.
import testCase from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {exportTranslatorBundle} from '../export-bundle.mjs';
import {proposeCoreAdoptionSequence} from '../propose-core-adoption-corpus.mjs';
import {openCoreAdoptionGzipPackets} from '../core-adoption-packet-storage.mjs';
import {applyReviewedCoreAdoption,recoverReviewedCoreAdoption} from '../apply-reviewed-core-adoption.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),wire=value=>JSON.stringify(value)+'\n';
const runtimeFiles=['scripts/propose-core-adoption.py','scripts/review-core-adoption.py','tools/translation/core_adoption_review.py','tools/translation/core_adoption_json_readers_review.py'];
const core=['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','Cargo.toml','Cargo.lock'];
const original='\uFEFF// retained Ω😀\r\npub mod translation_core;\r\npub fn picked(value:&crate::translation_core::Json)->crate::translation_core::Maybe<&crate::translation_core::Str>{value.get("name").and_then(crate::translation_core::Json::as_str)}\r\n';
let vectors=[];
const keep=(kind,value)=>{vectors.push({kind,value});
return value;
};
const test=(name,run)=>testCase(name,{timeout:60000},async()=>{vectors=[];
try{await run();
}finally{const output=process.env.ROUTER_CORE_RECEIVING_VECTOR_DIR;
if(output){fs.mkdirSync(output,{recursive:true});
writeJsonTextGzip(join(output,Buffer.from(name).toString('hex')+'.json.gz'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value));
}}});
function write(path,value){fs.mkdirSync(dirname(path),{recursive:true});
fs.writeFileSync(path,typeof value==='string'||Buffer.isBuffer(value)?value:wire(value));
}
function git(root,...args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false',...args],{encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});
}
function commit(root){git(root,'init','-q');
git(root,'add','.');
git(root,'-c','commit.gpgsign=false','-c','user.name=Receiving fixture','-c','user.email=receiving@example.invalid','commit','-qm','complete receiving source');
return git(root,'rev-parse','HEAD').trim();
}
function python(code,input={}){const source=`import sys,json\nsys.dont_write_bytecode=True\nsys.path.insert(0,${JSON.stringify(join(ROOT,'tools/translation'))})\npayload=json.load(sys.stdin)\n`+code;
const child=spawnSync('python3',['-B','-c',source],{input:wire(input),encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});
keep('complete-python-child',{source,input,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message}});
assert.equal(child.signal,null);
assert.equal(child.status,0,child.stderr);
return JSON.parse(child.stdout);
}
function compiler(root){const actual=process.env.ROUTER_TRANSLATION_TSC?dirname(dirname(resolve(process.env.ROUTER_TRANSLATION_TSC))):join(ROOT,'packages/javascript/node_modules/typescript');
assert.equal(JSON.parse(fs.readFileSync(join(actual,'package.json'))).version,'5.9.3');
fs.cpSync(actual,join(root,'packages/javascript/node_modules/typescript'),{recursive:true,dereference:true});
write(join(root,'.gitignore'),'packages/javascript/node_modules/\n');
}
function archive(label,root){const output=process.env.ROUTER_CORE_RECEIVING_VECTOR_DIR;
if(!output)return;
const rows=[];
function visit(directory,relative=''){for(const name of fs.readdirSync(directory).sort()){const path=join(directory,name),local=relative+name,s=fs.lstatSync(path);
assert.equal(s.isSymbolicLink(),false);
if(s.isDirectory())visit(path,local+'/');
else{assert.equal(s.isFile(),true);
const raw=fs.readFileSync(path),stored=label+'-'+hash(local)+'.bin.gz';
fs.mkdirSync(output,{recursive:true});
const bytes=gzipSync(raw);
fs.writeFileSync(join(output,stored),bytes,{flag:'wx'});
assert.deepEqual(gunzipSync(fs.readFileSync(join(output,stored))),raw);
rows.push({path:local,mode:s.mode,bytes:raw.length,sha256:hash(raw),stored,storedBytes:bytes.length,storedSha256:hash(bytes)});
}}}visit(root);
keep('complete-fixture-archive',{label,rows});
}
async function home(run){const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-core-receiving-')));
try{return await run(directory);
}finally{archive('fixture-'+hash(directory),directory);
fs.rmSync(directory,{recursive:true,force:true});
}}
function smallSources(root){for(const path of core)write(join(root,path),fs.readFileSync(join(ROOT,path)));
write(join(root,'src/lib.rs'),original);
}
async function packetFixture(directory){const root=join(directory,'source'),output=join(directory,'proposal');
fs.mkdirSync(root);
smallSources(root);
assert.equal((await proposeCoreAdoptionSequence({root,output},'json-readers','gzip')).complete,true);
return {root,output};
}
function allPackets(output){const storage=openCoreAdoptionGzipPackets(output);
keep('complete-logical-packets',{index:storage.index,rows:storage.index.packets.map(ref=>({ref,bytes:storage.read(ref).toString('base64')}))});
return storage;
}
const storageCheck=`from pathlib import Path\nfrom core_adoption_review import parse,GzipTransport\np=Path(payload['path']);raw=(p/'index.json').read_bytes();index=parse(raw)\ntry:\n store=GzipTransport(p,index,raw)\n for row in index['packets']:store.read(row)\n store.finish();result={'ok':True,'packets':len(index['packets'])}\nexcept Exception as error:result={'ok':False,'name':type(error).__name__,'message':str(error)}\nprint(json.dumps(result))\n`;
function patchStored(output,ref,transform){const side=join(output,'packet-storage.json'),before=fs.readFileSync(side),manifest=JSON.parse(before),row=manifest.packets.find(row=>row.path===ref.path),path=join(output,row.file),raw=fs.readFileSync(path),after=transform(raw);
fs.writeFileSync(path,after);
Object.assign(row,{bytes:after.length,sha256:hash(after)});
write(side,manifest);
return ()=>{fs.writeFileSync(path,raw);
fs.writeFileSync(side,before);
};
}

function patchRaw(output,ref,transform){
 const indexPath=join(output,'index.json'),sidePath=join(output,'packet-storage.json'),indexBefore=fs.readFileSync(indexPath),sideBefore=fs.readFileSync(sidePath),index=JSON.parse(indexBefore),manifest=JSON.parse(sideBefore),stored=manifest.packets.find(row=>row.path===ref.path),path=join(output,stored.file),packedBefore=fs.readFileSync(path),raw=transform(gunzipSync(packedBefore)),packed=gzipSync(raw),delta=raw.length-ref.bytes;
 function visit(value){if(!value||typeof value!=='object')return;
if(!Array.isArray(value)&&value.path===ref.path&&value.kind===ref.kind&&Object.keys(value).length===4){value.bytes=raw.length;
value.sha256=hash(raw);
}else for(const child of Object.values(value))visit(child);
}
 visit(index);
index.packetBytes+=delta;
Object.assign(stored,{rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed)});
const indexRaw=Buffer.from(wire(index));
manifest.index={path:'index.json',bytes:indexRaw.length,sha256:hash(indexRaw)};
fs.writeFileSync(path,packed);
fs.writeFileSync(indexPath,indexRaw);
write(sidePath,manifest);
 return ()=>{fs.writeFileSync(path,packedBefore);
fs.writeFileSync(indexPath,indexBefore);
fs.writeFileSync(sidePath,sideBefore);
};
}

test('fresh capture includes all tracked Rust Cargo script and installed TypeScript bytes',()=>home(async directory=>{
 const root=join(directory,'source'),run=join(directory,'capture');
fs.mkdirSync(root);
fs.mkdirSync(run);
write(join(root,'src/lib.rs'),'pub fn answer()->bool{true}\n');
write(join(root,'tests/owned-witness.rs'),'// outside-src Rust input\n');
write(join(root,'Cargo.toml'),'[package]\nname="capture"\nversion="0.0.0"\n');
write(join(root,'Cargo.lock'),'version = 4\n');
write(join(root,'scripts/source.mjs'),'// script\n');
write(join(root,'tools/translation/source.py'),'# Python\n');
compiler(root);
const head=commit(root);
 const actual=python(`import importlib.util\nfrom pathlib import Path\nspec=importlib.util.spec_from_file_location('capture',${JSON.stringify(join(ROOT,'scripts/propose-core-adoption.py'))});module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)\nmodule.ROOT=Path(payload['root']);module.OUT=Path(payload['run']);module.HEAD=payload['head'];module.ACTIVE_TEMP=None\nbefore,snapshots,rust=module.capture_prechild_sources();module.SOURCE_FREEZE=module.source_freeze(before,snapshots,rust);module.require_current_capture(before,snapshots,rust)\nafter,other,again=module.capture();module.require_current_capture(after,other,again)\nassert before==after and snapshots==other and rust==again\nprint(json.dumps({'before':before,'snapshots':snapshots,'rust':rust,'sourceFreeze':module.SOURCE_FREEZE,'same':True}))\n`,{root,run,head});
 assert.equal(actual.same,true);
assert.equal(actual.snapshots.filter(row=>row.path.startsWith('packages/javascript/node_modules/typescript/')).length,132);
assert.ok(actual.rust.some(row=>row.path==='tests/owned-witness.rs'));
assert.equal(actual.sourceFreeze.census.physicalSrcRust,1);
assert.equal(actual.sourceFreeze.census.allTrackedRustCargo,4);
for(const row of actual.snapshots){const raw=fs.readFileSync(join(run,row.snapshot));
assert.equal(raw.length,row.bytes);
assert.equal(hash(raw),row.sha256);
}assert.equal(git(root,'status','--porcelain'),'');
keep('complete-capture',actual);
}));

test('full gzip transport accepts exact decoded bytes and an additional empty member',()=>home(async directory=>{
 const {output}=await packetFixture(directory),storage=allPackets(output),first=storage.index.packets[0];
assert.equal(python(storageCheck,{path:output}).ok,true);
const expected=storage.read(first),restore=patchStored(output,first,raw=>Buffer.concat([raw,gzipSync(Buffer.alloc(0))]));
try{assert.equal(python(storageCheck,{path:output}).ok,true);
}finally{restore();
}assert.deepEqual(openCoreAdoptionGzipPackets(output).read(first),expected);
}));

test('stored CRC raw bytes strict UTF8 and complete physical inventory corruption refuse',()=>home(async directory=>{
 const {output}=await packetFixture(directory),storage=allPackets(output),first=storage.index.packets[0];
const restore=patchStored(output,first,raw=>{const changed=Buffer.from(raw);
changed[changed.length-1]^=1;
return changed;
});
try{const result=python(storageCheck,{path:output});
assert.equal(result.ok,false);
assert.match(result.message,/gzip|CRC|length|size|ISIZE/iu);
}finally{restore();
}
 write(join(output,'unexpected.bin'),'complete extra member');
try{assert.equal(python(storageCheck,{path:output}).ok,false);
}finally{fs.unlinkSync(join(output,'unexpected.bin'));
}
 const path=join(output,'packet-storage.json'),before=fs.readFileSync(path),manifest=JSON.parse(before);
manifest.packets[0].rawSha256='0'.repeat(64);
write(path,manifest);
try{assert.equal(python(storageCheck,{path:output}).ok,false);
}finally{fs.writeFileSync(path,before);
}
 const invalid=patchRaw(output,first,raw=>{const changed=Buffer.from(raw);
changed[0]=255;
return changed;
});
try{const result=python(storageCheck,{path:output});
assert.equal(result.ok,false);
assert.match(result.message,/utf-?8|decode/iu);
}finally{invalid();
}assert.equal(python(storageCheck,{path:output}).ok,true);
}));

test('complete CST Unicode partitions and both language repository stages stay independently checked',()=>home(async directory=>{
 const {output}=await packetFixture(directory),storage=allPackets(output),row=JSON.parse(storage.read(storage.index.stages[0].packets.proposals[0]));
assert.ok(row.selections.length>0);
assert.equal(row.before.source,original);
 const result=python(`import copy\nfrom core_adoption_review import check_cst\nfrom core_adoption_json_readers_review import reader_proposal\nrow=payload['row'];ids=['canonical-json-readers:expand-option-and-then-on-shared-root','router-core:bind-generated-json-reader-paths']\na,b,count,doc=reader_proposal(row,row['before']['source'],ids,payload['language']);failures=[]\nfor kind in ['source','parent','token']:\n changed=copy.deepcopy(doc)\n if kind=='source':changed['source']+='!'\n elif kind=='parent':next(node for node in changed['nodes']if node[0]=='group')[-1]=len(changed['nodes'])+1\n else:next(node for node in changed['nodes']if node[0]=='token')[2]+=1\n try:check_cst(changed,a);failures.append(False)\n except Exception:failures.append(True)\nchanged=copy.deepcopy(row);changed['stages'][0]['trace'][0]['rules'][0]['id']='unknown-rule'\ntry:reader_proposal(changed,a,ids,payload['language']);failures.append(False)\nexcept Exception:failures.append(True)\nprint(json.dumps({'before':a,'after':b,'count':count,'failures':failures,'originalDoc':doc}))\n`,{row,language:row.stages[0].edits});
assert.equal(result.before,original);
assert.equal(result.count,1);
assert.deepEqual(result.failures,[true,true,true,true]);
assert.ok(result.after.includes('crate::translation_core::Maybe::Some'));
keep('complete-two-stage-check',result);
}));

test('foreign dirty and unsupported controller selections fail without a source proposal',()=>home(async directory=>{
 const root=join(directory,'source');
write(join(root,'scripts/propose-core-adoption.py'),fs.readFileSync(join(ROOT,'scripts/propose-core-adoption.py')));
write(join(root,'src/lib.rs'),'pub fn answer()->bool{true}\n');
const head=commit(root);
 const invoke=(script,args)=>{const child=spawnSync('python3',['-B',script,...args],{encoding:'utf8',timeout:20000,maxBuffer:1024**2});
keep('complete-controller-refusal',{script,args,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr});
assert.equal(child.signal,null);
assert.notEqual(child.status,0);
return child;
};
 const foreign=invoke(join(ROOT,'scripts/propose-core-adoption.py'),['--root',root,'--expected-head',head,'--output',join(directory,'foreign'),'--sequence','json-readers']);
assert.match(foreign.stderr,/captured checked-in/);
assert.equal(fs.existsSync(join(directory,'foreign')),false);
 const unsupported=invoke(join(root,'scripts/propose-core-adoption.py'),['--root',root,'--expected-head',head,'--output',join(directory,'unsupported'),'--sequence','arbitrary']);
assert.match(unsupported.stderr,/invalid choice/);
assert.equal(fs.existsSync(join(directory,'unsupported')),false);
 write(join(root,'src/lib.rs'),'pub fn answer()->bool{false}\n');
const dirty=join(directory,'dirty');
invoke(join(root,'scripts/propose-core-adoption.py'),['--root',root,'--expected-head',head,'--output',dirty,'--sequence','json-readers']);
const receipt=JSON.parse(fs.readFileSync(join(dirty,'receipt.json')))[0];
assert.equal(receipt.inputsUnchanged,false);
assert.equal(receipt.exitCode,null);
assert.match(receipt.resourceReason,/HEAD\/clean guard/);
assert.equal(fs.existsSync(join(dirty,'migration-proposal/index.json')),false);
keep('complete-failed-receipt',receipt);
}));

test('retained ancestor and nested attribute source witnesses never confer semantic authority',()=>{
 const source='#[cfg_attr(feature="x", cfg_attr(feature="y", derive(Clone)), serde(rename="z"))]\nstruct Owner;',item=sourceItems(source).find(item=>item.term==='struct');
assert.ok(item);
 const result=python(`from core_adoption_json_readers_review import retained_problem_source\nitem=payload['item'];module={'sourceUnits':len(payload['source'].encode('utf-16-le'))//2};index={(item['start'],item['end']):[(module,item)]};outcomes=[]\nfor reason in ['unresolved attribute producer cfg_attr','unresolved attribute producer derive','unresolved attribute producer serde']:\n retained_problem_source({'span':[item['start'],item['end']],'reason':reason},index);outcomes.append(True)\nfor problem in [{'span':[item['start'],item['end']],'reason':'unknown reason'},{'span':[0,1],'reason':'unresolved attribute producer derive'},{'span':[item['start'],item['end']],'reason':'unresolved attribute producer derive','permit':True},{'span':[True,item['end']],'reason':'unresolved attribute producer derive'}]:\n try:retained_problem_source(problem,index);outcomes.append(False)\n except Exception:outcomes.append(True)\nprint(json.dumps({'outcomes':outcomes,'source':payload['source'],'semanticAdmission':False}))\n`,{source,item});
assert.deepEqual(result.outcomes,[true,true,true,true,true,true,true]);
assert.equal(result.semanticAdmission,false);
keep('complete-ancestor-witness-controls',result);
});

test('shared accounting observes sparse logical bytes directories pending writes and external temporary data',()=>home(async directory=>{
 const run=join(directory,'run'),temporary=join(directory,'temporary');
fs.mkdirSync(run);
fs.mkdirSync(temporary);
write(join(run,'pending/index.pending.json'),'partial');
write(join(temporary,'raw.bin'),'raw temporary bytes');
 const result=python(`import importlib.util\nfrom pathlib import Path\nspec=importlib.util.spec_from_file_location('controller',${JSON.stringify(join(ROOT,'scripts/propose-core-adoption.py'))});module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)\nmodule.OUT=Path(payload['run']);module.ACTIVE_TEMP=Path(payload['temporary']);before=module.budget();path=module.ACTIVE_TEMP/'large-sparse.bin'\nwith path.open('wb')as stream:stream.truncate(384*1024**2)\ntry:module.budget();refused=False\nexcept Exception as error:refused='384MiB'in str(error)\npath.unlink();after=module.budget()\nprint(json.dumps({'before':before,'after':after,'refused':refused}))\n`,{run,temporary});
assert.equal(result.refused,true);
assert.ok(result.before.output.entriesAttempted>=3);
assert.ok(result.before.externalTemporary.logicalBytes>=Buffer.byteLength('raw temporary bytes'));
assert.ok(result.after.freeBytes>=2*1024**3);
keep('complete-budget-observations',result);
}));

test('actual checked-in workflow fully reviews strict targets and explicitly applies and recovers its selected bytes',()=>home(async directory=>{
 const root=join(directory,'source'),run=join(directory,'run'),exported=exportTranslatorBundle({sourceRoot:ROOT,output:root});
keep('complete-committed-compiler-export',exported.manifest);
 for(const path of runtimeFiles)write(join(root,path),fs.readFileSync(join(ROOT,path)));
write(join(root,'tools/translation/fixtures/real-source-provenance.json'),fs.readFileSync(join(ROOT,'tools/translation/fixtures/real-source-provenance.json')));
smallSources(root);
write(join(root,'tests/owned-witness.rs'),'// complete guard outside src\n');
compiler(root);
const head=commit(root);
 const command=(script,args,expected=0)=>{const child=spawnSync('python3',['-B',join(root,script),...args],{encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});
keep('complete-real-workflow-child',{script,args,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error&&{name:child.error.name,message:child.error.message}});
assert.equal(child.signal,null);
assert.equal(child.status,expected,child.stderr);
return JSON.parse(child.stdout);
};
 const produced=command('scripts/propose-core-adoption.py',['--root',root,'--expected-head',head,'--output',run,'--sequence','json-readers']);
assert.equal(produced.inputsUnchanged,true);
assert.equal(produced.capSeconds,900);
assert.equal(produced.aggregateRssCapBytes,3*1024**3);
 const reviewed=command('scripts/review-core-adoption.py',['--root',root,'--expected-head',head,'--run',run,'--review-directory','review-v1','--review-monitor-directory','review-monitor-v1']);
assert.equal(reviewed.reviewerQualified,true);
assert.equal(reviewed.capSeconds,180);
assert.equal(reviewed.aggregateRssCapBytes,1024**3);
 const reportRaw=fs.readFileSync(join(run,'review-v1/review.json')),planRaw=fs.readFileSync(join(run,'review-v1/installation-plan.json')),report=JSON.parse(reportRaw),plan=JSON.parse(planRaw),indexRaw=fs.readFileSync(join(run,'migration-proposal/index.json'));
keep('complete-independent-review',{report,plan});
assert.equal(report.semanticAdmission,false);
assert.equal(report.privateIssuerReexecution,false);
assert.equal(report.uniqueSelectedCompleteFunctions,1);
assert.equal(plan.files.length,1);
assert.equal(report.allTrackedRustCargoGuards,8);
assert.equal(report.installedTypeScriptFiles,132);
assert.equal(git(root,'status','--porcelain'),'');
 const storage=allPackets(join(run,'migration-proposal'));
assert.deepEqual(storage.index.stages[0].trace.map(row=>row.id),['core-adoption:prepare-json-readers-corpus-stream','core-adoption:json-readers-stream-complete-packets']);
 // Retain the real old-stream-contract refusal before restoring exact bytes.
 const sidePath=join(run,'migration-proposal/packet-storage.json'),sideRaw=fs.readFileSync(sidePath),changedIndex=JSON.parse(indexRaw),side=JSON.parse(sideRaw);
 changedIndex.stages[0].trace=[{phase:'language',id:'core-adoption:complete-json-readers-corpus'},{phase:'repository',id:'core-adoption:json-readers-complete-packets'}];
const changedBytes=Buffer.from(wire(changedIndex));
side.index={path:'index.json',bytes:changedBytes.length,sha256:hash(changedBytes)};
fs.writeFileSync(join(run,'migration-proposal/index.json'),changedBytes);
write(sidePath,side);
 try{const refused=command('scripts/review-core-adoption.py',['--root',root,'--expected-head',head,'--run',run,'--review-directory','old-trace-review','--review-monitor-directory','old-trace-monitor'],1);
assert.equal(refused.reviewerQualified,false);
assert.match(fs.readFileSync(join(run,'old-trace-monitor/stderr.raw.log'),'utf8'),/fixed rule trace/);
assert.equal(fs.existsSync(join(run,'old-trace-review')),false);
}
 finally{fs.writeFileSync(join(run,'migration-proposal/index.json'),indexRaw);
fs.writeFileSync(sidePath,sideRaw);
}
 const freshStorage=openCoreAdoptionGzipPackets(join(run,'migration-proposal'));
 const files=Object.fromEntries(freshStorage.index.inputs.map(ref=>{const row=JSON.parse(freshStorage.read(ref));
return [row.path,row.source];
}));
for(const change of freshStorage.index.changes)files[change.path]=freshStorage.read(change.source).toString();
 const dependencyInputs={manifest:fs.readFileSync(join(root,'Cargo.toml'),'utf8'),lock:fs.readFileSync(join(root,'Cargo.lock'),'utf8')};
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:{flags:{test:false}},cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs)});
keep('complete-independent-semantic-result',result);
assert.ok(result.meta.executable.some(row=>row.name==='picked'));
const declaration=result.executableDeclarations.find(row=>row.name==='picked');
assert.ok(declaration);
const target=declaration.lower().emitted.mappings.find(row=>row.source==='picked').target;
const emitted={...result,javascript:result.javascript+`\nexport {${target} as reviewedReader};`,typescript:result.typescript+`\nexport {${target} as reviewedReader};`};
 await verifyTypedTargets(emitted,(_api,_result,module)=>{const parsed=serde_json_from_str('{"name":"Ω😀"}');
assert.equal(parsed.$,'Ok');
assert.deepEqual(module.reviewedReader(parsed.field0),Object.freeze({$:'Some',field0:'Ω😀'}));
assert.deepEqual(module.reviewedReader(serde_json_from_str('{}').field0),Object.freeze({$:'None'}));
},{childTimeoutMs:20000});
 const options={root,run,output:join(directory,'application'),head,reviewDirectory:'review-v1',reviewMonitorDirectory:'review-monitor-v1',reviewSha256:hash(reportRaw),planSha256:hash(planRaw),indexSha256:hash(indexRaw)},application=await applyReviewedCoreAdoption(options);
keep('actual-explicit-fixture-application',application);
assert.equal(application.sourceInstalled,true);
assert.equal(application.changedFiles,1);
assert.equal(fs.readFileSync(join(root,'src/lib.rs'),'utf8'),files['src/lib.rs']);
const state=fs.readFileSync(join(options.output,'application-state.json'));
 const recovery=await recoverReviewedCoreAdoption({application:options.output,output:join(directory,'recovery'),stateSha256:hash(state)});
keep('actual-explicit-fixture-recovery',recovery);
assert.equal(recovery.complete,true);
assert.equal(fs.readFileSync(join(root,'src/lib.rs'),'utf8'),original);
assert.equal(git(root,'status','--porcelain'),'');
}));
