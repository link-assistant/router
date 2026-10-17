// Generic OS adapters consumed by checked routerEffectCall semantic nodes.
import * as fsSync from 'node:fs';
import * as fsAsync from 'node:fs/promises';
import {constants as osConstants} from 'node:os';
import {AsyncLocalStorage} from 'node:async_hooks';

const scopedCapabilities = new AsyncLocalStorage();
const NONE = Object.freeze({$:'None'}),UNIT = null;
const ok = value => Object.freeze({$:'Ok',field0:value});
const err = value => Object.freeze({$:'Err',field0:value});
const some = value => Object.freeze({$:'Some',field0:value});
const scalar = value => typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
const requireString = value => {if (!scalar(value)) throw new TypeError('Effect argument is outside the checked Rust String domain');return value;};
const KINDS = Object.freeze({
  ENOENT:'NotFound',EACCES:'PermissionDenied',EPERM:'PermissionDenied',ECONNREFUSED:'ConnectionRefused',ECONNRESET:'ConnectionReset',
  EHOSTUNREACH:'HostUnreachable',ENETUNREACH:'NetworkUnreachable',ECONNABORTED:'ConnectionAborted',ENOTCONN:'NotConnected',
  EADDRINUSE:'AddrInUse',EADDRNOTAVAIL:'AddrNotAvailable',ENETDOWN:'NetworkDown',EPIPE:'BrokenPipe',EEXIST:'AlreadyExists',
  EAGAIN:'WouldBlock',EWOULDBLOCK:'WouldBlock',ENOTDIR:'NotADirectory',EISDIR:'IsADirectory',ENOTEMPTY:'DirectoryNotEmpty',
  EROFS:'ReadOnlyFilesystem',ELOOP:'FilesystemLoop',ESTALE:'StaleNetworkFileHandle',EINVAL:'InvalidInput',
  ETIMEDOUT:'TimedOut',ENOSPC:'StorageFull',ESPIPE:'NotSeekable',EDQUOT:'QuotaExceeded',EFBIG:'FileTooLarge',
  EBUSY:'ResourceBusy',ETXTBSY:'ExecutableFileBusy',EDEADLK:'Deadlock',EXDEV:'CrossesDevices',EMLINK:'TooManyLinks',
  ENAMETOOLONG:'InvalidFilename',E2BIG:'ArgumentListTooLong',EINTR:'Interrupted',ENOSYS:'Unsupported',
  EOPNOTSUPP:'Unsupported',ENOMEM:'OutOfMemory',EINPROGRESS:'InProgress',
});
// Rust classifies actual Unix errno numbers. libuv's symbolic name can differ
// when aliases share a number, and ENOTSUP is distinct on some Unix targets.
const UNIX_KINDS=new Map(Object.entries(KINDS).filter(([code])=>Number.isInteger(osConstants.errno?.[code]) && (code !== 'ENOTEMPTY' || process.platform !== 'aix')).map(([code,kind])=>[osConstants.errno[code],kind]));
export const withEffectCapabilities = (capabilities,operation) => scopedCapabilities.run(capabilities,operation);
function capabilities(explicit) {return explicit ?? scopedCapabilities.getStore() ?? {};}
function ioError(kind,message,raw = NONE) {return Object.freeze({$:'IoError',kind,message,raw_os_error:raw});}
function systemError(error) {
  if (error?.code === 'ERR_INVALID_ARG_VALUE' || error?.code === 'ERR_INVALID_ARG_TYPE') return ioError('InvalidInput',String(error.message));
  if (!error || typeof error.code !== 'string' || !/^(?:E[A-Z0-9]+|UNKNOWN)$/.test(error.code)) throw error;
  // libuv Windows errno is not the underlying Win32 code. Preserve absence
  // rather than presenting that translated value as Rust raw_os_error().
  const errno=process.platform === 'win32' ? null : osConstants.errno?.[error.code] ?? (Number.isInteger(error.errno) ? Math.abs(error.errno) : null);
  const raw=Number.isInteger(errno) && errno >= 0 && errno <= 2147483647 ? some(BigInt(errno)) : NONE;
  const kind=process.platform === 'win32'?KINDS[error.code] ?? 'Uncategorized':UNIX_KINDS.get(errno) ?? 'Uncategorized';
  return ioError(kind,String(error.message ?? error.code),raw);
}
function checkPath(path) {
  requireString(path);
  return path.includes('\0') ? err(ioError('InvalidInput','File path contains a NUL byte')) : null;
}
function method(explicit,asynchronous,name) {
  const configured=capabilities(explicit).fs;
  const adapter=configured == null ? asynchronous ? fsAsync : fsSync : configured[asynchronous ? 'async' : 'sync'];
  if (!adapter || typeof adapter[name] !== 'function') throw new TypeError(`Filesystem capability has no ${asynchronous ? 'async' : 'sync'} ${name} adapter`);
  return (...args)=>{const result=adapter[name](...args);if (!asynchronous && result && typeof result.then === 'function') throw new TypeError('A synchronous filesystem capability returned a future');return result;};
}
function readString(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Filesystem read adapter must return bytes');
  try {return ok(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));}
  catch {return err(ioError('InvalidData','Stream did not contain valid UTF-8'));}
}
function performSync(operation,retryInterrupted = false) {
  for (;;) {
    try {return operation();} catch (error) {if (retryInterrupted && error?.code === 'EINTR') continue;return err(systemError(error));}
  }
}
async function performAsync(operation,retryInterrupted = false) {
  for (;;) {
    try {return await operation();} catch (error) {if (retryInterrupted && error?.code === 'EINTR') continue;return err(systemError(error));}
  }
}
export function std_fs_read_to_string(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  const read=method(capability,false,'readFileSync');return performSync(()=>readString(read(path)),true);
}
export async function tokio_fs_read_to_string(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  const read=method(capability,true,'readFile');return performAsync(async()=>readString(await read(path)),true);
}
export function std_fs_write(path,contents,capability) {
  requireString(contents);const invalid=checkPath(path);if (invalid) return invalid;
  const write=method(capability,false,'writeFileSync');return performSync(()=>{write(path,Buffer.from(contents,'utf8'));return ok(UNIT);});
}
export async function tokio_fs_write(path,contents,capability) {
  requireString(contents);const invalid=checkPath(path);if (invalid) return invalid;
  const write=method(capability,true,'writeFile');return performAsync(async()=>{await write(path,Buffer.from(contents,'utf8'));return ok(UNIT);});
}
export function std_fs_create_dir_all(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  if (path === '') return ok(UNIT);
  const mkdir=method(capability,false,'mkdirSync');return performSync(()=>{mkdir(path,{recursive:true});return ok(UNIT);});
}
export async function tokio_fs_create_dir_all(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  if (path === '') return ok(UNIT);
  const mkdir=method(capability,true,'mkdir');return performAsync(async()=>{await mkdir(path,{recursive:true});return ok(UNIT);});
}
export function std_fs_remove_file(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  const remove=method(capability,false,'unlinkSync');return performSync(()=>{remove(path);return ok(UNIT);});
}
export async function tokio_fs_remove_file(path,capability) {
  const invalid=checkPath(path);if (invalid) return invalid;
  const remove=method(capability,true,'unlink');return performAsync(async()=>{await remove(path);return ok(UNIT);});
}
function environment(explicit) {return capabilities(explicit).environment ?? process.env;}
function missing() {return err(Object.freeze({$:'NotPresent'}));}
function nonUnicode(bytes) {return err(Object.freeze({$:'NotUnicode',field0:Object.freeze({$:'OsString',bytes:Object.freeze(Array.from(bytes,byte=>BigInt(byte)))})}));}
export function std_env_var(key,capability) {
  requireString(key);if (key.includes('=') || key.includes('\0')) return missing();
  const env=environment(capability),value=typeof env.get === 'function' ? env.get(key) : Object.hasOwn(env,key) ? env[key] : undefined;
  if (value == null) return missing();
  if (value instanceof Uint8Array) {
    try {return ok(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(value));} catch {return nonUnicode(value);}
  }
  requireString(value);return ok(value);
}
function mutableKey(key) {requireString(key);if (!key || key.includes('=') || key.includes('\0')) throw new RangeError('Rust environment mutation panics for an empty, equal-sign or NUL key');}
export function std_env_set_var(key,value,capability) {
  mutableKey(key);requireString(value);if (value.includes('\0')) throw new RangeError('Rust environment mutation panics for a NUL value');
  const env=environment(capability);if (typeof env.set === 'function') env.set(key,value);else env[key]=value;return UNIT;
}
export function std_env_remove_var(key,capability) {
  mutableKey(key);const env=environment(capability);if (typeof env.delete === 'function') env.delete(key);else delete env[key];return UNIT;
}
