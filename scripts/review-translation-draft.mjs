#!/usr/bin/env node
// Review original inputs and every generated output. This does not certify
// target behavior, replace regeneration checks or grant a green gate stamp.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const MAX_FILE_BYTES=64*1024*1024,MAX_TOTAL_BYTES=512*1024*1024,MAX_FILES=32768;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const outputRoots=['tools/translation/meta','tools/translation/projects','packages/javascript/generated/rust-draft','packages/typescript/generated/rust-draft','packages/javascript/generated/rust-project','packages/typescript/generated/rust-project'];
const statusNames=['executable','carried','preserved'];
const identity=item=>JSON.stringify([item.term,item.name??null,item.span.start,item.span.end,item.sha256]);
function git(root,args,input) {
  const result=spawnSync('git',args,{cwd:root,input,timeout:30_000,maxBuffer:MAX_TOTAL_BYTES});
  if(result.status!==0)throw new Error(result.error?.message??result.stderr?.toString()??'Git review failed');
  return result.stdout;
}
function relativeName(name) {
  if(typeof name!=='string'||!name||name.length>4096||name.includes('\\')||/[\x00-\x1f]/u.test(name)||path.isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Review requires bounded relative paths');
  return name;
}
function parse(bytes) {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
function categoryCounts(rows) {
  const counts=new Map();
  for(const row of rows){const key=JSON.stringify([row.kind??null,row.message??row.diagnostic??null]);counts.set(key,(counts.get(key)??0)+1);}
  return [...counts].map(([key,count])=>{const [kind,message]=JSON.parse(key);return {kind,message,count};}).sort((a,b)=>b.count-a.count||JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function compactItem(source,item) {return {source,term:item.term,name:item.name??null,span:item.span,sha256:item.sha256,status:item.status,diagnostic:item.diagnostic??null};}

export function reviewTranslationDraft({root=process.cwd(),baselineSha=null,inventoryPath='parity/rust-source-inventory.json'}={}) {
  root=fs.realpathSync(root);
  if(baselineSha!==null&&!/^[a-f0-9]{40}$/u.test(baselineSha))throw new TypeError('Baseline must be an immutable full Git SHA');
  relativeName(inventoryPath);
  const profile=/^(profiles\/[A-Za-z0-9_-]+\/)?parity\/rust-source-inventory\.json$/u.exec(inventoryPath);
  if(!profile)throw new TypeError('Review requires a canonical or profile Rust inventory');
  const prefix=profile[1]??'',roots=outputRoots.map(name=>prefix+name),head=git(root,['rev-parse','HEAD']).toString().trim();
  const inputs=new Map();let inputBytes=0;
  function read(name) {
    relativeName(name);let absolute=root;
    for(const part of name.split('/')){absolute=path.join(absolute,part);if(fs.lstatSync(absolute).isSymbolicLink())throw new TypeError('Review refuses linked inputs: '+name);}
    const before=fs.statSync(absolute);
    if(!before.isFile()||before.size>MAX_FILE_BYTES)throw new RangeError('Review input file budget or kind: '+name);
    const bytes=fs.readFileSync(absolute),after=fs.statSync(absolute);
    if(bytes.length!==before.size||before.dev!==after.dev||before.ino!==after.ino||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw new Error('Input changed during review: '+name);
    const row={path:name,bytes:bytes.length,sha256:digest(bytes)},old=inputs.get(name);
    if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new Error('Input changed during review: '+name);
    if(!old){inputBytes+=bytes.length;if(inputs.size>=MAX_FILES||inputBytes>MAX_TOTAL_BYTES)throw new RangeError('Review complete-input budget');inputs.set(name,row);}
    return bytes;
  }
  const inventory=parse(read(inventoryPath));
  if(!Array.isArray(inventory.sources)||!Array.isArray(inventory.projects)||!inventory.totals||!inventory.implementationHashes)throw new TypeError('Incomplete translation inventory');
  const tracked=git(root,['ls-files','-z','--','*.rs']).toString().split('\0').filter(Boolean).sort();
  if(JSON.stringify(inventory.sources.map(row=>row.source).sort())!==JSON.stringify(tracked))throw new Error('Inventory must cover every tracked Rust source exactly once');
  const outputs=new Map();
  function output(name) {
    if(name!==inventoryPath&&!roots.some(directory=>name.startsWith(directory+'/')))throw new TypeError('Target is outside generated roots: '+name);
    read(name);outputs.set(name,inputs.get(name));
  }
  function walk(name) {
    const absolute=path.join(root,name);if(!fs.existsSync(absolute))return;
    if(fs.lstatSync(absolute).isSymbolicLink())throw new TypeError('Review refuses linked output directories: '+name);
    for(const entry of fs.readdirSync(absolute,{withFileTypes:true})){
      const child=name+'/'+entry.name;
      if(entry.isDirectory())walk(child);else output(child);
    }
  }
  roots.forEach(walk);output(inventoryPath);
  const compilerInputs=[];
  for(const [name,sha256] of Object.entries(inventory.implementationHashes)){
    if(digest(read(name))!==sha256)throw new Error('Stale compiler input: '+name);
    compilerInputs.push(inputs.get(name));
  }
  const oldInventory=baselineSha?parse(git(root,['show',baselineSha+':'+inventoryPath])):null;
  const oldRows=new Map((oldInventory?.sources??[]).map(row=>[row.source,row]));
  if(oldInventory&&(oldInventory.sources.length!==tracked.length||JSON.stringify([...oldRows.keys()].sort())!==JSON.stringify(tracked)))throw new Error('Baseline must cover the same original Rust source set');
  const originals=[],gained=[],lost=[],totals=Object.fromEntries(Object.keys(inventory.totals).map(key=>[key,0]));
  const previousTotals=Object.fromEntries(Object.keys(totals).map(key=>[key,0]));
  const metaPaths=baselineSha?inventory.sources.map(row=>{
    const old=oldRows.get(row.source);
    if(old.sha256!==row.sha256||old.bytes!==row.bytes)throw new Error('Original Rust changed since baseline: '+row.source);
    return relativeName(old.targets.meta);
  }):[];
  // A single bounded Git batch avoids one process per Rust source. Its buffers
  // contain complete original metadata, including every carried item.
  const batch=metaPaths.length?git(root,['cat-file','--batch'],metaPaths.map(name=>baselineSha+':'+name+'\n').join('')):Buffer.alloc(0);
  let offset=0;
  function oldMeta() {
    const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString();
    const match=/^[a-f0-9]{40} blob (\d+)$/u.exec(header);
    if(end<offset||!match)throw new Error('Missing baseline metadata');
    const size=Number(match[1]);if(!Number.isSafeInteger(size)||size>MAX_FILE_BYTES||end+1+size>=batch.length||batch[end+1+size]!==10)throw new RangeError('Baseline metadata budget or frame');
    const value=parse(batch.subarray(end+1,end+1+size));offset=end+2+size;return value;
  }
  function checkMeta(meta,row,source) {
    if(meta.sourcePath!==row.source||meta.sourceBytes!==row.bytes||meta.sourceSha256!==row.sha256||!Array.isArray(meta.items))throw new Error('Metadata source mismatch: '+row.source);
    const counts=Object.fromEntries(statusNames.map(name=>[name,0])),seen=new Set();
    for(const item of meta.items){
      if(!statusNames.includes(item.status)||!Number.isSafeInteger(item.span?.start)||!Number.isSafeInteger(item.span?.end)||item.span.start<0||item.span.end<item.span.start||item.span.end>source.length)throw new Error('Invalid original item boundary: '+row.source);
      const original=source.slice(item.span.start,item.span.end);
      if(item.source!==original||digest(Buffer.from(original))!==item.sha256||seen.has(identity(item)))throw new Error('Original item integrity failure: '+row.source);
      seen.add(identity(item));counts[item.status]++;
    }
    for(const name of statusNames)if(counts[name]!==meta.counts?.[name]||counts[name]!==row[name])throw new Error('Metadata count mismatch: '+row.source);
    return meta;
  }
  for(const row of inventory.sources){
    const bytes=read(row.source);
    if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)throw new Error('Stale original Rust: '+row.source);
    originals.push(inputs.get(row.source));
    const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    for(const target of Object.values(row.targets))output(target);
    const current=checkMeta(parse(read(row.targets.meta)),row,source);
    totals.sources++;
    for(const key of Object.keys(totals).filter(key=>key!=='sources')){
      if(!Number.isSafeInteger(row[key])||row[key]<0||current.counts[key]!==row[key])throw new Error('Invalid source total '+key+': '+row.source);
      totals[key]+=row[key];
    }
    if(baselineSha){
      const previous=checkMeta(oldMeta(),oldRows.get(row.source),source),before=new Map(previous.items.map(item=>[identity(item),item])),after=new Map(current.items.map(item=>[identity(item),item]));
      previousTotals.sources++;
      for(const key of Object.keys(previousTotals).filter(key=>key!=='sources')){
        const value=oldRows.get(row.source)[key];
        if(!Number.isSafeInteger(value)||value<0||previous.counts[key]!==value)throw new Error('Invalid baseline source total '+key+': '+row.source);
        previousTotals[key]+=value;
      }
      for(const item of current.items)if(item.status==='executable'&&before.get(identity(item))?.status!=='executable')gained.push({...compactItem(row.source,item),previousStatus:before.get(identity(item))?.status??null});
      for(const item of previous.items)if(item.status==='executable'&&after.get(identity(item))?.status!=='executable')lost.push({...compactItem(row.source,item),currentStatus:after.get(identity(item))?.status??null});
    }
  }
  if(offset!==batch.length)throw new Error('Unconsumed baseline metadata');
  for(const [key,count] of Object.entries(totals))if(inventory.totals[key]!==count)throw new Error('Invalid complete inventory total: '+key);
  if(oldInventory)for(const [key,count] of Object.entries(previousTotals))if(oldInventory.totals[key]!==count)throw new Error('Invalid baseline inventory total: '+key);
  const cargo=[];
  for(const name of git(root,['ls-files','-z','--','Cargo.toml','Cargo.lock']).toString().split('\0').filter(Boolean)){
    const bytes=read(name);if(baselineSha&&digest(git(root,['show',baselineSha+':'+name]))!==digest(bytes))throw new Error('Original Cargo input changed since baseline: '+name);cargo.push(inputs.get(name));
  }
  const projectIdentity=item=>JSON.stringify([item.source,item.name,item.term??null,item.span.start,item.span.end]);
  function projectMeta(meta,row) {
    if(!Array.isArray(meta.sources)||!Array.isArray(meta.refused)||!Array.isArray(meta.unloweredItems)||!Array.isArray(meta.checkedMethods)||!Array.isArray(meta.executable)||!Array.isArray(meta.moduleDiagnostics))throw new Error('Incomplete project metadata: '+row.entry);
    if(meta.sources.length!==row.sources||meta.refused.length!==row.refused||meta.unloweredItems.length!==row.unloweredItems||meta.checkedMethods.length!==row.checkedMethods||meta.moduleDiagnostics.length!==row.moduleDiagnostics||meta.executable.filter(item=>item.term==='fn').length!==row.executableFunctions||meta.executable.filter(item=>item.term==='const').length!==row.executableConstants)throw new Error('Project count mismatch: '+row.entry);
    for(const source of meta.sources)if(inputs.get(source.source)?.sha256!==source.sha256)throw new Error('Project source mismatch: '+row.entry);
    for(const item of [...meta.executable,...meta.checkedMethods]){
      if(!tracked.includes(item.source)||!Number.isSafeInteger(item.span?.start)||!Number.isSafeInteger(item.span?.end)||item.span.start<0||item.span.end<item.span.start||item.span.end>new TextDecoder('utf-8',{fatal:true}).decode(read(item.source)).length)throw new Error('Invalid project original item: '+row.entry);
    }
    return meta;
  }
  const projects=inventory.projects.map(row=>{
    for(const target of Object.values(row.targets))output(target);
    const meta=projectMeta(parse(read(row.targets.meta)),row);
    let comparison=null;
    if(oldInventory){
      const previousRow=oldInventory.projects.find(previous=>previous.entry===row.entry);
      if(!previousRow)throw new Error('Baseline project missing: '+row.entry);
      const previous=projectMeta(parse(git(root,['show',baselineSha+':'+relativeName(previousRow.targets.meta)])),previousRow);
      const differences=(before,after)=>{const known=new Set(before.map(projectIdentity));return after.filter(item=>!known.has(projectIdentity(item)));};
      comparison={previousCounts:previousRow,countChanges:Object.fromEntries(['sources','executableFunctions','executableConstants','checkedMethods','refused','unloweredItems','moduleDiagnostics'].map(key=>[key,row[key]-previousRow[key]])),newlyExecutableItems:differences(previous.executable,meta.executable),lostExecutableItems:differences(meta.executable,previous.executable),newlyCheckedMethods:differences(previous.checkedMethods,meta.checkedMethods),lostCheckedMethods:differences(meta.checkedMethods,previous.checkedMethods)};
    }
    return {...row,executableItems:meta.executable,checkedMethodItems:meta.checkedMethods,refusalCategories:categoryCounts(meta.refused),unloweredCategories:categoryCounts(meta.unloweredItems),moduleDiagnosticItems:meta.moduleDiagnostics,comparison};
  });
  for(const name of [...inputs.keys()])read(name);
  if(git(root,['rev-parse','HEAD']).toString().trim()!==head)throw new Error('Commit changed during review');
  return {schema:'original-corpus-draft-review-v1',headSha:head,baselineSha,inventoryPath,originalRustInputs:originals,originalCargoInputs:cargo,originalInputsUnchangedFromBaseline:baselineSha?true:null,compilerInputs,outputs:[...outputs.values()].sort((a,b)=>a.path.localeCompare(b.path)),totals,functionCoverage:inventory.functionCoverage,projects,comparison:oldInventory?{previousTotals:oldInventory.totals,totalChanges:Object.fromEntries(Object.entries(totals).map(([key,count])=>[key,count-oldInventory.totals[key]])),newlyExecutableItems:gained,lostExecutableItems:lost}:null,reviewInputs:[...inputs.values()].sort((a,b)=>a.path.localeCompare(b.path)),semanticAuthority:false,runtimeParity:false,fullGatePass:false,rustExecuted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const options={},args=process.argv.slice(2);let output;
    for(let i=0;i<args.length;i++){
      if(!['--root','--baseline','--inventory','--output'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Usage: node scripts/review-translation-draft.mjs [--root ROOT] [--baseline FULL_SHA] [--inventory PATH] --output NEW_JSON');
      const flag=args[i],value=args[++i];
      if(flag==='--output')output=value;else options[{'--root':'root','--baseline':'baselineSha','--inventory':'inventoryPath'}[flag]]=value;
    }
    if(!output)throw new Error('A new --output report path is required');
    const report=reviewTranslationDraft(options);fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({output,headSha:report.headSha,sources:report.totals.sources,outputFiles:report.outputs.length,totals:report.totals,newlyExecutableItems:report.comparison?.newlyExecutableItems.length??null,lostExecutableItems:report.comparison?.lostExecutableItems.length??null,runtimeParity:false,fullGatePass:false}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
