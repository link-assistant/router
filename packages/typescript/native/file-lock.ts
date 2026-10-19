// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=76e7ce0a0ae0febefe9aed1f72fefce17f6790dc6ff6fd457970545e363305bc; dynamic any annotations are explicit draft gaps.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
const helper: string = (String as any).raw `
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
export function rustLockPath(path?: any): string {
    const extension: string = extname(path);
    return `${extension ? (path.slice as any)(0, -extension.length) : path}.lock`;
}
async function acquire(path: any, { shared, timeout, python }: any): Promise<any> {
    const child: any = spawn(python, ['-u', '-c', helper, path, shared ? 'shared' : 'exclusive', String(timeout)], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    child.stdin.on('error', (): void => { });
    let diagnostic: any = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk?: any): void => { (diagnostic as any) = (diagnostic + chunk).slice(-4096); });
    const closed: any = new (Promise as any)((resolve?: any): any => child.once('close', (code?: any, signal?: any): void => resolve({ code, signal })));
    try {
        await new (Promise as any)((resolve?: any, reject?: any): void => {
            let buffer: any = '';
            const timer: any = setTimeout((): void => { child.kill(); reject(new (Error as any)('Timed out acquiring advisory file lock')); }, timeout + 2000);
            const fail: any = (error?: any): void => { clearTimeout(timer); reject(error); };
            child.once('error', fail);
            child.once('exit', (code?: any): void => { clearTimeout(timer); reject(new (Error as any)(`Advisory lock helper exited (${code}): ${diagnostic}`)); });
            child.stdout.setEncoding('utf8');
            child.stdout.on('data', (chunk?: any): void => {
                (buffer as any) += chunk;
                if (buffer === 'locked\n') {
                    clearTimeout(timer);
                    child.removeListener('error', fail);
                    resolve();
                }
                else if (buffer.length > 1024)
                    fail(new (Error as any)('Invalid advisory lock handshake'));
            });
        });
        return { child, closed };
    }
    catch (error: any) {
        child.kill();
        await closed;
        throw error;
    }
}
export async function withAdvisoryFileLock(path?: any, operation?: any, { shared = false, timeout = 30000, python = (process as any).env.ROUTER_LOCK_PYTHON }: any = {}): Promise<any> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    let held: any;
    const commands: Array<string> = python ? [python] : (process as any).platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
    for (const command of commands as any) {
        try {
            (held as any) = await acquire(path, { shared, timeout, python: command });
            break;
        }
        catch (error: any) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
    if (!held)
        throw (Object as any).assign(new (Error as any)('Advisory file locking requires Python 3; configure ROUTER_LOCK_PYTHON'), { code: 'lock_adapter_unavailable' });
    try {
        return await operation();
    }
    finally {
        held.child.stdin.end();
        const timer: any = setTimeout((): any => (held as any).child.kill(), 2000);
        try {
            await held.closed;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
