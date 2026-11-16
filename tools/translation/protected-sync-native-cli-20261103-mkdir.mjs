// Fixed original nonrecursive mkdir primitive; no policy parsing or authority.
import {mkdirSync,realpathSync,statSync} from 'node:fs';
import {dirname,basename,resolve,isAbsolute,sep} from 'node:path';
import {withProtectedNativeSourceAdmission,mutateProtectedNativeAbsoluteEntries} from './protected-native-writers-20261102.mjs';
// Keep the original raw spelling at the actual FS call. In particular, native
// symlink/.. traversal may differ from the later lexical resolve(raw,filename).
function parentIdentity(path){const stat=statSync(path,{bigint:true});if(!stat.isDirectory())throw new TypeError('Raw CLI parent must be an actual directory');return [stat.dev,stat.ino,stat.mode].map(value=>value.toString()).join(':');}
export function createProtectedRawCliDirectory(root,raw){
 const captured=withProtectedNativeSourceAdmission(root,()=>{
  if(typeof raw!=='string')throw new TypeError('Primitive original CLI directory required');
  const cwd=process.cwd(),absolute=isAbsolute(raw)?raw:cwd+sep+raw;
  const leaf=basename(absolute),parent=raw===''?null:realpathSync(dirname(absolute));
  return {cwd,parent,identity:parent===null?null:parentIdentity(parent),target:parent===null?null:resolve(parent,leaf)};
 });
 const check=()=>withProtectedNativeSourceAdmission(root,()=>{
  if(process.cwd()!==captured.cwd||captured.parent!==null&&realpathSync(dirname(isAbsolute(raw)?raw:captured.cwd+sep+raw))!==captured.parent||captured.parent!==null&&parentIdentity(captured.parent)!==captured.identity)throw new TypeError('Raw CLI directory source/parent changed before mutation');
 });
 // Empty path cannot create an entry; preserve the original mkdir error and
 // syscall/path rather than turning it into the captured cwd directory.
 return mutateProtectedNativeAbsoluteEntries(root,captured.target===null?[]:[captured.target],()=>{
  check();let failed=false,primary,result;
  try{result=mkdirSync(raw,{recursive:false});}catch(error){failed=true;primary=error;}
  try{check();}catch(error){if(!failed){failed=true;primary=error;}else try{process.stderr.write('{"schema":"protected-raw-cli-directory-closing-20261103","closingFailed":true}\n');}catch{}}
  if(failed)throw primary;return result;
 });
}
