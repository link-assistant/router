import {proposeWholeOwnerCanonicalTrial,assertWholeOwnerTrialInputs,wholeOwnerTrialFilePacket,decodeWholeOwnerTrialFilePacket} from './whole-owner-trial-support.mjs';
// Explicit isolated diagnostic only. Preparation never selects production or runs tests.
import {writeFileSync,lstatSync,readdirSync,mkdirSync,existsSync,realpathSync,chmodSync,constants,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareBuiltinCanonicalTable} from './prepare-builtin-canonical-table.mjs';
import {isCompilerSourceInputPath,COMPILER_SOURCE_INPUT_LIMITS} from './compiler-source-inputs.mjs';
import {isIsolatedCompilerSourcePath} from './prepare-isolated-project-compiler.mjs';
import {originalDeriveAdditionalSourceClosure} from './canonical-trial-source-closure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const CODEC='tools/translation/builtin-source-meta.mjs',CANDIDATE='tools/translation/builtin-source-meta-canonical-candidate.mjs';
const TEST='tools/translation/test/derive-bang-context.test.mjs';
const TEST_HASH='e3a53b40da1ec47965be2c21c063b4297f7394c00ffd827cd30715ee74756e0e';
const LIMIT=384*1024*1024,INPUT_LIMITS=COMPILER_SOURCE_INPUT_LIMITS,FRAME_LIMIT=Math.ceil(INPUT_LIMITS.fileBytes*8/3)+65536;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new TypeError('Canonical derive trial: '+message);};
const json=value=>JSON.stringify(value,null,2)+'\n';
function equal(actual,expected,message){if(JSON.stringify(actual)!==JSON.stringify(expected))fail(message);}
function inside(root,path){const part=relative(root,path);return part!==''&&!part.startsWith('../')&&!isAbsolute(part);}
function plain(path,directory=false){
 for(let current=resolve(path);;current=dirname(current)){const state=lstatSync(current);if(state.isSymbolicLink()||(current===resolve(path)?directory?!state.isDirectory():!state.isFile():!state.isDirectory()))fail('regular unlinked physical path required: '+path);if(dirname(current)===current)break;}
}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs&&a.mode===b.mode;}
function read(root,path,maximum=INPUT_LIMITS.fileBytes){
 const absolute=resolve(root,path);if(!inside(root,absolute))fail('source path escaped root');plain(absolute);const before=lstatSync(absolute);if(!Number.isSafeInteger(before.size)||before.size<0||before.size>maximum)fail('bounded file size exceeded before read: '+path);
 const fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);try{const opened=fstatSync(fd);if(!sameFile(before,opened)||!opened.isFile())fail('source changed before open');const bytes=Buffer.alloc(before.size);let offset=0;while(offset<bytes.length){const size=readSync(fd,bytes,offset,Math.min(65536,bytes.length-offset),offset);if(!size)fail('source became shorter');offset+=size;}if(readSync(fd,Buffer.alloc(1),0,1,offset)!==0||!sameFile(before,fstatSync(fd))||!sameFile(before,lstatSync(absolute)))fail('source changed during bounded read: '+path);plain(absolute);return bytes;}finally{closeSync(fd);}
}
function git(root,args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,GIT_DIR:undefined,GIT_WORK_TREE:undefined}});if(result.status!==0)fail('read-only Git input failed: '+args[0]);return result.stdout;}
export function isCanonicalTrialSourcePath(path){
 if(path.endsWith('.rs')||/(?:^|\/)Cargo\.(?:toml|lock)$/.test(path))return true;
 if(isCompilerSourceInputPath(path)||isIsolatedCompilerSourcePath(path))return true;
 if(['tools/translation/meta/','tools/translation/projects/','tools/translation/generated/','tools/translation/js-to-rust/generated/'].some(prefix=>path.startsWith(prefix)))return false;
 return path.startsWith('scripts/')||['LICENSE','AGENTS.md','CONTRIBUTING.md','js/package.json','js/package-lock.json'].includes(path)||path.startsWith('tools/translation/')&&path.split('/').slice(2).some(part=>part==='test'||part==='fixtures');
}
// The broad public inventory predicate above remains compatible. Actual trial
// discovery composes the complete compiler contracts with the ORIGINAL test's
// native dependency closure, rather than every unrelated test/fixture archive.
export function isCanonicalTrialBaseSourcePath(path){
 return path.endsWith('.rs')||/(?:^|\/)Cargo\.(?:toml|lock)$/.test(path)||isCompilerSourceInputPath(path)||isIsolatedCompilerSourcePath(path)||path.startsWith('scripts/')||['LICENSE','AGENTS.md','CONTRIBUTING.md','js/package.json','js/package-lock.json'].includes(path);
}
function collect(directory,root,paths,budget={directories:0}){if(++budget.directories>INPUT_LIMITS.files)fail('installed compiler directory count exceeded');plain(directory,true);for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isSymbolicLink())fail('linked installed compiler source');if(entry.isDirectory())collect(path,root,paths,budget);else if(entry.isFile()){paths.add(relative(root,path));if(paths.size>INPUT_LIMITS.files)fail('input file count exceeded before body reads');}else fail('nonregular installed compiler source');}}
export function preflightCanonicalTrialPaths(root,paths){
 if(paths.length===0||paths.length>INPUT_LIMITS.files||new Set(paths).size!==paths.length)fail('input file count exceeded before body reads');let totalBytes=0;
 const files=paths.map(path=>{const absolute=resolve(root,path);if(!inside(root,absolute))fail('source path escaped root');plain(absolute);const state=lstatSync(absolute);if(!Number.isSafeInteger(state.size)||state.size<0||state.size>INPUT_LIMITS.fileBytes||(totalBytes+=state.size)>INPUT_LIMITS.totalBytes)fail('input bytes exceeded before body reads: '+path);return {path,mode:state.mode&0o777,bytes:state.size};});
 return {files,totalBytes,limits:INPUT_LIMITS};
}
export function discoverCanonicalTrialInputs(root){
 root=resolve(root);plain(root,true);
 const head=git(root,['rev-parse','HEAD']).trim(),gitDirectory=realpathSync(git(root,['rev-parse','--absolute-git-dir']).trim());
 const listed=git(root,['ls-files','--cached','--others','--exclude-standard','-z','--','*.rs','Cargo.toml','Cargo.lock','**/Cargo.toml','**/Cargo.lock','js/package.json','js/package-lock.json','tools/translation','scripts','LICENSE','AGENTS.md','CONTRIBUTING.md']);
 const inventory=[...new Set(listed.split('\0').filter(Boolean))].sort();if(inventory.length>INPUT_LIMITS.files)fail('input inventory count exceeded before body reads');const paths=new Set(inventory.filter(isCanonicalTrialBaseSourcePath));if(paths.size>INPUT_LIMITS.files)fail('input file count exceeded before body reads');collect(join(root,'js/node_modules/typescript'),root,paths);
 // Census complete compiler inputs before native loading. Additional helper
 // modules get the same stat-only census before their first body allocation.
 preflightCanonicalTrialPaths(root,[...paths].sort());
 if(createRequire(join(root,'js/package.json'))('typescript')!==ownershipCompiler())fail('native closure must use this actual root installed compiler');
 const analyzed=new Set(paths),trackedRustPaths=git(root,['ls-files','-z','--','*.rs']).split('\0').filter(Boolean);
 const sourceClosure=originalDeriveAdditionalSourceClosure({ts:ownershipCompiler(),root,entry:TEST,inventory,retained:[...paths],trackedRustPaths,head,readSource:path=>{
  if(!analyzed.has(path)){analyzed.add(path);preflightCanonicalTrialPaths(root,[...analyzed].sort());}
  const bytes=read(root,path),source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('native closure source must be lossless UTF-8');return source;
 }});
 for(const path of sourceClosure.paths)paths.add(path);
 const omitted=inventory.filter(path=>!paths.has(path)).map(path=>({path,reason:'outside-complete-compiler-contracts-and-native-original-derive-input-closure',compilerSourceInput:isCompilerSourceInputPath(path),isolatedCompilerSourceInput:isIsolatedCompilerSourcePath(path),originalTestClosureInput:false,sourceAuthority:false}));
 const preflight=preflightCanonicalTrialPaths(root,[...paths].sort());
 const files=preflight.files.map(fact=>{const bytes=read(root,fact.path);if(bytes.length!==fact.bytes||(lstatSync(join(root,fact.path)).mode&0o777)!==fact.mode)fail('source changed since complete size census');return {...fact,sha256:hash(bytes)};});
 if(!files.some(row=>row.path===TEST)||!files.some(row=>row.path==='Cargo.toml')||!files.some(row=>row.path.endsWith('.rs')))fail('complete original Rust/Cargo/compiler vector required');
 const compiler=JSON.parse(read(root,'js/node_modules/typescript/package.json'));if(compiler.name!=='typescript'||compiler.version!=='5.9.3')fail('actual installed TypeScript 5.9.3 required');
 return {head,gitDirectory,typescriptVersion:compiler.version,inputLimits:preflight.limits,totalBytes:preflight.totalBytes,files,sourceClosure,omitted,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false};
}
export function canonicalTrialCases(ts,source){
 const file=ts.createSourceFile(TEST,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('whole original test grammar differs');const cases=[];
 for(const statement of file.statements){if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression)||!ts.isIdentifier(statement.expression.expression)||statement.expression.expression.text!=='test')continue;
  const call=statement.expression,[name,options]=call.arguments;if(!ts.isStringLiteral(name))fail('actual literal original case name required');let deadline={kind:'default-no-source-deadline'};
  if(ts.isObjectLiteralExpression(options)){if(options.properties.length!==1||!ts.isPropertyAssignment(options.properties[0])||options.properties[0].name.getText(file)!=='timeout'||!ts.isNumericLiteral(options.properties[0].initializer))fail('original timeout declaration differs');deadline={kind:'finite-source-deadline',milliseconds:Number(options.properties[0].initializer.text)};if(!Number.isFinite(deadline.milliseconds)||deadline.milliseconds<=0)fail('original finite timeout required');}
  else if(!ts.isArrowFunction(options)&&!ts.isFunctionExpression(options))fail('whole original callback required');
  const location=file.getLineAndCharacterOfPosition(call.getStart(file));cases.push({name:name.text,sourceCallSpan:{start:call.getStart(file),end:call.end},line:location.line+1,column:location.character+1,deadline});
 }
 return cases;
}
export function proposeCanonicalDeriveTrial({root=ROOT}={}){return proposeWholeOwnerCanonicalTrial({root});}
function writeNew(path,bytes,mode=0o600){mkdirSync(dirname(path),{recursive:true});plain(dirname(path),true);writeFileSync(path,bytes,{flag:'wx',mode});chmodSync(path,mode);}
export function canonicalTrialFilePacket(fact,original,trial,{overlays}={}){return wholeOwnerTrialFilePacket(fact,original,trial,{overlays});}
export function decodeCanonicalTrialFilePacket(packet,fact,{overlays}={}){return decodeWholeOwnerTrialFilePacket(packet,fact,{overlays});}
function frameRead(output,row){if(!Number.isSafeInteger(row.packetBytes)||row.packetBytes<0||row.packetBytes>FRAME_LIMIT)fail('complete frame byte bound differs');const bytes=read(output,row.frame,FRAME_LIMIT);if(bytes.length!==row.compressedBytes||hash(bytes)!==row.compressedSha256)fail('complete gzip frame changed');const packet=JSON.parse(gunzipSync(bytes,{maxOutputLength:row.packetBytes}));if(Buffer.byteLength(JSON.stringify(packet))!==row.packetBytes)fail('complete frame length differs');return packet;}
function safeOutput(root,output){output=resolve(output);if(inside(root,output)||inside(output,root)||output===root||existsSync(output))fail('fresh output outside original root required');plain(dirname(output),true);return output;}
export function prepareCanonicalDeriveTrial({root=ROOT,output}={}){
 root=resolve(root);if(!output)fail('fresh output directory required');output=safeOutput(root,output);
 const vector=discoverCanonicalTrialInputs(root),proposal=proposeCanonicalDeriveTrial({root});assertWholeOwnerTrialInputs(vector,proposal);equal(discoverCanonicalTrialInputs(root),vector,'original source vector changed during proposal');
 mkdirSync(output,{mode:0o700});const mirror=join(output,'repository'),frames=[];let storageBytes=0;mkdirSync(mirror,{mode:0o700});
 // One complete file packet is live at a time; no all-source/CST collection or verdict cache.
 for(const [index,fact]of vector.files.entries()){
  const bytes=read(root,fact.path);if(bytes.length!==fact.bytes||hash(bytes)!==fact.sha256)fail('fresh original file differs');
  const selected=proposal.overlays.find(row=>row.path===fact.path),trial=selected?Buffer.from(selected.candidate):bytes;
  const packet=canonicalTrialFilePacket(fact,bytes,trial,{overlays:proposal.overlays});
  const raw=Buffer.from(JSON.stringify(packet)),compressed=gzipSync(raw),frame='frames/'+String(index).padStart(6,'0')+'.json.gz';storageBytes+=compressed.length+trial.length;
  if(storageBytes>LIMIT)fail('384MiB mirror/evidence allocation exceeded');writeNew(join(output,frame),compressed);writeNew(join(mirror,fact.path),trial,fact.mode);
  const descriptor={path:fact.path,frame,packetBytes:raw.length,compressedBytes:compressed.length,compressedSha256:hash(compressed),original:{bytes:bytes.length,sha256:hash(bytes)},trial:{bytes:trial.length,sha256:hash(trial)}};equal(frameRead(output,descriptor),packet,'independent complete gzip packet readback differs');frames.push(descriptor);
 }
 const proposalBytes=gzipSync(Buffer.from(JSON.stringify(proposal)));storageBytes+=proposalBytes.length;if(storageBytes>LIMIT)fail('task evidence allocation exceeded');writeNew(join(output,'proposal.json.gz'),proposalBytes);
 const env={GIT_DIR:vector.gitDirectory,GIT_WORK_TREE:mirror,ROUTER_NATIVE_TS_SOURCE_ROOT:mirror};
 if(process.env.ROUTER_TRANSLATION_TSC){if(realpathSync(process.env.ROUTER_TRANSLATION_TSC)!==realpathSync(join(root,'js/node_modules/typescript/bin/tsc')))fail('unmirrored explicit compiler override');env.ROUTER_TRANSLATION_TSC=join(mirror,'js/node_modules/typescript/bin/tsc');}
 const manifest={schema:"isolated-original-derive-whole-owner-canonical-trial-v1",root,output,mirror,vector,frames,proposal:{path:'proposal.json.gz',bytes:proposalBytes.length,sha256:hash(proposalBytes)},test:proposal.test,environment:env,storageBytes,storageLimitBytes:LIMIT,commands:{node:[process.execPath,join(mirror,'scripts/run-node-tests.mjs'),'--outer-timeout-ms=240000','--test-concurrency=1',TEST],bun:['bun','test','./'+TEST]},nodeOuterTimeoutMs:240000,bunOuterTimeoutMs:240000,originalCaseLimitsUnchanged:true,productionSelected:false,trialSelected:true,runtimeExecuted:false,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false};
 // Account for the complete manifest too; its own byte count is not used as an admission proof.
 if(storageBytes+Buffer.byteLength(json(manifest))>LIMIT)fail('complete evidence allocation exceeded');writeNew(join(output,'manifest.json'),json(manifest));verifyCanonicalDeriveTrial({output});return manifest;
}
export function verifyCanonicalDeriveTrial({output}={}){
 output=resolve(output);const manifest=JSON.parse(read(output,'manifest.json'));if(manifest.schema!=="isolated-original-derive-whole-owner-canonical-trial-v1"||manifest.output!==output||manifest.mirror!==join(output,'repository'))fail('complete isolated manifest identity differs');
 if(manifest.productionSelected!==false||manifest.trialSelected!==true||manifest.runtimeExecuted!==false||manifest.performanceQualified!==false||manifest.originalCaseLimitsUnchanged!==true||manifest.sourceAuthority!==false||manifest.runtimeAuthority!==false||manifest.nodeOuterTimeoutMs!==240000||manifest.bunOuterTimeoutMs!==240000||manifest.storageLimitBytes!==LIMIT)fail('explicit trial-only selection and original bounds differ');
 equal(discoverCanonicalTrialInputs(manifest.root),manifest.vector,'fresh complete original source universe changed');
 equal(manifest.commands,{node:[process.execPath,join(manifest.mirror,'scripts/run-node-tests.mjs'),'--outer-timeout-ms=240000','--test-concurrency=1',TEST],bun:['bun','test','./'+TEST]},'complete declared original trial commands differ');
 const expectedEnvironment={GIT_DIR:manifest.vector.gitDirectory,GIT_WORK_TREE:manifest.mirror,ROUTER_NATIVE_TS_SOURCE_ROOT:manifest.mirror};if(Object.hasOwn(manifest.environment,'ROUTER_TRANSLATION_TSC'))expectedEnvironment.ROUTER_TRANSLATION_TSC=join(manifest.mirror,'js/node_modules/typescript/bin/tsc');equal(manifest.environment,expectedEnvironment,'exact mirror Git/compiler binding differs');
 const proposalBytes=read(output,manifest.proposal.path);if(proposalBytes.length!==manifest.proposal.bytes||hash(proposalBytes)!==manifest.proposal.sha256)fail('complete source proposal changed');const proposal=JSON.parse(gunzipSync(proposalBytes,{maxOutputLength:64*1024*1024}));
 // Re-run the actual source producer: metadata never substitutes for fresh source proof.
 equal(proposeCanonicalDeriveTrial({root:manifest.root}),proposal,'fresh actual complete source producer equation changed');
 assertWholeOwnerTrialInputs(manifest.vector,proposal);equal(manifest.test,proposal.test,'complete original test metadata differs');if(manifest.frames.length!==manifest.vector.files.length)fail('complete input frame count differs');let substitutions=0;
 for(const [index,row]of manifest.frames.entries()){
  const fact=manifest.vector.files[index];if(row.path!==fact.path)fail('complete frame order/path differs');const packet=frameRead(output,row),{original,trial}=decodeCanonicalTrialFilePacket(packet,fact,{overlays:proposal.overlays});
  equal({path:packet.path,mode:packet.original.mode,bytes:packet.original.bytes,sha256:packet.original.sha256},fact,'full original frame fact differs');
  for(const [bytes,pin]of [[original,row.original],[trial,row.trial]])if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)fail('full frame source bytes differ');
  if(!original.equals(read(manifest.root,row.path))||!trial.equals(read(manifest.mirror,row.path))||(lstatSync(join(manifest.mirror,row.path)).mode&0o777)!==fact.mode)fail('physical original or trial source changed');
  const selected=proposal.overlays.find(item=>item.path===row.path),expected=selected?Buffer.from(selected.candidate):original;if(!expected.equals(trial))fail('unproposed physical trial delta');if(!original.equals(trial))substitutions++;
 }
 if(substitutions!==proposal.overlays.length||!read(manifest.mirror,TEST).equals(Buffer.from(proposal.test.source)))fail('exactly the complete codec and creator substitutions and unchanged whole test required');
 equal(discoverCanonicalTrialInputs(manifest.root),manifest.vector,'original source changed across final boundary');return {manifest,proposal};
}
export function joinCanonicalTrialCases(expected,observed){
 if(!Array.isArray(observed)||observed.length!==expected.length)fail('all original twelve completion records required');const seen=new Set(),records=[];
 for(const row of observed){const source=expected.find(item=>item.name===row.name);if(!source||seen.has(row.name)||row.skipped||row.todo||!Number.isFinite(row.durationMs)||row.durationMs<0)fail('unknown duplicate skipped or incomplete original case');seen.add(row.name);const durationBreach=source.deadline.kind==='finite-source-deadline'&&row.durationMs>source.deadline.milliseconds;records.push({...row,originalSourceCase:source,durationBreach});}
 return {records,passed:records.every(row=>row.passed&&!row.durationBreach),defaultDeadlinesInferred:false,originalCaseLimitsChanged:false};
}
export function joinCanonicalTrialNode({output,receiptDirectory}={}){
 const {manifest}=verifyCanonicalDeriveTrial({output}),terminal=JSON.parse(read(receiptDirectory,'terminal.json')),auditBytes=read(receiptDirectory,'case-deadlines.json',128*1024*1024),audit=JSON.parse(auditBytes),command=JSON.parse(read(receiptDirectory,'command.json'));
 equal(command.command.slice(1),['--test','--test-concurrency=1','--test-reporter='+join(manifest.mirror,'scripts/node-case-deadline-reporter.mjs'),TEST],'actual complete original Node command differs');equal(terminal.command,command.command,'complete actual Node terminal command differs');equal(terminal.allSelectedWholeFiles,[TEST],'complete original Node whole file selection differs');
 if(command.root!==manifest.mirror||command.outerTimeoutMs!==manifest.nodeOuterTimeoutMs||terminal.root!==manifest.mirror||terminal.allCaseLimitsUnchanged!==true||terminal.audit?.sha256!==hash(auditBytes)||audit.root!==manifest.mirror||audit.originalCaseLimitsChanged!==false||audit.defaultDeadlinesInferred!==false)fail('complete Node source/deadline receipt differs');
 const source=audit.sourceRecords.find(row=>row.path===join(manifest.mirror,TEST));if(!source||source.source!==manifest.test.source||source.sha256!==manifest.test.sha256)fail('complete original Node test source join differs');
 const observed=audit.records.filter(row=>row.sourceCallSpan).map(row=>{const original=manifest.test.cases.find(item=>item.name===row.name);if(!original||row.file!==join(manifest.mirror,TEST))fail('observed Node original case path differs');equal(row.sourceCallSpan,original.sourceCallSpan,'actual Node source call span differs');equal(row.deadline,original.deadline,'actual Node original source deadline differs');return {name:row.name,durationMs:row.durationMs,passed:row.type==='test:pass',skipped:row.skip,todo:row.todo,actualNodeRecord:row};});
 const joined=joinCanonicalTrialCases(manifest.test.cases,observed);for(const log of terminal.logs){const bytes=read(receiptDirectory,log.path,256*1024*1024);if(bytes.length!==log.bytes||hash(bytes)!==log.sha256)fail('full retained Node raw stream differs');}
 const final=verifyCanonicalDeriveTrial({output});return {schema:"isolated-original-derive-whole-owner-canonical-node-join-v1",...joined,terminal,audit,command,sourceVectorBefore:manifest.vector,sourceVectorAfter:final.manifest.vector,trialSourceFrames:manifest.frames,passed:joined.passed&&terminal.exitCode===0&&audit.passed===true&&audit.durationBreaches===0,performanceQualified:joined.passed&&terminal.exitCode===0&&audit.passed===true&&audit.durationBreaches===0,productionSelected:false,runtimeParity:false,rustExecuted:false};
}
export function canonicalTrialBunCompletions(streams){
 const observed=[];for(const raw of streams)for(const line of raw.toString('utf8').replace(/\u001b\[[0-9;]*m/g,'').split('\n')){const match=/^\((pass|fail|skip|todo)\) (.*?)(?: \[([0-9]+(?:\.[0-9]+)?)ms\])?\s*$/.exec(line);if(match)observed.push({name:match[2],durationMs:match[3]===undefined?NaN:Number(match[3]),passed:match[1]==='pass',skipped:match[1]==='skip',todo:match[1]==='todo',actualBunLine:line});}return observed;
}
export function joinCanonicalTrialBun({output,requestPath}={}){
 const {manifest}=verifyCanonicalDeriveTrial({output}),absolute=path=>read(dirname(resolve(path)),resolve(path).slice(dirname(resolve(path)).length+1),256*1024*1024),request=JSON.parse(absolute(requestPath));equal(request.command,manifest.commands.bun,'actual complete original Bun command differs');if(request.root!==manifest.mirror||request.remainingMs!==manifest.bunOuterTimeoutMs)fail('original Bun enclosing request differs');
 const resource=JSON.parse(absolute(request.resourceFile)),stdout=absolute(request.stdout),stderr=absolute(request.stderr);equal(resource.command,request.command,'actual waited Bun command differs');if(!resource.bunReportedVersion?.rawHeader||![stdout,stderr].some(raw=>raw.includes(resource.bunReportedVersion.rawHeader))||resource.processGroupCleanupSupported!==true||!Number.isFinite(resource.elapsedSeconds)||resource.elapsedSeconds<0)fail('complete actual Bun engine/cleanup/resource receipt required');
 // Bun reports names/durations, not source positions. Join only exact unique original names;
 // retain that distinction, every full raw byte, and the actual waited resource receipt.
 const observed=canonicalTrialBunCompletions([stdout,stderr]),joined=joinCanonicalTrialCases(manifest.test.cases,observed),final=verifyCanonicalDeriveTrial({output});return {schema:"isolated-original-derive-whole-owner-canonical-bun-join-v1",...joined,request,resource,sourceVectorBefore:manifest.vector,sourceVectorAfter:final.manifest.vector,trialSourceFrames:manifest.frames,raw:[{path:request.stdout,bytes:stdout.length,sha256:hash(stdout),base64:stdout.toString('base64')},{path:request.stderr,bytes:stderr.length,sha256:hash(stderr),base64:stderr.toString('base64')}],sourcePositionsReportedByBun:false,sourceJoin:'exact unique actual reported name to unchanged native-AST original call',passed:joined.passed&&resource.exitCode===0&&!resource.timedOut&&!resource.interrupted,performanceQualified:joined.passed&&resource.exitCode===0&&!resource.timedOut&&!resource.interrupted,productionSelected:false,runtimeParity:false,rustExecuted:false};
}
export async function runCanonicalDeriveTrialNode({output}={}){
 const {manifest}=verifyCanonicalDeriveTrial({output}),saved={};
 writeNew(join(output,'node-start.json'),json({command:manifest.commands.node,environment:manifest.environment,sourceVectorBefore:manifest.vector,originalCaseLimitsUnchanged:true}));
 const {runAuditedNodeTests}=await import(pathToFileURL(join(manifest.mirror,'scripts/run-node-tests.mjs')).href);
 for(const [key,value]of Object.entries(manifest.environment)){saved[key]=process.env[key];process.env[key]=value;}
 try{await runAuditedNodeTests({root:manifest.mirror,files:[TEST],flags:['--test-concurrency=1'],outputDirectory:join(output,'node'),outerTimeoutMs:manifest.nodeOuterTimeoutMs});}
 finally{for(const key of Object.keys(saved))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
 const joined=joinCanonicalTrialNode({output,receiptDirectory:join(output,'node')});writeNew(join(output,'node-join.json'),json(joined));return joined;
}
async function main(){
 const [mode,...args]=process.argv.slice(2),options={};if(args.length%2)fail('complete flag/value pairs required');for(let i=0;i<args.length;i+=2){const key={'--root':'root','--output':'output','--receipt-directory':'receiptDirectory','--request':'requestPath'}[args[i]];if(!key||options[key])fail('unknown or duplicate option');options[key]=args[i+1];}
 let result;if(mode==='--emit')result=proposeCanonicalDeriveTrial(options);else if(mode==='--prepare')result=prepareCanonicalDeriveTrial(options);else if(mode==='--check')result=verifyCanonicalDeriveTrial(options).manifest;else if(mode==='--run-node')result=await runCanonicalDeriveTrialNode(options);else if(mode==='--join-node')result=joinCanonicalTrialNode(options);else if(mode==='--join-bun')result=joinCanonicalTrialBun(options);else fail('use --emit|--prepare|--check|--run-node|--join-node|--join-bun');console.log(JSON.stringify(result));if(result.passed===false)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
