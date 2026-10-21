// Fresh operational DATA only. Nothing here issues compiler/source ownership.
import {readSelectedGitSizeRecords} from './selected-git-size-records.mjs';
import {constants,lstatSync,fstatSync,openSync,closeSync,readFileSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {STATIC_SOURCE_LIFECYCLE_LIMITS as LIMITS} from './prepare-real-source-fixtures.mjs';

const fail=message=>{throw new TypeError('Strict static source universe: '+message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const git=(root,args,options={})=>execFileSync('/usr/bin/git',['-C',root,...args],{timeout:30000,maxBuffer:LIMITS.sourceBytes+8*1024*1024,...options});
export const isStaticSourceUniversePath=path=>typeof path==='string'&&(path.endsWith('.rs')||['Cargo.toml','rust/Cargo.toml','Cargo.lock'].includes(path));
function text(bytes){const value=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);if(!Buffer.from(value).equals(bytes))fail('lossless UTF8 required');return value;}
function safe(path){if(typeof path!=='string'||!path||path.length>4096||path.startsWith('/')||/[\\:\0\r\n]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('safe complete repository-relative path required');return path;}
function identity(stat){const result={};for(const name of ['dev','ino','mode','nlink','uid','gid','size','mtimeNs','ctimeNs'])result[name]=String(stat[name]);return result;}
function head(root,expected){const value=text(git(root,['rev-parse','--verify','HEAD^{commit}'])).trim();if(!/^[a-f0-9]{40}$/u.test(expected)||value!==expected)fail('exact current full Git HEAD required');return value;}
function inventory(root,expectedHead){
 head(root,expectedHead);const entries=[];
 for(const record of readSelectedGitSizeRecords({revision:expectedHead,run:(args,options)=>git(root,args,options),select:isStaticSourceUniversePath,maxPaths:LIMITS.paths,maxFileBytes:LIMITS.fileBytes,maxTotalBytes:LIMITS.sourceBytes})){
  const at=record.indexOf('\t'),path=record.slice(at+1);if(!isStaticSourceUniversePath(path))continue;
  safe(path);const fields=record.slice(0,at).trim().split(/\s+/u),bytes=Number(fields[3]);
  if(at<0||fields.length!==4||!['100644','100755'].includes(fields[0])||fields[1]!=='blob'||!/^[a-f0-9]{40}$/u.test(fields[2])||!Number.isSafeInteger(bytes)||bytes<0||bytes>LIMITS.fileBytes)fail('complete regular HEAD Rust/Cargo row required');
  entries.push({path,gitMode:fields[0],gitBlob:fields[2],bytes});
 }
 entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(!entries.some(row=>row.path.endsWith('.rs'))||['Cargo.toml','rust/Cargo.toml','Cargo.lock'].some(path=>!entries.some(row=>row.path===path)))fail('complete current Rust and three Cargo inputs required');
 if(!entries.length||entries.length>LIMITS.paths||new Set(entries.map(row=>row.path)).size!==entries.length||entries.reduce((sum,row)=>sum+row.bytes,0)>LIMITS.sourceBytes)fail('complete original source census bound');
 const indexed=[];
 for(const record of text(git(root,['ls-files','--stage','-z'])).split('\0').filter(Boolean)){
  const at=record.indexOf('\t'),path=record.slice(at+1);if(!isStaticSourceUniversePath(path))continue;safe(path);const fields=record.slice(0,at).split(' ');
  if(at<0||fields.length!==3||fields[2]!=='0')fail('unmerged or malformed current source index');
  indexed.push({path,gitMode:fields[0],gitBlob:fields[1]});
 }
 indexed.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(!equal(indexed,entries.map(({path,gitMode,gitBlob})=>({path,gitMode,gitBlob}))))fail('current source index differs from complete HEAD universe');
 const extra=text(git(root,['ls-files','--others','--exclude-standard','-z'])).split('\0').filter(path=>path&&isStaticSourceUniversePath(path));
 if(extra.length)fail('untracked extra Rust/Cargo source input: '+safe(extra[0]));return entries;
}
function parents(root,path,table){
 let current=root;for(const part of ['',...safe(path).split('/').slice(0,-1)]){
  if(part)current=join(current,part);const stat=lstatSync(current,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('physical source directory required');
  const row={path:current,identity:identity(stat)},previous=table.get(current);if(previous&&!equal(previous,row))fail('source directory identity changed');table.set(current,row);
 }
}
function preflight(root,rows){
 const directories=new Map(),files=[];
 for(const row of rows){parents(root,row.path,directories);const stat=lstatSync(resolve(root,row.path),{bigint:true});
  if(!stat.isFile()||stat.isSymbolicLink()||Number(stat.size)!==row.bytes)fail('complete regular physical source required: '+row.path);
  const mode=Number(stat.mode)&0o111?'100755':'100644';if(mode!==row.gitMode)fail('current physical executable mode differs: '+row.path);
  files.push({...row,identity:identity(stat)});
 }
 return {files,directories:[...directories.values()]};
}
function read(row,root){
 if(!Number.isInteger(constants.O_NOFOLLOW))fail('native no-follow file open required');const path=resolve(root,row.path),fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const before=fstatSync(fd,{bigint:true});if(!before.isFile()||!equal(identity(before),row.identity))fail('physical source identity changed before read');const bytes=readFileSync(fd),after=fstatSync(fd,{bigint:true});
  if(bytes.length!==row.bytes||!equal(identity(before),identity(after))||!equal(identity(lstatSync(path,{bigint:true})),row.identity))fail('physical source changed during read');return bytes;
 }finally{closeSync(fd);}
}
function stable(root,rows,directories){
 for(const row of rows)if(!equal(identity(lstatSync(resolve(root,row.path),{bigint:true})),row.identity))fail('physical source identity changed before return');
 for(const row of directories)if(!equal(identity(lstatSync(row.path,{bigint:true})),row.identity))fail('source directory identity changed before return');
}
export function captureStaticSourceUniverse({root,expectedHead}={}){
 root=realpathSync(resolve(root));const rows=inventory(root,expectedHead),checked=preflight(root,rows);
 // Complete physical preflight precedes the first body read. There is no Git
 // fallback for a missing physical path in this explicit contract.
 const raw=git(root,['cat-file','--batch'],{input:rows.map(row=>expectedHead+':'+row.path+'\n').join('')}),files=[];let at=0;
 for(const row of checked.files){const end=raw.indexOf(10,at);if(end<at)fail('complete current Git batch header required');const fields=raw.subarray(at,end).toString('ascii').split(' ');at=end+1;
  if(fields.length!==3||fields[0]!==row.gitBlob||fields[1]!=='blob'||Number(fields[2])!==row.bytes)fail('complete current Git batch row differs');const original=raw.subarray(at,at+row.bytes);at+=row.bytes;
  if(original.length!==row.bytes||raw[at++]!==10||blob(original)!==row.gitBlob)fail('complete current Git body differs');const physical=read(row,root);
  if(!physical.equals(original))fail('physical/current Git source differs: '+row.path);files.push({...row,sourceId:hash(physical),source:text(physical)});
 }
 if(at!==raw.length)fail('extra current Git batch bytes');
 const after=inventory(root,expectedHead);if(!equal(after,rows))fail('complete source membership changed before return');stable(root,checked.files,checked.directories);
 return {schema:'strict-static-source-universe-DATA-v1',root,head:expectedHead,files,directories:checked.directories,sourceSetSha256:hash(JSON.stringify(staticSourceUniverseRows({files}))),sourceAuthority:false,semanticAuthority:false};
}
export function staticSourceUniverseRows(snapshot){return snapshot.files.map(({path,gitBlob,bytes,sourceId})=>({path,gitBlob,bytes,sourceId}));}
export function assertStaticSourceUniverse(snapshot){
 if(snapshot?.schema!=='strict-static-source-universe-DATA-v1')fail('complete fresh source snapshot required');const actual=captureStaticSourceUniverse({root:snapshot.root,expectedHead:snapshot.head});
 if(!equal(actual,snapshot))fail('complete physical/Git source universe or identity changed');return actual;
}
export function captureStaticFixtureAsset({root,head:expectedHead,path,limit=LIMITS.outputBytes}={}){
 root=realpathSync(root);safe(path);head(root,expectedHead);const listing=text(git(root,['ls-tree','-l','-z',expectedHead,'--',path])).split('\0').filter(Boolean);if(listing.length!==1)fail('one original fixture/support Git asset required');
 const tab=listing[0].indexOf('\t'),fields=listing[0].slice(0,tab).trim().split(/\s+/u);if(listing[0].slice(tab+1)!==path||fields.length!==4||!['100644','100755'].includes(fields[0])||fields[1]!=='blob'||!Number.isSafeInteger(Number(fields[3]))||Number(fields[3])>limit)fail('regular bounded fixture/support Git asset required');
 const indexed=text(git(root,['ls-files','--stage','-z','--',path]));if(indexed!==fields[0]+' '+fields[2]+' 0\t'+path+'\0')fail('fixture/support index differs from current Git');const checked=preflight(root,[{path,gitMode:fields[0],gitBlob:fields[2],bytes:Number(fields[3])}]),bytes=read(checked.files[0],root),original=git(root,['show',expectedHead+':'+path],{maxBuffer:limit+1024});
 if(!bytes.equals(original)||blob(bytes)!==fields[2])fail('complete physical/Git fixture asset differs');stable(root,checked.files,checked.directories);head(root,expectedHead);
 return {...checked.files[0],content:bytes.toString('base64'),sha256:hash(bytes),encoding:'base64',directories:checked.directories};
}
