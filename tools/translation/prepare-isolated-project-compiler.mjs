// Deterministic proposal builder. It never changes registered runtime trust or
// source files in place; complete proposals require source review before use.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,basename,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isCompilerSourceInputPath} from './compiler-source-inputs.mjs';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';

const EXTRA=['scripts/translate-router.mjs',"scripts/translate-router-flat-native-owned-field-meta.mjs",'scripts/export-router-translator.mjs','scripts/regenerate-js-first.mjs','scripts/regenerate-native-typescript.mjs','scripts/sync-router.mjs','LICENSE','js/package.json','js/package-lock.json'];
const EXCLUDED=['tools/translation/isolated-project-batch.mjs','tools/translation/isolated-project-driver.mjs','tools/translation/prepare-isolated-project-compiler.mjs','tools/translation/source-profiles/isolated-project-compiler/'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=path=>/^[A-Za-z0-9_./@+-]{1,240}$/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
function selected(path){if(EXCLUDED.some(value=>path===value||value.endsWith('/')&&path.startsWith(value)))return false;if(EXTRA.includes(path))return true;if(!path.startsWith('tools/translation/'))return false;const local=path.slice('tools/translation/'.length);return isCompilerSourceInputPath(path)||['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>local.startsWith(prefix));}
function git(root,args,input){const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));Object.assign(env,{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null'});return execFileSync('/usr/bin/git',['--no-replace-objects',...args],{cwd:root,env,input,timeout:10000,maxBuffer:268435456});}
function crc32(bytes){let value=0xffffffff;for(let at=0;at<bytes.length;at++){value^=bytes[at];for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
// RFC1952 + RFC1951 stored blocks: byte-identical across zlib/engine versions.
function storedGzip(bytes){const parts=[Buffer.from([31,139,8,0,0,0,0,0,0,255])];for(let at=0;at<bytes.length;){const count=Math.min(65535,bytes.length-at),header=Buffer.alloc(5);header[0]=at+count===bytes.length?1:0;header.writeUInt16LE(count,1);header.writeUInt16LE(65535-count,3);parts.push(header,bytes.subarray(at,at+count));at+=count;}const footer=Buffer.alloc(8);footer.writeUInt32LE(crc32(bytes),0);footer.writeUInt32LE(bytes.length>>>0,4);parts.push(footer);return Buffer.concat(parts);}
function capture(root,revision){
  const sourceHead=git(root,['rev-parse','--verify',revision+'^{commit}']).toString('utf8').trim();if(!/^[a-f0-9]{40}$/u.test(sourceHead))throw Error('complete SHA1 source revision required');
  // Select metadata before asking Git for sizes: excluded test/generated blob
  // bodies need not exist in a genuine portable historical object database.
  const tree=git(root,['ls-tree','-rz',sourceHead,'--','tools/translation',...EXTRA]).toString('utf8').split('\0').filter(Boolean),records=[];
  for(const line of tree){const match=/^(\d{6}) (\S+) ([a-f0-9]{40})\t(.+)$/u.exec(line);if(!match)throw Error('unknown original Git tree entry');const [,mode,kind,gitBlob,path]=match;if(!selected(path))continue;if(!safe(path)||kind!=='blob'||!['100644','100755'].includes(mode))throw Error('unsafe original compiler member');records.push({path,mode,gitBlob});}
  if(records.length>2048)throw Error('compiler member bound');
  const sizeBytes=git(root,['cat-file','--batch-check'],Buffer.from(records.map(row=>row.gitBlob+'\n').join(''))),sizes=sizeBytes.length?sizeBytes.toString('utf8').trimEnd().split('\n'):[];if(sizes.length!==records.length)throw Error('complete selected Git size census');
  for(let at=0;at<records.length;at++){const row=records[at],match=/^([a-f0-9]{40}) blob (\d+)$/u.exec(sizes[at]);if(!match||match[1]!==row.gitBlob||!Number.isSafeInteger(Number(match[2]))||Number(match[2])>33554432)throw Error('unsafe original compiler member');row.bytes=Number(match[2]);}
  if(records.length>2048)throw Error('compiler member bound');const all=git(root,['cat-file','--batch'],Buffer.from(records.map(row=>row.gitBlob+'\n').join(''))),rows=[];let at=0,total=0;
  for(const row of records){const end=all.indexOf(10,at);if(end<0||all.subarray(at,end).toString('utf8')!==`${row.gitBlob} blob ${row.bytes}`)throw Error('original Git byte header');at=end+1;const bytes=all.subarray(at,at+row.bytes);at+=row.bytes;if(all[at++]!==10)throw Error('original Git byte boundary');const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');if(blob!==row.gitBlob)throw Error('original Git full byte digest');total+=bytes.length;if(total>67108864)throw Error('compiler source byte bound');rows.push({path:row.path,origin:'compiler',mode:row.mode,gitBlob:row.gitBlob,bytes:bytes.length,sha256:hash(bytes)});}
  if(at!==all.length)throw Error('unexpected Git byte suffix');
  const tsRoot=fs.realpathSync(join(root,'js/node_modules/typescript')),pkg=JSON.parse(fs.readFileSync(join(tsRoot,'package.json'),'utf8'));if(pkg.version!=='5.9.3')throw Error('installed TypeScript5.9.3 required');
  const paths=[],pending=[tsRoot];while(pending.length){const path=pending.pop(),state=fs.lstatSync(path);if(state.isSymbolicLink())throw Error('linked TypeScript member');if(state.isDirectory())for(const name of fs.readdirSync(path))pending.push(join(path,name));else if(state.isFile())paths.push(path);else throw Error('unknown TypeScript member type');}
  paths.sort();for(const file of paths){const local=relative(tsRoot,file).split('\\').join('/'),before=fs.lstatSync(file),bytes=fs.readFileSync(file),after=fs.lstatSync(file);if(!safe(local)||bytes.length>33554432||before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('TypeScript complete source changed');total+=bytes.length;if(total>67108864||rows.length>=2048)throw Error('complete snapshot bound');rows.push({path:'js/node_modules/typescript/'+local,origin:'typescript',mode:before.mode&0o111?'100755':'100644',bytes:bytes.length,sha256:hash(bytes)});}
  rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);if(new Set(rows.map(row=>row.path)).size!==rows.length)throw Error('duplicate snapshot member');
  return {schema:'original-project-isolated-compiler-v1',sourceHead,typescriptVersion:'5.9.3',bootstrapExcluded:EXCLUDED,sources:rows,files:rows.length,totalBytes:total,authority:{semantic:false,owner:false,runtime:false}};
}
function literal(source,name,value){const match=new RegExp('^const '+name+' ?= ?[^;\\n]+;','mu').exec(source);if(!match||source.indexOf(match[0])!==source.lastIndexOf(match[0]))throw Error('unique fixed source pin required: '+name);const after='const '+name+' = '+JSON.stringify(value)+';';return {before:match[0],after,rule:exactSubstitutionRule('isolated-compiler:pin-'+name,match[0],after,'Fixed bootstrap pin changed: '+name)};}
function physicalDestination(path){
  let anchor=path;const tail=[];
  while(true){
    try{return resolve(fs.realpathSync(anchor),...tail);}
    catch(error){
      if(error.code!=='ENOENT')throw error;
      let entry;try{entry=fs.lstatSync(anchor);}catch(missing){if(missing.code!=='ENOENT')throw missing;}
      if(entry)throw Error('unresolved proposal output component');
      const parent=dirname(anchor);if(parent===anchor)throw Error('proposal output ancestor unavailable');tail.unshift(basename(anchor));anchor=parent;
    }
  }
}
function contains(root,path){return path===root||path.startsWith(root.endsWith('/')?root:root+'/');}
function disjoint(source,output){return !contains(source,output)&&!contains(output,source);}
function sameDirectory(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;}
export function prepareIsolatedProjectCompiler({root,revision,output}){
  root=fs.realpathSync(resolve(root));output=resolve(output);const rootIdentity=fs.lstatSync(root),outputPhysical=physicalDestination(output);if(!disjoint(root,output)||!disjoint(root,outputPhysical))throw Error('proposal destination must be outside physical source tree');try{fs.lstatSync(output);throw Error('fresh proposal destination required');}catch(error){if(error.code!=='ENOENT')throw error;}
  let registry,raw,packed,driver,parent,edits;
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'isolated-compiler:capture-complete-originals',apply:()=>{registry=capture(root,revision);raw=Buffer.from(JSON.stringify(registry)+'\n');packed=storedGzip(raw);return registry;}}]},
    {phase:'repository',rules:[{id:'isolated-compiler:propose-registry-and-bootstrap-pins',apply:()=>{
      const driverBefore=fs.readFileSync(join(root,'tools/translation/isolated-project-driver.mjs'),'utf8'),parentBefore=fs.readFileSync(join(root,'tools/translation/isolated-project-batch.mjs'),'utf8');driver=driverBefore;parent=parentBefore;edits=[];
      for(const [name,value] of [['SOURCE_HEAD',registry.sourceHead],['REGISTRY_GZIP_SHA256',hash(packed)],['REGISTRY_RAW_SHA256',hash(raw)]]){const edit=literal(driver,name,value);driver=edit.rule.apply(driver);edits.push({file:'isolated-project-driver.mjs',before:edit.before,after:edit.after});}
      for(const [name,value] of [['SOURCE_HEAD',registry.sourceHead],['REGISTRY_RAW_SHA256',hash(raw)],['DRIVER_SHA256',hash(Buffer.from(driver))]]){const edit=literal(parent,name,value);parent=edit.rule.apply(parent);edits.push({file:'isolated-project-batch.mjs',before:edit.before,after:edit.after});}
      let reverseDriver=driver,reverseParent=parent;for(let at=edits.length-1;at>=0;at--){const edit=edits[at];if(edit.file==='isolated-project-driver.mjs')reverseDriver=reverseDriver.replace(edit.after,edit.before);else reverseParent=reverseParent.replace(edit.after,edit.before);}if(reverseDriver!==driverBefore||reverseParent!==parentBefore)throw Error('complete source pin undo failed');return {driverBefore,parentBefore,reverseDriver,reverseParent};
    }}]}]);
  const result=pipeline.run(null);fs.mkdirSync(output,{mode:0o700});
  const created=fs.lstatSync(output);if(!created.isDirectory()||created.isSymbolicLink()||fs.realpathSync(output)!==outputPhysical||!disjoint(root,fs.realpathSync(output))||fs.realpathSync(root)!==root||!sameDirectory(rootIdentity,fs.lstatSync(root)))throw Error('physical proposal destination changed');
  // Root-controlled proposal I/O, not an atomic hostile-filesystem theorem.
  // Rejoin the created directory before any wx writes, including normal aliases.
  if(!sameDirectory(created,fs.lstatSync(output))||fs.realpathSync(output)!==outputPhysical)throw Error('created proposal directory identity changed');
  for(const [name,bytes] of [['manifest.json.gz',packed],['manifest.json',raw],['isolated-project-driver.mjs',driver],['isolated-project-batch.mjs',parent],['driver-before.mjs',result.value.driverBefore],['parent-before.mjs',result.value.parentBefore]])fs.writeFileSync(join(output,name),bytes,{flag:'wx'});
  const receipt={schema:'isolated-project-compiler-proposal-v1',sourceHead:registry.sourceHead,files:registry.files,totalBytes:registry.totalBytes,rawBytes:raw.length,rawSha256:hash(raw),gzipBytes:packed.length,gzipSha256:hash(packed),driverSha256:hash(Buffer.from(driver)),parentSha256:hash(Buffer.from(parent)),edits,completeUndo:true,trace:result.trace,authority:{semantic:false,owner:false,runtime:false}};fs.writeFileSync(join(output,'proposal.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),options={};for(let at=0;at<args.length;at+=2){const key=args[at],value=args[at+1];if(!['--root','--revision','--output'].includes(key)||!value||Object.hasOwn(options,key.slice(2)))throw Error('usage: --root ORIGINAL --revision COMMIT --output FRESH_PROPOSAL');options[key.slice(2)]=value;}
  console.log(JSON.stringify(prepareIsolatedProjectCompiler(options)));
}

// Exact existing selector, shared only with the portable test-data producer.
export {selected as isIsolatedCompilerSourcePath};
