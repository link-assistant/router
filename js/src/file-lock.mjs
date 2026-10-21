import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';

// Node has no advisory-lock API. This bounded standard-library OS adapter
// holds exactly the flock/LockFileEx lock used by std::fs::File::lock. No Rust
// executable, native build, private lock format or package install is involved.
const helper = String.raw`
import os,sys,time
path,mode,timeout=sys.argv[1:]
fd=os.open(path,os.O_RDWR|os.O_CREAT,0o600)
if os.name!='nt':
 import fcntl
 os.fchmod(fd,0o600)
 def take(): fcntl.flock(fd,(fcntl.LOCK_SH if mode=='shared' else fcntl.LOCK_EX)|fcntl.LOCK_NB)
else:
 import ctypes,msvcrt
 from ctypes import wintypes
 class OVERLAPPED(ctypes.Structure):
  _fields_=[('Internal',ctypes.c_size_t),('InternalHigh',ctypes.c_size_t),('Offset',wintypes.DWORD),('OffsetHigh',wintypes.DWORD),('hEvent',wintypes.HANDLE)]
 kernel=ctypes.WinDLL('kernel32',use_last_error=True)
 kernel.LockFileEx.argtypes=[wintypes.HANDLE,wintypes.DWORD,wintypes.DWORD,wintypes.DWORD,wintypes.DWORD,ctypes.POINTER(OVERLAPPED)]
 kernel.LockFileEx.restype=wintypes.BOOL
 handle=msvcrt.get_osfhandle(fd); overlap=OVERLAPPED()
 def take():
  if not kernel.LockFileEx(handle,1|(2 if mode=='exclusive' else 0),0,0xffffffff,0xffffffff,ctypes.byref(overlap)):
   code=ctypes.get_last_error()
   if code==33: raise BlockingIOError('lock held')
   raise ctypes.WinError(code)
end=time.monotonic()+float(timeout)/1000
while True:
 try: take(); break
 except BlockingIOError:
  if time.monotonic()>=end: raise TimeoutError('advisory lock timeout')
  time.sleep(.02)
sys.stdout.write('locked\n');sys.stdout.flush()
sys.stdin.buffer.read()
os.close(fd)
`;
export function rustLockPath(path) {
  const extension = extname(path);
  return `${extension ? path.slice(0,-extension.length) : path}.lock`;
}
async function acquire(path,{shared,timeout,python}) {
  const child = spawn(python,['-u','-c',helper,path,shared ? 'shared' : 'exclusive',String(timeout)],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  child.stdin.on('error',() => {});
  let diagnostic = '';
  child.stderr.setEncoding('utf8'); child.stderr.on('data',chunk => { diagnostic = (diagnostic+chunk).slice(-4096); });
  const closed = new Promise(resolve => child.once('close',(code,signal) => resolve({code,signal})));
  try {
    await new Promise((resolve,reject) => {
      let buffer = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('Timed out acquiring advisory file lock')); },timeout+2000);
      const fail = error => { clearTimeout(timer); reject(error); };
      child.once('error',fail);
      child.once('exit',code => { clearTimeout(timer); reject(new Error(`Advisory lock helper exited (${code}): ${diagnostic}`)); });
      child.stdout.setEncoding('utf8'); child.stdout.on('data',chunk => {
        buffer += chunk;
        if (buffer === 'locked\n') { clearTimeout(timer); child.removeListener('error',fail); resolve(); }
        else if (buffer.length > 1024) fail(new Error('Invalid advisory lock handshake'));
      });
    });
    return {child,closed};
  } catch (error) { child.kill(); await closed; throw error; }
}
/** A shared OS lock makes mixed JavaScript/Rust store transactions serialize. */
export async function withAdvisoryFileLock(path,operation,{shared = false,timeout = 30000,python = process.env.ROUTER_LOCK_PYTHON} = {}) {
  await mkdir(dirname(path),{recursive:true,mode:0o700});
  let held;
  const commands = python ? [python] : process.platform === 'win32' ? ['python','python3'] : ['python3','python'];
  for (const command of commands) {
    try { held = await acquire(path,{shared,timeout,python:command}); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!held) throw Object.assign(new Error('Advisory file locking requires Python 3; configure ROUTER_LOCK_PYTHON'),{code:'lock_adapter_unavailable'});
  try { return await operation(); }
  finally {
    held.child.stdin.end();
    const timer = setTimeout(() => held.child.kill(),2000);
    try { await held.closed; } finally { clearTimeout(timer); }
  }
}
