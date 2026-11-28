"""Check the Linux SSH test fixture against a held writable descriptor."""

import errno
import os
from pathlib import Path
import subprocess
import tempfile


root = Path(__file__).resolve().parents[2]
fixture = root / 'rust/tests/fixtures/fake-ssh.sh'

with tempfile.TemporaryDirectory() as directory:
    stub = Path(directory) / 'ssh'
    stub.write_text('#!/bin/sh\nexit 0\n')
    stub.chmod(0o700)

    # Linux refuses to execute a file that another process can still write.
    with stub.open('ab'):
        try:
            subprocess.run([stub], stdin=subprocess.DEVNULL, check=True)
        except OSError as error:
            assert error.errno == errno.ETXTBSY, error
        else:
            raise AssertionError('the old fixture should fail with ETXTBSY')

    stub.unlink()
    stub.symlink_to(fixture)
    arguments = ['-o', 'BatchMode=yes', 'deploy@example.test', 'remote status']
    payload = b'\nagent\n'
    body = stub.with_suffix('.body')
    environment = {**os.environ, 'PATH': os.pathsep.join((directory, os.defpath))}
    for status in (0, 9, 255):
        body.write_text(f'exit {status}\n')
        with body.open('ab'):
            for executable in (str(stub), 'ssh'):
                result = subprocess.run(
                    [executable, *arguments], input=payload, env=environment, check=False
                )
                assert result.returncode == status
                assert stub.with_suffix('.arguments').read_text().splitlines() == arguments
                assert stub.with_suffix('.input').read_bytes() == payload

print('The shared SSH fixture preserves argv, stdin and exit status while its body is open for writing.')
