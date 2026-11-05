// Appended to a complete copy of the original adapter by source substitutions.
// Its private helpers remain the original functions in that copied module.
export const FILESYSTEM_EFFECT_RUNTIME_ADDITIONS=String.raw`

// GENERATED: additive filesystem operations; original adapter prefix retained.
function filesystemByteVector(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Filesystem read adapter must return bytes');
  return ok(Object.freeze(Array.from(bytes,value=>BigInt(value))));
}
const filesystemDeferredOperations=Object.freeze({tokio_fs_read_to_string,tokio_fs_write,tokio_fs_create_dir_all,tokio_fs_remove_file,tokio_fs_read,tokio_fs_rename,tokio_fs_create_dir,tokio_fs_remove_dir,tokio_fs_remove_dir_all,tokio_fs_hard_link});
export function deferFilesystemEffect(id,args,capability) {
  if(typeof id!=='string'||!Object.hasOwn(filesystemDeferredOperations,id)||!Array.isArray(args))throw new TypeError('A declared asynchronous filesystem operation and argument array are required');
  const count=id==='tokio_fs_write'||id==='tokio_fs_rename'||id==='tokio_fs_hard_link'?2:1;
  if(args.length!==count)throw new TypeError('Filesystem future argument count differs');
  const copied=[];for(let at=0;at<count;at++){if(!Object.hasOwn(args,at))throw new TypeError('Filesystem future arguments must be dense');copied.push(requireString(args[at]));}
  const operation=filesystemDeferredOperations[id];return ml_router_future(()=>operation(...copied,capability));
}
export function deferFilesystemFlow(operation) {
  if(typeof operation!=='function')throw new TypeError('Filesystem flow requires a deferred operation');
  return ml_router_future(operation);
}
function filesystemPaths(values) {
  for (const value of values) { const invalid=checkPath(value); if(invalid)return invalid; }
  return null;
}
export function std_fs_read(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const read=method(capability,false,'readFileSync');return performSync(()=>filesystemByteVector(read(path)),true);
}
export async function tokio_fs_read(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const read=method(capability,true,'readFile');return performAsync(async()=>filesystemByteVector(await read(path)),true);
}
export function std_fs_rename(from,to,capability) {
  const invalid=filesystemPaths([from,to]);if(invalid)return invalid;
  const rename=method(capability,false,'renameSync');return performSync(()=>{rename(from,to);return ok(UNIT);});
}
export async function tokio_fs_rename(from,to,capability) {
  const invalid=filesystemPaths([from,to]);if(invalid)return invalid;
  const rename=method(capability,true,'rename');return performAsync(async()=>{await rename(from,to);return ok(UNIT);});
}
export function std_fs_create_dir(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const create=method(capability,false,'mkdirSync');return performSync(()=>{create(path);return ok(UNIT);});
}
export async function tokio_fs_create_dir(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const create=method(capability,true,'mkdir');return performAsync(async()=>{await create(path);return ok(UNIT);});
}
export function std_fs_remove_dir(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const remove=method(capability,false,'rmdirSync');return performSync(()=>{remove(path);return ok(UNIT);});
}
export async function tokio_fs_remove_dir(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const remove=method(capability,true,'rmdir');return performAsync(async()=>{await remove(path);return ok(UNIT);});
}
export function std_fs_remove_dir_all(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const status=method(capability,false,'lstatSync'),remove=method(capability,false,'rmSync');
  return performSync(()=>{const invalid=filesystemDirectoryRoot(status(path));if(invalid)return invalid;remove(path,{recursive:true,force:false,maxRetries:0});return ok(UNIT);});
}
export async function tokio_fs_remove_dir_all(path,capability) {
  const invalid=checkPath(path);if(invalid)return invalid;
  const status=method(capability,true,'lstat'),remove=method(capability,true,'rm');
  return performAsync(async()=>{const invalid=filesystemDirectoryRoot(await status(path));if(invalid)return invalid;await remove(path,{recursive:true,force:false,maxRetries:0});return ok(UNIT);});
}
function filesystemDirectoryRoot(status) {
  if(!status||typeof status.isDirectory!=='function'||typeof status.isSymbolicLink!=='function')throw new TypeError('Filesystem lstat adapter must return file-kind methods');
  const directory=status.isDirectory(),link=status.isSymbolicLink();
  if(typeof directory!=='boolean'||typeof link!=='boolean')throw new TypeError('Filesystem lstat kind must be boolean');
  return directory||link?null:err(systemError({code:'ENOTDIR',message:'Path is not a directory'}));
}
export function std_fs_hard_link(from,to,capability) {
  const invalid=filesystemPaths([from,to]);if(invalid)return invalid;
  const link=method(capability,false,'linkSync');return performSync(()=>{link(from,to);return ok(UNIT);});
}
export async function tokio_fs_hard_link(from,to,capability) {
  const invalid=filesystemPaths([from,to]);if(invalid)return invalid;
  const link=method(capability,true,'link');return performAsync(async()=>{await link(from,to);return ok(UNIT);});
}
`;
