#!/usr/bin/env python3
"""Force a recycled readiness port in the real redirect regression fixture.

The bounded probe preserves the redirect assertion and HTTP implementation.
It simulates another thread binding the selected port before the child can,
and records whether unexpected connections are health probes or redirects.
"""
import argparse
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'target/issue-715-readiness'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', action='store_true', help='reproduce the pre-fix fixture')
args = parser.parse_args()
source = (subprocess.check_output(['git', 'show', '800b803:tests/upstream_resilience_test.rs'],
                                 cwd=ROOT, text=True) if args.baseline else
          (ROOT / 'tests/upstream_resilience_test.rs').read_text())
label = 'before' if args.baseline else 'after'
source += '\nstatic FORCED_PORT: std::sync::atomic::AtomicU16 = std::sync::atomic::AtomicU16::new(0);\n'
target = source.index('fn spawn_redirect_target()')
split = source.index('let hits =', target)
source = source[:split] + 'FORCED_PORT.store(port, Ordering::SeqCst);\n    ' + source[split:]
source = source.replace('let port = free_port();', '''let forced = FORCED_PORT.swap(0, Ordering::SeqCst);
        let port = if forced == 0 { free_port() } else { forced };''')
source = source.replace('drop(stream);', '''if let Ok(mut stream) = stream {
                stream.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
                eprintln!("target received: {}", read_request(&mut stream));
            }''')
probe = OUT / 'probe.rs'
probe.write_text(source)
dependencies = ROOT / 'target/debug/deps'
def library(name):
    return max(dependencies.glob(f'lib{name}-*.rlib'), key=lambda p: p.stat().st_mtime)

command = ['rustc', '--test', '--edition=2024', '-C', 'debuginfo=0',
           '-C', 'codegen-units=1024', '-L', f'dependency={dependencies}']
for name in ['link_assistant_router', 'tempfile']:
    command += ['--extern', f'{name}={library(name)}']
command += [str(probe), '-o', str(OUT / 'probe')]
environment = {**os.environ, 'CARGO_BIN_EXE_link-assistant-router': str(ROOT / 'target/debug/link-assistant-router')}
with (ROOT / f'ci-logs/readiness-race-{label}-build.log').open('w') as log:
    subprocess.run(command, cwd=ROOT, env=environment, stdout=log, stderr=log, check=True)
with (ROOT / f'ci-logs/readiness-race-{label}.log').open('w') as log:
    result = subprocess.run([str(OUT / 'probe'), 'an_api_key_provider_redirect_is_not_followed',
                             '--exact', '--nocapture'], cwd=ROOT, env=environment,
                            stdout=log, stderr=log)
output = (ROOT / f'ci-logs/readiness-race-{label}.log').read_text()
if args.baseline:
    assert result.returncode != 0 and 'GET /api/health HTTP/1.1' in output, output
    assert 'the redirect target was reached' in output, output
    print('Original redirect assertion fails on readiness probes without a followed redirect')
else:
    assert result.returncode == 0 and 'target received:' not in output, output
    print('Child-bound ephemeral listener avoids the recycled-port probe entirely')
