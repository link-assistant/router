# Synchronous transaction provider SOURCE. No local interpreter execution.
# Existing product dependency: configured Python3, fcntl or ctypes/kernel32.
# No shell, Rust executable, package install, expiry lockfile or new ABI.
import sys, os, json, stat, time, errno

MAX_REQUEST = 16 * 1024 * 1024
MAX_RECORD = 2 * 1024 * 1024

class NativeOther(Exception):
    pass

def close_ignored(fd):
    if fd is not None:
        try:
            os.close(fd)
        except OSError:
            pass  # std::fs::File's destructor ignores close errors.

def reject_symlink(path, family):
    try:
        info = os.lstat(path)
    except FileNotFoundError:
        return
    if stat.S_ISLNK(info.st_mode):
        raise NativeOther('launcher log destination must not be a symlink' if family == 'launcher' else 'operational log paths must not be symlinks')

def private_file(path, family):
    reject_symlink(path, family)
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        if os.name != 'nt':
            os.fchmod(fd, 0o600)
        return fd
    except BaseException:
        close_ignored(fd)
        raise

def create_directories(path):
    # Unlike os.makedirs(mode), Rust DirBuilder applies the chosen mode to
    # EVERY newly created ancestor. Existing ancestors remain unchanged.
    missing = []
    cursor = path
    while True:
        try:
            os.mkdir(cursor, 0o700)
            break
        except FileExistsError:
            if os.path.isdir(cursor):
                break
            raise
        except FileNotFoundError:
            parent = os.path.dirname(cursor)
            if parent == cursor or not parent:
                raise
            missing.append(cursor)
            cursor = parent
    for entry in reversed(missing):
        try:
            os.mkdir(entry, 0o700)
        except FileExistsError:
            if not os.path.isdir(entry):
                raise

def initialize(directory, family):
    if family == 'launcher':
        reject_symlink(directory, family)
    create_directories(directory)
    if family != 'launcher':
        reject_symlink(directory, family)
    if os.name != 'nt':
        os.chmod(directory, 0o700)
    for name in (family + '.lock', family + '.log'):
        close_ignored(private_file(os.path.join(directory, name), family))

if os.name == 'nt':
    import ctypes, msvcrt
    from ctypes import wintypes
    class OVERLAPPED(ctypes.Structure):
        _fields_ = [('Internal', ctypes.c_size_t), ('InternalHigh', ctypes.c_size_t),
                    ('Offset', wintypes.DWORD), ('OffsetHigh', wintypes.DWORD), ('hEvent', wintypes.HANDLE)]
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.LockFileEx.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD,
                                 wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(OVERLAPPED)]
    kernel.LockFileEx.restype = wintypes.BOOL
    kernel.UnlockFile.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD, wintypes.DWORD]
    kernel.UnlockFile.restype = wintypes.BOOL
    kernel.FlushFileBuffers.argtypes = [wintypes.HANDLE]
    kernel.FlushFileBuffers.restype = wintypes.BOOL
    def take(fd):
        overlap = OVERLAPPED()
        # Blocking EXCLUSIVE, full !0/!0 range, exact fs2 0.4.3 flags.
        if not kernel.LockFileEx(msvcrt.get_osfhandle(fd), 2, 0, 0xffffffff, 0xffffffff, ctypes.byref(overlap)):
            raise ctypes.WinError(ctypes.get_last_error())
    def unlock(fd):
        if not kernel.UnlockFile(msvcrt.get_osfhandle(fd), 0, 0, 0xffffffff, 0xffffffff):
            raise ctypes.WinError(ctypes.get_last_error())
else:
    import fcntl, ctypes
    # fs2 0.4.3 invokes libc::flock once. Python's fcntl.flock retries EINTR
    # on newer interpreters, which would change observable acquisition failure.
    libc = ctypes.CDLL(None, use_errno=True)
    libc.flock.argtypes = [ctypes.c_int, ctypes.c_int]
    libc.flock.restype = ctypes.c_int
    def flock_once(fd, operation):
        if libc.flock(fd, operation) != 0:
            code = ctypes.get_errno()
            raise OSError(code, os.strerror(code))
    def take(fd):
        flock_once(fd, fcntl.LOCK_EX)
    def unlock(fd):
        flock_once(fd, fcntl.LOCK_UN)

