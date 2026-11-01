// Native loader origin filesystem DATA only. This helper issues no compiler,
// native, source/type/owner token. Only the original loader's private getter
// can associate this DATA with its genuine freshly captured compiler object.
import fs from 'node:fs';
import {resolve,dirname,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {forwardFailureField} from './forward-output-ownership-20261101-failure.mjs';
const MiB=1024*1024,need=(yes,message)=>{if(!yes)throw TypeError('Actual native compiler origin DATA: '+message);};
const same=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>same(value,b[index]));
const identity=(stat,complete=true)=>(complete?[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs]:[stat.dev,stat.ino,stat.mode]).map(value=>{need(typeof value==='bigint','precise original source identity/time required');return value.toString();});
function present(path){try{return fs.lstatSync(path,{bigint:true});}catch(error){if(forwardFailureField(error,'code')==='ENOENT')return null;throw error;}}
const below=(base,path)=>{const name=relative(base,path);return name===''||name!=='..'&&!name.startsWith('..'+sep)&&!isAbsolute(name);};
function ancestorRows(path){const rows=[];let current=dirname(path);for(;;){const stat=fs.lstatSync(current,{bigint:true});need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary actual physical compiler ancestor required');rows.push({path:current,identity:identity(stat)});const next=dirname(current);if(next===current)break;current=next;}return rows;}
function cohort(packageRoot){
 const files=[],directories=[],pending=[packageRoot];let total=0;
 while(pending.length){const path=pending.pop(),before=fs.lstatSync(path,{bigint:true});need(before.isDirectory()&&!before.isSymbolicLink(),'ordinary installed compiler directory required');const names=fs.readdirSync(path).sort();need(same(identity(before),identity(fs.lstatSync(path,{bigint:true}))),'actual compiler directory changed during full census');directories.push({path,identity:identity(before),names});
  for(const name of names){const full=join(path,name),stat=fs.lstatSync(full,{bigint:true});need(!stat.isSymbolicLink(),'linked installed compiler member refused');if(stat.isDirectory())pending.push(full);else{need(stat.isFile()&&stat.size<=32n*BigInt(MiB)&&files.length<512,'original installed compiler file/count bound');total+=Number(stat.size);need(total<=64*MiB,'original installed compiler cohort byte bound');files.push({path:full,identity:identity(stat),bytes:Number(stat.size)});}}
 }
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);directories.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);return {files,directories,totalBytes:total};
}
function optionalSelector(path){const stat=present(path);if(stat===null)return {path,present:false,identity:null};need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=32n*BigInt(MiB),'ordinary actual loader package selector required');return {path,present:true,identity:identity(stat)};}
export function captureOwnershipRuntimeOriginBefore(sourceRoot,resolvedFilename,packageJsonFilename){
 need(typeof sourceRoot==='string'&&typeof resolvedFilename==='string'&&isAbsolute(resolvedFilename)&&typeof packageJsonFilename==='string'&&isAbsolute(packageJsonFilename),'actual private resolver filenames required');const entry=fs.realpathSync(resolvedFilename),packageJson=fs.realpathSync(packageJsonFilename),packageRoot=dirname(packageJson),original=cohort(packageRoot),file=original.files.find(row=>row.path===entry);need(file&&below(packageRoot,entry)&&original.files.some(row=>row.path===packageJson),'actual CJS entry and package selector must belong to complete original compiler cohort');
 const sourceAnchor=join(sourceRoot,'js/package.json'),selectorRoot=/^file:/iu.test(sourceAnchor)?dirname(dirname(fileURLToPath(sourceAnchor))):resolve(sourceRoot),selectors=[optionalSelector(join(selectorRoot,'js/package.json')),optionalSelector(join(selectorRoot,'package.json'))],result={schema:'actual-private-native-compiler-origin-data-20261101',sourceRoot,selectorRoot,resolvedFilename,entryPhysicalPath:entry,packageJsonFilename,packageJsonPhysicalPath:packageJson,packageRoot,...original,ancestors:ancestorRows(entry),selectors,sourceAuthority:false,semanticAuthority:false};verifyOwnershipRuntimeOriginLoadWindow(result);return result;
}
function check(result,loadWindow){
 need(fs.realpathSync(result.resolvedFilename)===result.entryPhysicalPath&&fs.realpathSync(result.packageJsonFilename)===result.packageJsonPhysicalPath,'actual native resolver physical selection changed');
 for(const row of result.files){const stat=fs.lstatSync(row.path,{bigint:true});need(stat.isFile()&&!stat.isSymbolicLink()&&same(identity(stat),row.identity),'actual loaded compiler source identity/time changed');}
 for(const row of result.directories){const stat=fs.lstatSync(row.path,{bigint:true});need(stat.isDirectory()&&!stat.isSymbolicLink()&&same(identity(stat),row.identity)&&same(fs.readdirSync(row.path).sort(),row.names)&&same(identity(stat),identity(fs.lstatSync(row.path,{bigint:true}))),'complete actual compiler cohort directory changed');}
 for(const row of result.ancestors){const stat=fs.lstatSync(row.path,{bigint:true});need(stat.isDirectory()&&!stat.isSymbolicLink()&&same(identity(stat,loadWindow),loadWindow?row.identity:row.identity.slice(0,3)),'actual compiler ancestor namespace identity changed');}
 if(loadWindow)for(const row of result.selectors){const now=optionalSelector(row.path);need(now.present===row.present&&same(now.identity,row.identity),'actual original require package-input selection changed');}
}
export function verifyOwnershipRuntimeOriginLoadWindow(result){check(result,true);}
export function verifyOwnershipRuntimeOriginCurrent(result){
 // An authenticated ancestor can gain unrelated output directory entries after
 // loading. Its dev/inode/mode stays fixed; the actual package cohort retains
 // its complete original directory times/names and file times/identities.
 check(result,false);
}
export function detachOwnershipRuntimeOriginData(result){
 const pair=row=>Object.freeze({...row,identity:row.identity?Object.freeze([...row.identity]):null,...(row.names?{names:Object.freeze([...row.names])}:{})});return Object.freeze({...result,files:Object.freeze(result.files.map(pair)),directories:Object.freeze(result.directories.map(pair)),ancestors:Object.freeze(result.ancestors.map(pair)),selectors:Object.freeze(result.selectors.map(pair))});
}

