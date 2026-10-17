// Historical generated-method integrity runs with its exact compiler graph.
// Current metadata never receives this path or a validation exemption.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {isDeepStrictEqual,types} from 'node:util';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const compilerCommit='3653dcfb8f49ac2d85239cadcd3d8e2233f2e57d';
const witnessCommit='688bf9b9a1257a1dc58c758b50b6906ecc4eee63';
const reviewerPath='scripts/review-translation-draft.mjs';
const registeredCompilerMapSha='bdd3883e2711ac3a3f1cd5f24fff46c4c1f4fd99c81a3ed41fa4226f8f3b7204';
const reviewerSha='e977e0dddc27b97edbe79444770be1e60df80264935e4fb9cbc99e8afe7d091a';
const roots=['tools/translation/meta','tools/translation/projects','packages/javascript/generated/rust-draft','packages/typescript/generated/rust-draft','packages/javascript/generated/rust-project','packages/typescript/generated/rust-project'];
const MAX_FILE=64*1024*1024,MAX_TOTAL=256*1024*1024,MAX_GRAPH=16*1024*1024,MAX_ROWS=720,TIMEOUT=120000;
const fail=message=>{throw new Error('Historical translation review: '+message);};
function relative(name){if(typeof name!=='string'||!name||name.includes('\\')||/[\x00-\x1f]/u.test(name)||path.isAbsolute(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))fail('escaping or malformed path');return name;}
function git(root,args,input){const result=spawnSync('git',args,{cwd:root,input,timeout:30000,maxBuffer:MAX_TOTAL});if(result.status!==0)fail(result.error?.message??result.stderr.toString());return result.stdout;}
function readBlob(root,commit,name){relative(name);const bytes=git(root,['show',commit+':'+name]);if(bytes.length>MAX_FILE)fail('file byte limit');return bytes;}
const parse=bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
function tree(root,commit,names){return git(root,['ls-tree','-r','-z',commit,'--',...names]).toString().split('\0').filter(Boolean).map(line=>{const match=/^(\d+) (\w+) ([a-f0-9]{40})\t(.+)$/u.exec(line);if(!match||match[2]!=='blob'||!['100644','100755'].includes(match[1]))fail('linked or foreign Git input');return {path:relative(match[4]),mode:match[1],blob:match[3]};});}
function batch(root,commit,rows){
  const frames=git(root,['cat-file','--batch'],rows.map(row=>commit+':'+row.path+'\n').join(''));let at=0;
  const records=rows.map(row=>{const end=frames.indexOf(10,at),header=/^([a-f0-9]{40}) blob (\d+)$/u.exec(frames.subarray(at,end).toString());if(!header)fail('missing Git input');const size=Number(header[2]);if(!Number.isSafeInteger(size)||size>MAX_FILE||frames[end+1+size]!==10)fail('malformed Git frame');const bytes=frames.subarray(end+1,end+1+size);at=end+2+size;return {...row,blob:header[1],bytes,sha256:hash(bytes)};});if(at!==frames.length)fail('unconsumed Git frames');return records;
}
const loader=`import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from 'node:url';import {createHash}from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),pins=__IMMUTABLE_PINS__,issued=new Set(),records=[];
const core=path.join(root,'tools/translation/extensions/core.mjs');
function own(url){if(url.startsWith('node:'))return;if(issued.has(url))return;if(!url.startsWith('file:'))throw Error('foreign historical module URL '+url.slice(0,96));const file=fileURLToPath(url),name=path.relative(root,file);if(!Object.hasOwn(pins,name)||path.isAbsolute(name)||name.startsWith('..'))throw Error('foreign historical module');let current=root;for(const part of name.split(path.sep)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('linked historical module');}const bytes=fs.readFileSync(file),pin=pins[name];if(bytes.length!==pin.bytes||createHash('sha256').update(bytes).digest('hex')!==pin.sha256)throw Error('changed historical module');}
export async function resolve(specifier,context,next){
 if(specifier.startsWith('data:')){
  if(!context.parentURL?.startsWith('file:')||fileURLToPath(context.parentURL)!==core)throw Error('foreign or nested historical data module');own(context.parentURL);
  const prefix='data:text/javascript;base64,';if(!specifier.startsWith(prefix))throw Error('foreign historical data format');const bytes=Buffer.from(specifier.slice(prefix.length),'base64');if(bytes.length>1048576||bytes.toString('base64')!==specifier.slice(prefix.length))throw Error('malformed historical core module');
  if(!issued.has(specifier)){if(issued.size>=3)throw Error('extra historical core module');issued.add(specifier);records.push({parent:'tools/translation/extensions/core.mjs',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),urlSha256:createHash('sha256').update(specifier).digest('hex')});fs.writeFileSync(path.join(root,'virtual-modules.json'),JSON.stringify(records),{mode:0o600});}
 }
 const result=await next(specifier,context);own(result.url);return result;
}
export async function load(url,context,next){
 own(url);const result=await next(url,context);if(url.startsWith('node:'))return result;
 const virtual=issued.has(url),name=virtual?null:path.relative(root,fileURLToPath(url)),expected=virtual?Buffer.from(url.slice('data:text/javascript;base64,'.length),'base64'):null;
 const pin=virtual?{bytes:expected.length,sha256:createHash('sha256').update(expected).digest('hex')}:pins[name];
 if(result.source===null||result.source===undefined)throw Error('unverified historical module source');const bytes=Buffer.from(result.source);
 if(bytes.length!==pin.bytes||createHash('sha256').update(bytes).digest('hex')!==pin.sha256||result.format!==(name?.endsWith('.json')?'json':'module'))throw Error('changed historical loaded bytes or format');return result;
}`;
const runner=`import fs from 'node:fs';import {reviewGeneratedMethods}from './scripts/review-translation-draft.mjs';import {loadDeriveDependencyProof}from './tools/translation/derive-dependencies.mjs';
const input=JSON.parse(fs.readFileSync(0,'utf8')),sources=new Map(input.sources),dependencies=loadDeriveDependencyProof({manifest:sources.get('Cargo.toml'),lock:sources.get('Cargo.lock')});
const reviewed=reviewGeneratedMethods(input.meta,input.row,{readSource:name=>{if(!sources.has(name))throw Error('missing historical original source');return sources.get(name);},dependencies});
process.stdout.write(JSON.stringify({reviewed,node:process.version,semanticAuthority:false,runtimeParity:false}));`;
function plainData(value){if(value===null||['string','number','boolean'].includes(typeof value))return;if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail('foreign project metadata');for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!('value'in descriptor))fail('project metadata accessor');plainData(descriptor.value);}}
function snapshot(directory,pins){const expected=new Set(pins.map(pin=>pin.path));expected.add('virtual-modules.json');const walk=name=>{for(const entry of fs.readdirSync(path.join(directory,name),{withFileTypes:true})){const child=name?name+'/'+entry.name:entry.name;if(entry.isSymbolicLink())fail('linked temporary graph');if(entry.isDirectory())walk(child);else if(!entry.isFile()||!expected.has(child))fail('foreign temporary graph file');}};walk('');for(const pin of pins){let current=directory;for(const part of pin.path.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())fail('linked temporary graph');}const actual=fs.readFileSync(current);if(actual.length!==pin.bytes||hash(actual)!==pin.sha256)fail('temporary compiler graph changed');}}

