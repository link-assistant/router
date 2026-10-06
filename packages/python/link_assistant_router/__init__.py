"""Official operations transport; Rust owns every operational decision."""
from __future__ import annotations
import hashlib
import json
import keyword
import math
import os
import shutil
import signal
import subprocess
import tarfile
import tempfile
import threading
import time
import urllib.request
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Mapping, TypedDict
from jsonschema import Draft202012Validator

ROOT = Path(__file__).parent
catalog = json.loads((ROOT / 'catalog.json').read_text())
__version__: str = catalog['version']
operation_names: tuple[str, ...] = tuple(op['name'] for op in catalog['operations'])
_validators: dict[str, Draft202012Validator] = {}


class OperationResult(TypedDict):
    schema: str
    operation: str
    success: bool
    exit_code: int
    data: Any
    diagnostics: list[str]


class RouterError(RuntimeError):
    """An operation, deadline, version, or schema failure with complete evidence."""
    def __init__(self, message: str, *, code: str = 'operation', exit_code: int | None = None,
                 stderr: str = '', result: OperationResult | None = None):
        super().__init__(message)
        self.code, self.exit_code, self.stderr, self.result = code, exit_code, stderr, result


def _terminate(process: subprocess.Popen) -> None:
    try:
        if os.name == 'posix': os.killpg(process.pid, signal.SIGKILL)
        else: process.kill()
    except ProcessLookupError: pass


def run_process(binary: str, args: list[str], *, env: Mapping[str, str] | None = None,
                stdin: str | bytes | None = None, deadline: float = 60,
                cwd: str | Path | None = None, max_output_bytes: int = 8_388_608) -> tuple[int, str, str]:
    """Finite subprocess with process-group cleanup and bounded output."""
    if not math.isfinite(deadline) or not deadline > 0: raise RouterError('deadline must be positive', code='options')
    try:
        process = subprocess.Popen([binary, *args], env={**os.environ, **(env or {})}, cwd=cwd,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   start_new_session=os.name == 'posix')
    except OSError as error:
        raise RouterError(f'Cannot execute {binary}: {error}', code='spawn') from error
    buffers = [bytearray(), bytearray()]
    failure: list[RouterError] = []
    lock = threading.Lock()
    def read(stream, index):
        while chunk := stream.read(65536):
            with lock:
                if sum(map(len, buffers)) + len(chunk) > max_output_bytes:
                    failure.append(RouterError('Router output exceeds limit', code='output-limit'))
                    _terminate(process); break
                buffers[index].extend(chunk)
        stream.close()
    readers = [threading.Thread(target=read, args=(stream, index), daemon=True)
               for index, stream in enumerate([process.stdout, process.stderr])]
    for reader in readers: reader.start()
    def write():
        try: process.stdin.write(stdin.encode() if isinstance(stdin, str) else stdin or b'')
        except BrokenPipeError: pass
        finally: process.stdin.close()
    writer = threading.Thread(target=write, daemon=True); writer.start()
    try: process.wait(timeout=deadline)
    except subprocess.TimeoutExpired:
        failure.append(RouterError('Router deadline exceeded', code='deadline'))
    finally:
        _terminate(process); process.wait()
        for reader in readers: reader.join(timeout=1)
        writer.join(timeout=1)
    stdout, stderr = [bytes(buffer).decode(errors='replace') for buffer in buffers]
    if failure:
        error = failure[0]; error.exit_code, error.stderr = process.returncode, stderr
        raise error
    return process.returncode, stdout, stderr


def _validator(operation: str) -> Draft202012Validator:
    if operation not in _validators:
        schema = json.loads((ROOT / 'schemas' / (operation.replace('.', '-') + '.v1.json')).read_text())
        Draft202012Validator.check_schema(schema)
        _validators[operation] = Draft202012Validator(schema)
    return _validators[operation]


