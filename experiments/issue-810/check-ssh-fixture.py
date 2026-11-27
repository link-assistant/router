"""Check the Linux SSH test fixture against a held writable descriptor."""

import ast
import errno
from pathlib import Path
import re
import subprocess
import tempfile


root = Path(__file__).resolve().parents[2]
source = (root / 'rust/src/deploy_remote.rs').read_text()
fixture = source.split('fn fake_ssh(', 1)[1].split('    #[cfg(unix)]', 1)[0]
literal = re.search(r'\.arg\(format!\(\s*("[^"\\]*(?:\\.[^"\\]*)*")', fixture)
assert literal is not None, 'could not find the shell program in the SSH fixture'
script = ast.literal_eval(literal.group(1))

with tempfile.TemporaryDirectory() as directory:
    stub = Path(directory) / 'ssh'
    stub.write_text('#!/bin/sh\n' + script.format(exit=0))
    stub.chmod(0o700)

    # Linux refuses to execute a file that another process can still write.
    with stub.open('ab'):
        try:
            subprocess.run([stub], stdin=subprocess.DEVNULL, check=True)
        except OSError as error:
            assert error.errno == errno.ETXTBSY, error
        else:
            raise AssertionError('the old fixture should fail with ETXTBSY')

        arguments = ['-o', 'BatchMode=yes', 'deploy@example.test', 'remote status']
        payload = b'\nagent\n'
        for status in (0, 9, 255):
            result = subprocess.run(
                ['/bin/sh', '-c', script.format(exit=status), stub, *arguments],
                input=payload,
                check=False,
            )
            assert result.returncode == status
            assert stub.with_suffix('.arguments').read_text().splitlines() == arguments
            assert stub.with_suffix('.input').read_bytes() == payload

print('The shell fixture preserves argv, stdin and exit status with a writable descriptor held.')
