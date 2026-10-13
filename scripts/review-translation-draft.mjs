#!/usr/bin/env node
// Review original inputs and every generated output. This does not certify
// target behavior, replace regeneration checks or grant a green gate stamp.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parseProgram} from '../tools/translation/semantic-meta.mjs';
import {sourceItems} from '../tools/translation/rust-structure.mjs';
import {inspectDeriveInput} from '../tools/translation/derive-inputs.mjs';
import {loadDeriveDependencyProof} from '../tools/translation/derive-dependencies.mjs';
import {proveBuiltinScalarSourceOutput,builtinScalarOriginalSourcePlan} from '../tools/translation/builtin-scalar-ast-route.mjs';
import {pinnedDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence} from '../tools/translation/extensions/standard-body-source.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from '../tools/translation/extensions/host-contracts.mjs';
import {assertOriginalParserIdentity} from '../tools/translation/original-parser-identity.mjs';
import {tokenizeRust} from '../tools/translation/extensions/lexical.mjs';
import {TokenCursor} from '../tools/translation/vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from '../tools/translation/extensions/text.mjs';
import {rustFixedType} from '../tools/translation/checked-types.mjs';

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

const sha256Pattern=/^[a-f0-9]{64}$/u;
const same=(actual,expected,message)=>{if(!isDeepStrictEqual(actual,expected))throw new Error(message);};
const generatedIdentity=item=>JSON.stringify([item.source,item.name,item.generator,item.origin,item.originalDeclarationTerm,item.span.start,item.span.end,item.itemSha256]);
function generatedArray(meta) {
  if(!Object.hasOwn(meta,'checkedGeneratedMethods'))return [];
  if(!Array.isArray(meta.checkedGeneratedMethods))throw new Error('Malformed generated method metadata');
  return meta.checkedGeneratedMethods;
}
function flattenedNode(node,names) {
  if(Array.isArray(node))return node.map(value=>flattenedNode(value,names));
  if(!node||typeof node!=='object')return node;
  const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,flattenedNode(value,names)]));
  if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);
  if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;
  if(node.k==='ctor')result.data=names.get(node.data)??node.data;
  return result;
}
function primitiveType(type){const result={...type};delete result.rustSourceType;return result;}
function originalPrimitiveBody(selection){
  const parser=new HostRustParser(tokenizeRust(selection.method.bodySource)),snapshot=originalHostParserIdentitySnapshot();
  const identity=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
  identity();const body=parsePinnedBody(HostRustParser,selection);identity();return body;
}
function checkDefaultBody(entry,data,fields) {
  if(!data?.record||data.ctors.length!==1||data.ctors[0].ctorStyle!=='named')throw new Error('Generated Default has no checked named record');
  const layout=data.ctors[0].fields,names=[];let node=entry.body;
  if(layout.length!==fields.length)throw new Error('Generated Default field count mismatch');
  for(let index=0;index<fields.length;index++){
    const field=fields[index],declared=layout[index],body=field.originalBody;
    if(declared.name!==field.field||node?.k!=='let'||typeof node.name!=='string'||names.includes(node.name)||node.value?.k!=='lit')throw new Error('Generated Default field body mismatch');
    same(node.type,{kind:'data',name:data.fullName},'Generated Default binding result mismatch');
    same(primitiveType(declared.type),field.type==='bool'?{kind:'bool'}:{...rustFixedType(field.type),rustPrimitiveName:field.type},'Generated Default source field type mismatch');
    same(primitiveType(node.value.type),primitiveType(declared.type),'Generated Default literal type mismatch');
    const expected=body.k==='bool'?body.value:body.k==='num'?body.value:null;
    if(expected===null||node.value.value!==expected)throw new Error('Generated Default differs from original primitive body');
    names.push(node.name);node=node.body;
  }
  if(node?.k!=='ctor'||node.data!==data.fullName||node.ctor!==data.ctors[0].name||node.args.length!==layout.length)throw new Error('Generated Default constructor mismatch');
  same(node.type,{kind:'data',name:data.fullName},'Generated Default constructor type mismatch');
  node.args.forEach((arg,index)=>{same(arg,{k:'var',name:names[index],type:layout[index].type},'Generated Default field binding mismatch');});
}
// Integrity only. Serialized rows never recreate the compiler's private caller
// brands; source namespace, runtime and whole-trait authority remain false.
export function reviewGeneratedMethods(meta,row,{readSource,dependencies}={}) {
  if(meta.runtimeParity===true||meta.semanticAuthority===true)throw new Error('Generated review cannot accept semantic or runtime authority');
  const rows=generatedArray(meta),count=Object.hasOwn(row,'checkedGeneratedMethods')?row.checkedGeneratedMethods:0;
  if(!Number.isSafeInteger(count)||count<0||count!==rows.length)throw new Error('Generated method count mismatch: '+row.entry);
  if(!rows.length&&!Object.hasOwn(meta,'checkedSemanticProgram')&&!Object.hasOwn(meta,'targetSemanticProgram'))return [];
  const checked=parseProgram(JSON.stringify(meta.checkedSemanticProgram)),target=parseProgram(JSON.stringify(meta.targetSemanticProgram));
  const entries=[...checked.declarations.values()].filter(entry=>entry.generated==='router-source-generated-default-method'||entry.impl?.defaultSourceProof?.schema==='original-generated-default-ir-v1');
  if(entries.length!==rows.length)throw new Error('Generated method semantic count mismatch: '+row.entry);
  const names=new Map([...checked.declarations.keys()].map(name=>[name,'rp_'+Buffer.from(name).toString('hex')]));
  const used=new Set(),identities=new Set(),result=[];
  for(const item of rows){
    if(item?.term!=='generated-method'||item.origin!=='derive-invocation'||item.originalDeclarationTerm!=='struct'||item.generator!=='core::default::Default'||item.receiver!==null||item.semanticBodyChecked!==true||item.runtimeParity===true||item.semanticAuthority===true||typeof item.name!=='string')throw new Error('Invalid generated method classification');
    relativeName(item.source);const source=readSource(item.source),proof=item.defaultSourceProof,span=item.span;
    if(typeof source!=='string'||!Number.isSafeInteger(span?.start)||!Number.isSafeInteger(span?.end)||span.start<0||span.end<=span.start||span.end>source.length)throw new Error('Invalid generated original declaration boundary');
    const sourceSha256=digest(Buffer.from(source)),original=source.slice(span.start,span.end),itemSha256=digest(Buffer.from(original));
    if(proof?.schema!=='original-generated-default-ir-v1'||proof.source!==item.source||proof.sourceSha256!==sourceSha256||proof.itemSha256!==itemSha256)throw new Error('Generated original declaration hash mismatch');
    same(proof.span,span,'Generated original declaration span mismatch');
    if(proof.bodyMapped!==true||proof.checkedBody!==false||proof.wholeCompilerExecuted!==false||proof.wholeTraitTranslated!==false||proof.runtimeParity!==false||!sha256Pattern.test(proof.contextDigest))throw new Error('Invalid generated source authority flags');
    const parsed=sourceItems(original).filter(entry=>!entry.comment);
    if(parsed.length!==1||parsed[0].term!=='struct'||parsed[0].start!==0||parsed[0].end!==original.length)throw new Error('Generated source is not the exact original struct');
    const input=inspectDeriveInput(parsed[0],meta.compilationProfile);
    if(input.derives.filter(derive=>isDeepStrictEqual(derive.path,['Default'])).length!==1)throw new Error('Generated source lacks its exact Default invocation');
    const candidates=entries.filter(entry=>entry.impl?.defaultSourceProof?.source===item.source&&isDeepStrictEqual(entry.impl.defaultSourceProof.span,span));
    if(candidates.length!==1||used.has(candidates[0]))throw new Error('Generated method metadata is not one-to-one');
    const entry=candidates[0],nominal=[...entry.modulePath,parsed[0].name].join('.');used.add(entry);
    if(item.name!==nominal+'.default'||entry.impl?.method!=='default'||entry.impl.receiver!==null||entry.generated!=='router-source-generated-default-method'||entry.params.length||entry.async||entry.constant||entry.constFunction||entry.ret.kind!=='data'||entry.ret.name!==nominal)throw new Error('Generated checked signature mismatch');
    same(entry.impl.type.path,['crate',...entry.modulePath,parsed[0].name],'Generated nominal owner mismatch');
    const localName='ml_impl_'+Buffer.from(['crate',...entry.modulePath,parsed[0].name].join('.')).toString('hex')+'_'+Buffer.from('default').toString('hex');
    if(entry.name!==localName||entry.fullName!==[...entry.modulePath,localName].join('.'))throw new Error('Generated original symbol mismatch');
    same(entry.ret,{kind:'data',name:nominal,rustSourceType:true},'Generated checked return ownership mismatch');
    same(entry.impl.defaultSourceProof,proof,'Generated source/checked proof mismatch');
    if(!meta.sources.some(original=>original.source===item.source&&original.sha256===sourceSha256&&isDeepStrictEqual(original.module,entry.modulePath)))throw new Error('Generated source module mismatch');
    if(!Number.isSafeInteger(entry.span?.start)||!Number.isSafeInteger(entry.span?.end))throw new Error('Generated checked declaration boundary mismatch');
    const shift=entry.span.start-span.start;
    if(!Number.isSafeInteger(shift)||shift<0||entry.span.end-span.end!==shift)throw new Error('Generated relocated declaration span mismatch');
    if(meta.checkedMethods.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span))||meta.executable.some(method=>method.source===item.source&&isDeepStrictEqual(method.span,span)))throw new Error('Generated method overlaps original fn/method counts');
    const output=proveBuiltinScalarSourceOutput({dependencies:typeof dependencies==='function'?dependencies():dependencies,source,span,owner:'Default'}),plan=builtinScalarOriginalSourcePlan(output),branch=output.branches[0];
    if(proof.originalOutputDigest!==output.digest||proof.originalCompilerPlanDigest!==plan.digest||proof.selectedBranch!==branch.feature||output.branches.length!==1)throw new Error('Generated original compiler plan mismatch');
    same(proof.hygiene,branch.body.slots.fields.map(field=>field.expr.slots.expr.slots.path.segments[0]),'Generated standard hygiene mismatch');
    if(!Array.isArray(proof.fields)||proof.fields.length!==output.input.fields.length)throw new Error('Generated primitive source field count mismatch');
    proof.fields.forEach((field,index)=>{
      const originalField=output.input.fields[index];if(field.field!==originalField.name||field.type!==originalField.type)throw new Error('Generated primitive source field mismatch');
      const selection=pinnedDefaultBody(field.type),body=originalPrimitiveBody(selection),syntax=parsedPinnedBodyEvidence(body);
      same(field.selection,selection,'Generated standard primitive selection mismatch');same(field.originalBody,body,'Generated primitive original body mismatch');
      if(field.syntaxSha256!==syntax.syntaxSha256)throw new Error('Generated primitive syntax hash mismatch');
    });
    checkDefaultBody(entry,checked.declarations.get(nominal),proof.fields);
    const flattened=target.declarations.get(names.get(entry.fullName));
    if(!flattened||flattened.generated!=='router-project-flattened'||flattened.impl?.method!=='default'||flattened.impl.receiver!==null)throw new Error('Generated flattened target missing');
    if(flattened.name!==flattened.fullName||flattened.modulePath.length)throw new Error('Generated flattened symbol mismatch');
    same(flattened.impl.defaultSourceProof,proof,'Generated flattened proof mismatch');
    same({params:flattened.params,ret:flattened.ret},flattenedNode({params:entry.params,ret:entry.ret},names),'Generated flattened signature mismatch');
    same(flattened.body,flattenedNode(entry.body,names),'Generated flattened body mismatch');
    same(flattened.span,entry.span,'Generated flattened span mismatch');
    const reviewed={...item,sourceSha256,itemSha256,qualifiedName:entry.fullName,targetName:flattened.fullName,checkedSignatureSha256:digest(JSON.stringify({params:entry.params,ret:entry.ret})),checkedBodySha256:digest(JSON.stringify(entry.body)),targetBodySha256:digest(JSON.stringify(flattened.body)),semanticAuthority:false,runtimeParity:false};
    const identity=generatedIdentity(reviewed);if(identities.has(identity))throw new Error('Duplicate generated method identity');identities.add(identity);result.push(reviewed);
  }
  return result;
}
export function compareGeneratedMethods(before,after) {
  const old=new Map(before.map(item=>[generatedIdentity(item),item])),current=new Map(after.map(item=>[generatedIdentity(item),item]));
  return {newlyCheckedGeneratedMethods:after.filter(item=>!old.has(generatedIdentity(item))),lostCheckedGeneratedMethods:before.filter(item=>!current.has(generatedIdentity(item))),changedGeneratedMethodBodies:after.filter(item=>{const prior=old.get(generatedIdentity(item));return prior&&(prior.checkedBodySha256!==item.checkedBodySha256||prior.checkedSignatureSha256!==item.checkedSignatureSha256);}).map(item=>({identity:generatedIdentity(item),previous:old.get(generatedIdentity(item)),current:item}))};
}

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
  let generatedDependencies;const dependencies=()=>generatedDependencies??=loadDeriveDependencyProof({manifest:read('Cargo.toml').toString('utf8'),lock:read('Cargo.lock').toString('utf8')});
  const projectIdentity=item=>JSON.stringify([item.source,item.name,item.term??null,item.span.start,item.span.end]);
  function projectMeta(meta,row) {
    if(!Array.isArray(meta.sources)||!Array.isArray(meta.refused)||!Array.isArray(meta.unloweredItems)||!Array.isArray(meta.checkedMethods)||!Array.isArray(meta.executable)||!Array.isArray(meta.moduleDiagnostics))throw new Error('Incomplete project metadata: '+row.entry);
    if(meta.sources.length!==row.sources||meta.refused.length!==row.refused||meta.unloweredItems.length!==row.unloweredItems||meta.checkedMethods.length!==row.checkedMethods||meta.moduleDiagnostics.length!==row.moduleDiagnostics||meta.executable.filter(item=>item.term==='fn').length!==row.executableFunctions||meta.executable.filter(item=>item.term==='const').length!==row.executableConstants)throw new Error('Project count mismatch: '+row.entry);
    for(const source of meta.sources)if(inputs.get(source.source)?.sha256!==source.sha256)throw new Error('Project source mismatch: '+row.entry);
    for(const item of [...meta.executable,...meta.checkedMethods]){
      if(!tracked.includes(item.source)||!Number.isSafeInteger(item.span?.start)||!Number.isSafeInteger(item.span?.end)||item.span.start<0||item.span.end<item.span.start||item.span.end>new TextDecoder('utf-8',{fatal:true}).decode(read(item.source)).length)throw new Error('Invalid project original item: '+row.entry);
    }
    return {...meta,reviewedGeneratedMethods:reviewGeneratedMethods(meta,row,{readSource:name=>new TextDecoder('utf-8',{fatal:true}).decode(read(name)),dependencies})};
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
      comparison={previousCounts:previousRow,countChanges:Object.fromEntries(['sources','executableFunctions','executableConstants','checkedMethods','checkedGeneratedMethods','refused','unloweredItems','moduleDiagnostics'].map(key=>[key,(row[key]??0)-(previousRow[key]??0)])),newlyExecutableItems:differences(previous.executable,meta.executable),lostExecutableItems:differences(meta.executable,previous.executable),newlyCheckedMethods:differences(previous.checkedMethods,meta.checkedMethods),lostCheckedMethods:differences(meta.checkedMethods,previous.checkedMethods),...compareGeneratedMethods(previous.reviewedGeneratedMethods,meta.reviewedGeneratedMethods)};
    }
    return {...row,checkedGeneratedMethods:meta.reviewedGeneratedMethods.length,executableItems:meta.executable,checkedMethodItems:meta.checkedMethods,checkedGeneratedMethodItems:meta.reviewedGeneratedMethods,refusalCategories:categoryCounts(meta.refused),unloweredCategories:categoryCounts(meta.unloweredItems),moduleDiagnosticItems:meta.moduleDiagnostics,comparison};
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