def write_all(fd, value):
    at = 0
    while at < len(value):
        try:
            count = os.write(fd, memoryview(value)[at:])
        except InterruptedError:
            continue
        if count == 0:
            raise NativeOther('failed to write whole buffer')
        at += count

def sync_data(fd):
    # Rust1.98.1 std/sys/fs/unix.rs1338-1374, preserving cvt_r EINTR retry.
    while True:
        try:
            if sys.platform == 'darwin':
                command = getattr(fcntl, 'F_FULLFSYNC', None)
                if command is None:
                    raise NativeOther('qualified Darwin F_FULLFSYNC provider unavailable')
                fcntl.fcntl(fd, command)
            elif sys.platform.startswith(('linux', 'freebsd', 'openbsd', 'netbsd', 'cygwin')) or sys.platform in ('android', 'fuchsia', 'qnx', 'gnu'):
                if not hasattr(os, 'fdatasync'):
                    raise NativeOther('qualified fdatasync provider unavailable')
                os.fdatasync(fd)
            elif os.name == 'nt':
                # Rust1.98.1 sys/fs/windows.rs377-383 calls this exact Win32 API.
                if not kernel.FlushFileBuffers(msvcrt.get_osfhandle(fd)):
                    raise ctypes.WinError(ctypes.get_last_error())
            else:
                # Remaining non-Apple Rust unix targets use fsync.
                os.fsync(fd)
            return
        except InterruptedError:
            continue

def launcher_append(directory, value):
    lock = private_file(os.path.join(directory, 'launcher.lock'), 'launcher')
    output = None
    try:
        take(lock)
        path = os.path.join(directory, 'launcher.log')
        output = private_file(path, 'launcher')
        if os.fstat(output).st_size + len(value) > 1024 * 1024:
            close_ignored(output)
            output = None
            for number in range(5, 0, -1):
                destination = path + '.' + str(number)
                reject_symlink(destination, 'launcher')
                if os.path.exists(destination):
                    os.remove(destination)
                source = path if number == 1 else path + '.' + str(number - 1)
                reject_symlink(source, 'launcher')
                if os.path.exists(source):
                    os.rename(source, destination)
            output = private_file(path, 'launcher')
        os.lseek(output, 0, os.SEEK_END)
        write_all(output, value)
        sync_data(output)
    finally:
        close_ignored(output)
        # Original launcher releases by File drop, with no explicit unlock error.
        close_ignored(lock)

def operational_append(directory, value):
    # Descriptor3 is the parent's PERSISTENT opened lock FILE, shared through
    # documented numeric stdio. Do not reopen or rejoin its pathname per record.
    lock = 3
    info = os.fstat(lock)
    if not stat.S_ISREG(info.st_mode):
        raise NativeOther('operational lock descriptor must be an ordinary file')
    take(lock)  # A failed acquisition never runs append or unlock.
    primary = None
    output = None
    try:
        path = os.path.join(directory, 'operational.log')
        output = private_file(path, 'operational')
        if os.fstat(output).st_size + len(value) > 2 * 1024 * 1024:
            close_ignored(output)
            output = None
            try:
                os.remove(path + '.4')
            except FileNotFoundError:
                pass
            for generation in range(3, -1, -1):
                source = path if generation == 0 else path + '.' + str(generation)
                if os.path.exists(source):
                    close_ignored(private_file(source, 'operational'))
                    os.rename(source, path + '.' + str(generation + 1))
        else:
            close_ignored(output)
            output = None
        output = private_file(path, 'operational')
        os.lseek(output, 0, os.SEEK_END)
        write_all(output, value)
        sync_data(output)
    except BaseException as error:
        primary = error
    finally:
        close_ignored(output)
        try:
            unlock(lock)
        except BaseException as error:
            if primary is None:
                primary = error
    if primary is not None:
        raise primary

def fail_protocol(message):
    raise NativeOther('persistent output protocol: ' + message)

def parse_request():
    raw = sys.stdin.buffer.read(MAX_REQUEST + 1)
    if len(raw) > MAX_REQUEST:
        fail_protocol('complete request exceeds byte bound')
    request = json.loads(raw.decode('utf-8', 'strict'))
    if not isinstance(request, dict) or set(request) != {'schema', 'action', 'directory', 'record'} or request['schema'] != 'persistent-output-transaction-v1':
        fail_protocol('exact closed request required')
    if request['action'] not in ['init_launcher', 'init_operational', 'append_launcher', 'append_operational', 'prepare_operational', 'clock', 'fd_probe', 'environment', 'posix_error']:
        fail_protocol('unknown operation')
    if not isinstance(request['directory'], str) or '\0' in request['directory'] or len(request['directory'].encode('utf-8')) > 32768:
        fail_protocol('bounded scalar native directory required')
    if not isinstance(request['record'], str) or len(request['record'].encode('utf-8')) > MAX_RECORD:
        fail_protocol('bounded scalar complete record required')
    return request