def _validate(operation: str, result: Any, exit_code: int, stderr: str) -> OperationResult:
    selected = 'cli-error' if isinstance(result, dict) and result.get('operation') == 'cli-error' else operation
    errors = list(_validator(selected).iter_errors(result))
    if errors: raise RouterError(f'Invalid {operation} response: {errors[0].message}', code='schema', exit_code=exit_code, stderr=stderr, result=result)
    if result['exit_code'] != exit_code: raise RouterError('Exit status disagrees with result', code='schema', exit_code=exit_code, result=result, stderr=stderr)
    if selected == 'cli-error' or not result['success']: raise RouterError('; '.join(result['diagnostics']) or operation + ' failed', exit_code=exit_code, result=result, stderr='\n'.join([stderr, *result['diagnostics']]))
    return result


def _download_binary(cache: Path, deadline: float) -> str:
    import platform
    system = {'Linux': 'linux', 'Darwin': 'darwin'}.get(platform.system())
    arch = {'x86_64': 'amd64', 'AMD64': 'amd64', 'aarch64': 'arm64', 'arm64': 'arm64'}.get(platform.machine())
    if not system or not arch: raise RouterError('No verified asset for this platform; set ROUTER_BIN', code='platform')
    destination = cache / __version__ / f'{system}-{arch}' / 'router'
    try:
        receipt = json.loads(destination.with_suffix('.verified.json').read_text())
        if receipt['version'] == __version__ and receipt['sha256'] == hashlib.sha256(destination.read_bytes()).hexdigest(): return str(destination)
    except (OSError, ValueError, KeyError): pass
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='router-download-') as temporary:
        work = Path(temporary)
        asset = f'link-assistant-router-{__version__}-{system}-{arch}.tar.gz'
        checksum = asset.replace('.tar.gz', '.sha256')
        for name in [asset, checksum]:
            url = f'https://github.com/link-assistant/router/releases/download/v{__version__}/{name}'
            try:
                with urllib.request.urlopen(url, timeout=deadline) as response, (work / name).open('wb') as target:
                    total = 0
                    while chunk := response.read(65536):
                        total += len(chunk)
                        if total > 150_000_000: raise RouterError('Release download exceeds limit', code='download')
                        target.write(chunk)
            except OSError as error: raise RouterError(f'Download failed: {name}', code='download') from error
        entries = [line.split() for line in (work / checksum).read_text().splitlines()]
        digest = next((parts[0] for parts in entries if len(parts) == 2 and parts[1].lstrip('*') == asset), None)
        if digest != hashlib.sha256((work / asset).read_bytes()).hexdigest(): raise RouterError('Release checksum mismatch', code='checksum')
        code, _, stderr = run_process('gh', ['attestation', 'verify', str(work / asset), '--repo', 'link-assistant/router', '--source-ref', f'refs/tags/v{__version__}'], deadline=deadline)
        if code: raise RouterError('Release attestation verification failed', code='attestation', exit_code=code, stderr=stderr)
        with tarfile.open(work / asset) as archive:
            member = next((entry for entry in archive if entry.name.lstrip('./') == 'router'), None)
            if member is None or not member.isfile(): raise RouterError('No regular router binary in release', code='download')
            source = archive.extractfile(member)
            descriptor, temporary_binary = tempfile.mkstemp(prefix='router-staging-', dir=destination.parent)
            os.close(descriptor); staging = Path(temporary_binary)
            with staging.open('wb') as target: shutil.copyfileobj(source, target)
            staging.chmod(0o755); staging.replace(destination)
        destination.with_suffix('.verified.json').write_text(json.dumps({'version':__version__, 'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}))
    return str(destination)


def resolve_binary(*, binary: str | None = None, allow_download: bool = True,
                   allow_version_mismatch: bool = False, env: Mapping[str, str] | None = None,
                   deadline: float = 60, cache_dir: str | Path | None = None) -> str:
    candidate = binary or (env or {}).get('ROUTER_BIN') or os.environ.get('ROUTER_BIN') or 'router'
    candidate = shutil.which(candidate, path=(env or {}).get('PATH', os.environ.get('PATH', ''))) or candidate
    try: code, stdout, stderr = run_process(candidate, ['version', '--json'], env=env, deadline=deadline)
    except RouterError as error:
        if binary or (env or {}).get('ROUTER_BIN') or os.environ.get('ROUTER_BIN') or not allow_download or not isinstance(error.__cause__, FileNotFoundError): raise
        candidate = _download_binary(Path(cache_dir or Path.home() / '.cache/link-assistant-router'), deadline)
        code, stdout, stderr = run_process(candidate, ['version', '--json'], env=env, deadline=deadline)
    try: result = json.loads(stdout)
    except ValueError as error: raise RouterError('Binary does not implement version JSON', code='version', stderr=stderr) from error
    result = _validate('version', result, code, stderr)
    if not allow_version_mismatch and result['data']['version'] != __version__:
        raise RouterError(f"Package {__version__} cannot use binary {result['data']['version']}; opt in with allow_version_mismatch", code='version', result=result)
    return candidate


class Router:
    """All catalog operations, e.g. router.tokens.issue(ttl_hours=24, env=...)."""
    def __init__(self, *, binary: str | None = None, env: Mapping[str, str] | None = None,
                 deadline: float = 60, allow_download: bool = True, allow_version_mismatch: bool = False,
                 cache_dir: str | Path | None = None, cwd: str | Path | None = None):
        self._binary: str | None = None
        self._settings = dict(binary=binary, env=env, deadline=deadline, allow_download=allow_download,
                              allow_version_mismatch=allow_version_mismatch, cache_dir=cache_dir)
        self._cwd = cwd
        for operation in catalog['operations']:
            namespace = self
            names = [name.replace('-', '_') + ('_' if keyword.iskeyword(name.replace('-', '_')) else '') for name in operation['name'].split('.')]
            for name in names[:-1]:
                if not hasattr(namespace, name): setattr(namespace, name, SimpleNamespace())
                namespace = getattr(namespace, name)
            def call(_operation=operation['name'], **options): return self.invoke(_operation, **options)
            setattr(namespace, names[-1], call)

    def invoke(self, operation_name: str, /, *, env: Mapping[str, str] | None = None, stdin: str | bytes | None = None,
               deadline: float | None = None, cwd: str | Path | None = None, options: Mapping[str, Any] | None = None, **arguments: Any) -> OperationResult:
        name = operation_name
        operation = next((operation for operation in catalog['operations'] if operation['name'] == name), None)
        if operation is None: raise RouterError(f'Unknown operation: {name}', code='options')
        allowed = {option['name']:option for option in operation['options']}
        flags, positional = [], []
        for key, value in {**(options or {}), **arguments}.items():
            if value is None: continue
            option = allowed.get(key)
            if option is None: raise RouterError(f'Unknown {name} option: {key}', code='options')
            if option['secret']: raise RouterError(f'{key} is secret; use env or stdin transport', code='secret-argv')
            values = value if isinstance(value, (list, tuple)) else [value]
            if option['positional']: positional.append((operation['options'].index(option), [str(item) for item in values]))
            elif option['boolean']:
                if value is True: flags.append('--' + option['flag'])
                elif value is not False: raise RouterError(f'{key} must be boolean', code='options')
            else:
                for item in values: flags.extend(['--' + option['flag'], str(item)])
        args = [*operation['command'], '--json', *flags]
        for _, values in sorted(positional): args.extend(values)
        settings = {**self._settings, 'env':{**(self._settings['env'] or {}), **(env or {})}}
        if deadline is not None: settings['deadline'] = deadline
        if self._binary is None: self._binary = resolve_binary(**settings)
        code, stdout, stderr = run_process(self._binary, args, env=settings['env'], stdin=stdin, deadline=settings['deadline'], cwd=cwd if cwd is not None else self._cwd)
        try: result = json.loads(stdout)
        except ValueError as error: raise RouterError(f'Invalid JSON from {name}', code='schema', exit_code=code, stderr=stderr) from error
        return _validate(name, result, code, stderr)

    def deploy_status(self, **options: Any) -> OperationResult:
        """Read deployment status through the canonical deploy operation."""
        return self.invoke('deploy', status=True, **options)


def create_router(**options: Any) -> Router:
    return Router(**options)
