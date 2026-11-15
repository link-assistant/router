// Finite diagnostic only. Neither the compiler nor its source pins are changed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const originalURL=new URL('../../tools/translation/project.mjs',import.meta.url);
const corpus=process.argv[2];
assert.ok(corpus===undefined||corpus==='simple'||corpus==='actual-config');
const minimal=process.argv[3]==='--minimal-source-view';
assert.ok(process.argv[3]===undefined||minimal);assert.ok(process.argv.length<=4);
const outputURL=new URL('./project-closure-candidate.mjs',import.meta.url);
const originalOutputURL=new URL('./project-closure-original.mjs',import.meta.url);
const profileURL=new URL('../../tools/translation/source-profiles/project-facade-retention/',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifestBytes=readFileSync(new URL('manifest.json',profileURL));
assert.equal(sha(manifestBytes),'435847f54eceedb2506b10cac8cfab73e44a81f75b5044952792a920eaba3b3e');
const pin=JSON.parse(manifestBytes),packed=readFileSync(new URL(pin.archive,profileURL));
assert.equal(packed.length,pin.archiveBytes);assert.equal(sha(packed),pin.archiveSha256);
const raw=gunzipSync(packed,{maxOutputLength:262144});
assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);
const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw),ts=ownershipCompiler();
assert.equal(sha(source),pin.sha256);
const physical=readFileSync(originalURL,'utf8');
assert.ok([pin.sha256,'a15004541bc8f84e9f1ebc247f4e74bc30c51fc04dbbc57b983243a1d6afc407','4ad5fc9d1ead75c083d61026468b1577ecd0815338abaaa9a27cc10f0649d960'].includes(sha(physical)));
assert.equal(ts.version,'5.9.3');
const file=ts.createSourceFile('project.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const lowers=[],accessors=[],imports=[];
function walk(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='lowerDeclaration')lowers.push(node);
 if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='checkedSource')accessors.push(node);
 if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier);
 ts.forEachChild(node,walk);
}
walk(file);assert.equal(lowers.length,1);assert.equal(accessors.length,1);
const lower=lowers[0].initializer,accessor=accessors[0].initializer;
assert.ok(ts.isArrowFunction(lower)&&ts.isFunctionExpression(lower.body));
assert.ok(ts.isArrowFunction(accessor)&&accessor.parameters.length===0);
const helpers='\nfunction createProjectLowerer(target,entry,name){return '+lower.body.getText(file)+';}\n'
 +'function createProjectCheckedSource(checked,graph,entry){const facade={checkedSource:'+accessor.getText(file)+'};return facade.checkedSource;}\n';
const edits=[
 [lower.getStart(file),lower.end,'(entry,name)=>createProjectLowerer(target,entry,name)'],
 [accessor.getStart(file),accessor.end,minimal?'createProjectCheckedSource(checked,{modules:graph.modules},entry)':'createProjectCheckedSource(checked,graph,entry)'],
 ...imports.filter(node=>node.text.startsWith('.')).map(node=>[node.getStart(file),node.end,JSON.stringify(new URL(node.text,originalURL).href)]),
];
if(minimal){
 let production=source;
 for(const [start,end,text]of edits.slice(0,2).sort((a,b)=>b[0]-a[0]))production=production.slice(0,start)+text+production.slice(end);
 production+=helpers;assert.equal(sha(production),'4ad5fc9d1ead75c083d61026468b1577ecd0815338abaaa9a27cc10f0649d960');
 assert.equal(physical,production,'finite minimal candidate is the complete installed production source');
}
edits.sort((a,b)=>b[0]-a[0]);let candidate=source;
for(const [start,end,text]of edits)candidate=candidate.slice(0,start)+text+candidate.slice(end);
candidate+=helpers;
assert.equal(ts.createSourceFile('candidate.mjs',candidate,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
const created=[];
try{
 for(const [url,text]of [[originalOutputURL,source],[outputURL,candidate]]){writeFileSync(url,text,{flag:'wx'});created.push(url);}
 const originalResults=new Map();
 for(const name of ['original','candidate'])for(const mode of ['lower','facade']){
  const loader=['--experimental-loader',new URL('./project-closure-diagnostic-loader.mjs',import.meta.url).pathname];
  const result=spawnSync(new URL('./toolchain/node20/bin/node',import.meta.url).pathname,['--max-old-space-size=512','--expose-gc',...loader,new URL('./probe-project-closure-retention-child.mjs',import.meta.url).pathname,originalURL.href,mode,...(corpus==='actual-config'?[corpus]:[])],{encoding:'utf8',maxBuffer:1024*1024,env:{...process.env,ROUTER_PROJECT_CLOSURE_DIAGNOSTIC:name}});
  console.log(JSON.stringify({name,mode,minimal,typescriptVersion:ts.version,sourceSha256:sha(name==='original'?source:candidate),status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr}));
  assert.equal(result.status,0);
  const record=JSON.parse(result.stdout),stable=Object.fromEntries(Object.entries(record).filter(([key])=>!['alive','heapUsed'].includes(key)));
  if(name==='original')originalResults.set(mode,stable);else assert.deepEqual(stable,originalResults.get(mode));
 }
}finally{for(const url of created)unlinkSync(url);}