def report_error(error):
    if isinstance(error, OSError):
        return {'kind': 'os', 'errno': error.errno, 'winerror': getattr(error, 'winerror', None),
                'description': error.strerror or os.strerror(error.errno), 'message': None}
    return {'kind': 'other', 'errno': None, 'winerror': None,
            'description': None, 'message': str(error)}

try:
    if sys.version_info < (3, 7):
        raise NativeOther('configured Python3.7+ provider required before effects')
    request = parse_request()
    action = request['action']
    value = None
    if action == 'environment':
        source = os.environb.items() if hasattr(os, 'environb') else os.environ.items()
        value = []
        total = 0
        encoded = 1024
        def quote_size(text):
            size = 2
            for character in text:
                point = ord(character)
                size += 2 if character in '\"\\\b\f\n\r\t' else 6 if point < 32 or 127 <= point <= 65535 else 12 if point > 65535 else 1
            return size
        for name, item in source:
            if isinstance(name, bytes):
                # This portable domain does not guess native lossy provenance.
                name = name.decode('utf-8', 'strict')
                item = item.decode('utf-8', 'strict')
            if '\ufffd' in name or '\ufffd' in item:
                fail_protocol('replacement-scalar environment remains outside qualified domain')
            size = len(name.encode('utf-8')) + len(item.encode('utf-8'))
            if size > MAX_RECORD or total + size > 8 * 1024 * 1024 or len(value) >= 65536:
                fail_protocol('complete environment exceeds explicit byte/row domain')
            encoded += quote_size(name) + quote_size(item) + 4
            if encoded > MAX_REQUEST:
                fail_protocol('complete environment encoded response exceeds byte domain')
            total += size
            value.append([name, item])
    elif action == 'posix_error':
        text = request['record']
        if os.name == 'nt' or not text.isascii() or not text.isdigit() or len(text) > 4 or not 1 <= int(text) <= 4095:
            fail_protocol('actual bounded POSIX errno required')
        value = {'kind': 'os', 'errno': int(text), 'winerror': None,
                 'description': os.strerror(int(text)), 'message': None}
    elif action == 'clock':
        nanos = time.time_ns()
        value = {'seconds': str(nanos // 1000000000), 'nanoseconds': nanos % 1000000000}
    elif action == 'fd_probe':
        info = os.fstat(3)
        value = {'device': str(info.st_dev), 'inode': str(info.st_ino), 'mode': info.st_mode}
    elif action == 'prepare_operational':
        create_directories(request['directory'])
        reject_symlink(request['directory'], 'operational')
        if os.name != 'nt':
            os.chmod(request['directory'], 0o700)
        probe = private_file(os.path.join(request['directory'], 'operational.lock'), 'operational')
        try:
            info = os.fstat(probe)
            value = {'device': str(info.st_dev), 'inode': str(info.st_ino), 'mode': info.st_mode}
        finally:
            close_ignored(probe)
    elif action == 'init_operational':
        if not stat.S_ISREG(os.fstat(3).st_mode):
            raise NativeOther('persistent operational lock must be an ordinary file')
        close_ignored(private_file(os.path.join(request['directory'], 'operational.log'), 'operational'))
    elif action == 'init_launcher':
        initialize(request['directory'], 'launcher')
    elif action == 'append_launcher':
        launcher_append(request['directory'], request['record'].encode('utf-8'))
    else:
        operational_append(request['directory'], request['record'].encode('utf-8'))
    response = {'schema': 'persistent-output-transaction-result-v1', 'ok': True, 'value': value, 'error': None, 'provider': list(sys.version_info[:3])}
except BaseException as error:
    response = {'schema': 'persistent-output-transaction-result-v1', 'ok': False, 'value': None, 'error': report_error(error), 'provider': list(sys.version_info[:3])}
sys.stdout.write(json.dumps(response, ensure_ascii=True, separators=(',', ':')) + '\n')
sys.stdout.flush()