/** A registered immutable recipe, or null when the baseline uses another graph. */
export function createHistoricalTranslationReview({root,baselineSha,inventoryPath='parity/rust-source-inventory.json',readSource}={}){
  if(typeof root!=='string'||fs.lstatSync(root).isSymbolicLink()||!fs.statSync(root).isDirectory())fail('linked or invalid repository root');
  if(!/^[a-f0-9]{40}$/u.test(baselineSha??''))fail('immutable full baseline SHA required');
  relative(inventoryPath);if(inventoryPath!=='parity/rust-source-inventory.json')return null;
  if(git(root,['rev-parse','--show-toplevel']).toString().trim()!==fs.realpathSync(root))fail('foreign repository root');
  const baselineBytes=readBlob(root,baselineSha,inventoryPath),baseline=parse(baselineBytes);
  if(!baseline.implementationHashes||typeof baseline.implementationHashes!=='object'||Array.isArray(baseline.implementationHashes))fail('malformed baseline compiler declaration');
  const compilerMap=Object.entries(baseline.implementationHashes).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  if(hash(JSON.stringify(compilerMap))!==registeredCompilerMapSha)return null;
  const knownBytes=readBlob(root,witnessCommit,inventoryPath),known=parse(knownBytes);
  if(!isDeepStrictEqual(baseline.implementationHashes,known.implementationHashes))return null;
  if(hash(baselineBytes)!==hash(knownBytes))fail('registered historical inventory changed');
  if(typeof readSource!=='function')fail('current original-source reader required');
  const entries=Object.entries(known.implementationHashes);if(entries.length!==MAX_ROWS)fail('incomplete registered compiler inventory');
  const files=tree(root,compilerCommit,entries.map(([name])=>relative(name)));
  if(files.length!==entries.length||new Set(files.map(row=>row.path)).size!==entries.length)fail('missing compiler or duplicate inventory');
  const expected=new Map(entries),graph=batch(root,compilerCommit,files);let graphBytes=0;
  for(const file of graph){if(expected.get(file.path)!==file.sha256)fail('compiler fingerprint mismatch');graphBytes+=file.bytes.length;}
  const reviewerFiles=tree(root,compilerCommit,[reviewerPath]);if(reviewerFiles.length!==1||reviewerFiles[0].blob!=='ebc138bdf7eae9454965e58e7e0a2dcb732b43bb')fail('foreign historical reviewer');
  const reviewer=readBlob(root,compilerCommit,reviewerPath);if(hash(reviewer)!==reviewerSha)fail('historical reviewer fingerprint mismatch');graph.push({...reviewerFiles[0],bytes:reviewer,sha256:reviewerSha});graphBytes+=reviewer.length;
  if(graphBytes>MAX_GRAPH)fail('compiler graph byte limit');
  const originalNames=[...known.sources.map(row=>relative(row.source)),'Cargo.toml','Cargo.lock'];
  const originalFiles=tree(root,witnessCommit,originalNames);if(originalFiles.length!==806)fail('incomplete original source inventory');
  const original=batch(root,witnessCommit,originalFiles),sourcePins=new Map(known.sources.map(row=>[row.source,row]));
  for(const file of original){const pin=sourcePins.get(file.path);if(pin&&(pin.sha256!==file.sha256||pin.bytes!==file.bytes.length))fail('original source inventory mismatch');const bytes=readSource(file.path);if(types.isProxy(bytes)||!Buffer.isBuffer(bytes)||bytes.length!==file.bytes.length||hash(bytes)!==file.sha256)fail('changed current original source or Cargo input');}
  const outputs=tree(root,witnessCommit,[...roots,inventoryPath]);if(outputs.length!==2653)fail('incomplete historical output inventory');
  const baselineTree=tree(root,baselineSha,[...roots,inventoryPath]);if(!isDeepStrictEqual(baselineTree,outputs))fail('missing, extra or changed historical output');
  // Full decoded bytes are consumed once for complete immutable output facts.
  const outputPins=batch(root,witnessCommit,outputs).map(file=>({path:file.path,blob:file.blob,bytes:file.bytes.length,sha256:file.sha256}));
  const directory=fs.mkdtempSync(path.join(tmpdir(),'router-historical-review-'));
  const pins=[];let closed=false;
  const write=(name,bytes)=>{relative(name);const file=path.join(directory,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx',mode:0o400});pins.push({path:name,bytes:bytes.length,sha256:hash(bytes)});};
  try{
    for(const file of graph)write(file.path,file.bytes);
    write('historical-runner.mjs',Buffer.from(runner));
    write('historical-loader.mjs',Buffer.from(loader.replace('__IMMUTABLE_PINS__',JSON.stringify(Object.fromEntries(pins.map(pin=>[pin.path,{bytes:pin.bytes,sha256:pin.sha256}]))))));
  }catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error;}
  const provenance={schema:'immutable-historical-generated-review-v1',compilerCommit,witnessCommit,baselineSha,inventoryPath,inventorySha256:hash(baselineBytes),implementationInputs:graph.map(file=>({path:file.path,blob:file.blob,bytes:file.bytes.length,sha256:file.sha256})),originalInputs:original.map(file=>({path:file.path,blob:file.blob,bytes:file.bytes.length,sha256:file.sha256})),outputs:outputPins,materializationRoot:directory,materializationRealRoot:fs.realpathSync(directory),materializedBytes:pins.reduce((n,p)=>n+p.bytes,0),materializedFiles:pins.length,limits:{childTimeoutMs:TIMEOUT,gitTimeoutMs:30000,maxHeapMiB:1024,maxOutputBytes:8*1024*1024,maxGraphBytes:MAX_GRAPH},projects:[],semanticAuthority:false,runtimeParity:false,rustExecuted:false};
  return {
    reviewProject(bytes,row){
      if(closed)fail('closed historical graph');
      plainData(row);
      const expectedRow=known.projects.find(project=>project.entry===row?.entry);if(!isDeepStrictEqual(row,expectedRow))fail('changed historical project counts or profile');
      if(types.isProxy(bytes)||!Buffer.isBuffer(bytes))fail('non-byte historical metadata');
      const pin=outputPins.find(pin=>pin.path===expectedRow.targets.meta);if(!pin||bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)fail('changed historical metadata or body/proof');
      const meta=parse(bytes);if(!isDeepStrictEqual(meta.compilationProfile,known.compilationProfile))fail('historical compilation profile mismatch');
      snapshot(directory,pins);
      for(const file of original){const current=readSource(file.path);if(types.isProxy(current)||!Buffer.isBuffer(current)||current.length!==file.bytes.length||hash(current)!==file.sha256)fail('current original source changed before replay');}
      const sourceNames=new Set(['Cargo.toml','Cargo.lock',...(meta.checkedGeneratedMethods??[]).map(item=>relative(item.source))]);
      const sources=original.filter(file=>sourceNames.has(file.path)).map(file=>[file.path,new TextDecoder('utf-8',{fatal:true}).decode(file.bytes)]);
      if(sources.length!==sourceNames.size)fail('missing generated-method original source');
      const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;for(const key of Object.keys(env))if(key.startsWith('ROUTER_'))delete env[key];
      const start=Date.now(),result=spawnSync('node',['--max-old-space-size=1024','--experimental-loader',path.join(directory,'historical-loader.mjs'),path.join(directory,'historical-runner.mjs')],{cwd:directory,env,input:JSON.stringify({meta,row,sources}),timeout:TIMEOUT,maxBuffer:8*1024*1024});
      snapshot(directory,pins);
      if(result.status!==0){const error=new Error('Historical translation review: '+(result.error?.message??'child revalidation failed')+'\n'+result.stderr.toString());error.execution={exitCode:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout.toString(),stderr:result.stderr.toString(),elapsedMs:Date.now()-start};throw error;}
      const virtualPath=path.join(directory,'virtual-modules.json');if(!fs.existsSync(virtualPath)||fs.lstatSync(virtualPath).isSymbolicLink())fail('missing or linked historical core module receipt');const virtualModules=parse(fs.readFileSync(virtualPath));if(!Array.isArray(virtualModules)||virtualModules.length!==3||virtualModules.some(row=>row.parent!=='tools/translation/extensions/core.mjs'||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>1048576||!(/^[a-f0-9]{64}$/u.test(row.sha256))||!(/^[a-f0-9]{64}$/u.test(row.urlSha256))))fail('invalid historical core module receipt');
      const returned=parse(result.stdout);if(!Array.isArray(returned.reviewed)||returned.reviewed.length!==(row.checkedGeneratedMethods??0)||returned.semanticAuthority!==false||returned.runtimeParity!==false)fail('invalid historical revalidation result');
      provenance.projects.push({entry:row.entry,metadataSha256:pin.sha256,reviewedGeneratedMethods:returned.reviewed.length,elapsedMs:Date.now()-start,node:returned.node,virtualModules,stderr:result.stderr.toString(),exitCode:result.status});return returned.reviewed;
    },
    provenance(){return structuredClone(provenance);},
    close(){if(!closed){closed=true;fs.rmSync(directory,{recursive:true,force:true});}},
  };
}
