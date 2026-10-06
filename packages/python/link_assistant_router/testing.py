"""Isolated downstream fixtures; no personal vendor credentials are required."""
from __future__ import annotations
import json
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from . import Router, RouterError, run_process, _validate


def temporary_home():
    temporary = tempfile.TemporaryDirectory(prefix='router-home-')
    home = Path(temporary.name)
    env = {'HOME':str(home),'USERPROFILE':str(home),'XDG_CONFIG_HOME':str(home/'.config'),
           'XDG_DATA_HOME':str(home/'.local/share'),'XDG_CACHE_HOME':str(home/'.cache'),
           'CODEX_HOME':str(home/'.codex'),'CLAUDE_CONFIG_DIR':str(home/'.claude'),'DATA_DIR':str(home/'router-data')}
    return SimpleNamespace(home=home, env=env, close=temporary.cleanup)


def mock_upstream(handler=None):
    requests = []
    def default(request):
        body = {'object':'list','data':[{'id':'fixture-model','object':'model','owned_by':'fixture'}]} if request['path'].endswith('/models') else {'id':'fixture-completion','object':'chat.completion','model':'fixture-model','choices':[{'index':0,'message':{'role':'assistant','content':'fixture answer'},'finish_reason':'stop'}],'usage':{'prompt_tokens':1,'completion_tokens':1,'total_tokens':2}}
        return {'status':200,'body':body}
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self): self.respond()
        def do_POST(self): self.respond()
        def log_message(self, *_): pass
        def respond(self):
            length=int(self.headers.get('Content-Length','0'))
            if length>1_048_576: self.send_error(413); return
            raw=self.rfile.read(length)
            record={'method':self.command,'path':self.path,'body':json.loads(raw) if raw else None}
            requests.append(record)
            try: result=(handler or default)(record)
            except Exception: self.send_error(500); return
            body=result['body']; payload=(body if isinstance(body,str) else json.dumps(body)).encode()
            self.send_response(result.get('status',200)); self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(payload))); self.end_headers(); self.wfile.write(payload)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler); server.daemon_threads=True
    thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    def close(): server.shutdown(); server.server_close(); thread.join()
    return SimpleNamespace(origin=f'http://127.0.0.1:{server.server_port}', requests=requests, close=close)


def vendor_stub(*, name='codex', version='0.158.0', output='fixture answer', exit_code=0):
    import re
    if not re.fullmatch('[a-z][a-z0-9-]*',name): raise RouterError('Invalid stub executable name',code='options')
    temporary=tempfile.TemporaryDirectory(prefix='router-vendor-'); directory=Path(temporary.name)
    binary=directory/name
    import sys
    binary.write_text(f'#!{sys.executable}\nimport sys\nif "--version" in sys.argv:\n print({version!r}); sys.exit(0)\nprint({output!r}); sys.exit({int(exit_code)})\n')
    binary.chmod(0o755)
    return SimpleNamespace(binary=binary,directory=directory,env={'PATH':str(directory)+os.pathsep+os.environ.get('PATH','')},close=temporary.cleanup)


def verify_contracts(*, router=None, areas=(), linux=False, repository=None, output=None,
                     client_versions='installed', deadline=3600, require_parity=False, env=None):
    repository=Path(repository or Path.cwd())
    args=[argument for area in areas for argument in ['--area',area]]
    if require_parity: args.append('--require-parity')
    if not linux:
        if output: args.extend(['--output',str(Path(output).resolve())])
        return (router or Router(cwd=repository)).verify(arguments=args,deadline=deadline,env=env,cwd=repository)['data']
    code,_,stderr=run_process('bash',[str(repository/'scripts/verify-contracts-in-linux.sh'),'--client-versions',client_versions,*args],env=env,deadline=deadline,cwd=repository)
    try: result=json.loads((repository/'target/verification-linux/result.json').read_text())
    except (OSError,ValueError) as error: raise RouterError('Linux verifier produced no result.json',code='schema',exit_code=code,stderr=stderr) from error
    _validate('verify', {'schema':'link-assistant-router/verify/v1','operation':'verify','success':code==0,'exit_code':code,'data':result,'diagnostics':[]},code,stderr)
    if code: raise RouterError('Linux verification failed',exit_code=code,stderr=stderr,result=result)
    return result