// Current optional package/receiving-selector DATA. The original require does
// not demand another receiving node_modules installation. Complete bytes of
// present package inputs and exact absence of missing ones close separately.
export function captureOwnershipRuntimeSelectors(paths,roots){
 const anchors=roots.map(root=>resolve(root)),parents=new Map(),outside=new Map(),links=new Map(),rows=[];let released=false,total=0;
 const addParents=path=>{
  let spelling=dirname(path);for(;;){const stat=present(spelling);if(stat){if(stat.isSymbolicLink())links.set(spelling,{path:spelling,identity:identity(stat),target:fs.readlinkSync(spelling)});const physical=fs.realpathSync(spelling),actual=fs.lstatSync(physical,{bigint:true});need(actual.isDirectory()&&!actual.isSymbolicLink(),'ordinary physical loader-selector ancestor required');if(anchors.some(anchor=>below(anchor,spelling))){if(!parents.has(physical))parents.set(physical,{path:physical,spelling,identity:identity(actual)});}else if(!outside.has(physical))outside.set(physical,{path:physical,spelling,identity:identity(actual,false)});}const next=dirname(spelling);if(next===spelling)break;spelling=next;}
 };
 const close=(run,checks)=>{let value,failed=false,primary;try{value=run();}catch(error){failed=true;primary=error;}for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return value;};
 const read=path=>{
  const stat=present(path);if(stat===null)return {path,missing:true,bytes:0,chunks:null,physical:null,identity:null};need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=32n*BigInt(MiB),'original32MiB regular loader package input required');const physical=fs.realpathSync(path),before=fs.lstatSync(physical,{bigint:true});need(same(identity(before),identity(stat)),'loader-selector physical identity differs');checkBoundedSourcePath(physical);const fd=fs.openSync(physical,boundedSourceReadOpenFlags());
  return close(()=>{need(same(identity(fs.fstatSync(fd,{bigint:true})),identity(before)),'loader-selector replaced on open');const chunks=[];let position=0;while(position<Number(before.size)){const bytes=Buffer.alloc(Math.min(65536,Number(before.size)-position));let at=0;while(at<bytes.length){const count=fs.readSync(fd,bytes,at,bytes.length-at,position+at);need(count>0,'loader-selector truncated');at+=count;}chunks.push(bytes);position+=bytes.length;}need(fs.readSync(fd,Buffer.alloc(1),0,1,position)===0,'loader-selector grew');return {path,physical,missing:false,chunks,bytes:position,identity:identity(before)};},[()=>need(same(identity(fs.fstatSync(fd,{bigint:true})),identity(before))&&same(identity(fs.lstatSync(path,{bigint:true})),identity(before))&&fs.realpathSync(path)===physical,'loader-selector changed during complete read'),()=>fs.closeSync(fd)]);
 };
 for(const path of [...new Set(paths.map(path=>resolve(path)))]){addParents(path);const row=read(path);rows.push(row);total+=row.bytes;}
 const verify=()=>{need(!released,'live loader-selector input DATA required');const checks=[];for(const row of parents.values())checks.push(()=>need(fs.realpathSync(row.spelling)===row.path&&same(identity(fs.lstatSync(row.path,{bigint:true})),row.identity),'loader-selector ancestor changed'));for(const row of outside.values())checks.push(()=>need(fs.realpathSync(row.spelling)===row.path&&same(identity(fs.lstatSync(row.path,{bigint:true}),false),row.identity),'outer loader-selector ancestor identity/mode changed'));for(const row of links.values())checks.push(()=>need(same(identity(fs.lstatSync(row.path,{bigint:true})),row.identity)&&fs.readlinkSync(row.path)===row.target,'actual loader selector alias changed'));for(const row of rows)checks.push(()=>{const current=read(row.path);need(current.missing===row.missing&&current.physical===row.physical&&same(current.identity,row.identity)&&current.bytes===row.bytes,'current loader package selector changed');if(!row.missing)need(current.chunks.length===row.chunks.length&&current.chunks.every((chunk,index)=>chunk.equals(row.chunks[index])),'complete loader package selector bytes changed');});close(()=>{},checks);};
 try{verify();}catch(error){for(const row of rows)if(row.chunks)row.chunks.length=0;throw error;}
 return Object.freeze({parents:[...parents.values()],retainedRawByteOccurrences:total,verify,release(){released=true;for(const row of rows)if(row.chunks)row.chunks.length=0;rows.length=0;parents.clear();outside.clear();links.clear();}});
}
import {boundedSourceReadOpenFlags,checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
