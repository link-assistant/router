#!/usr/bin/env python3
"""Execute the actual remote agent's pre-mutation name boundary with finite inputs."""
from pathlib import Path
import shlex
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT/'src/deploy/remote_agent.sh').read_text().split('case "$PUBLIC_NAME"', 1)[0]
cookie = str(uuid.uuid4())
with tempfile.TemporaryDirectory(prefix='issue-715-remote-') as temporary:
    marker = Path(temporary)/'mutation'
    for instance, nonce, accepted in [
        *[("a"*length, cookie, True) for length in range(1, 33)],
        ('', cookie, True), ('a'*33, cookie, False), ('-bad', cookie, False),
        ('bad-', cookie, False), ('bad.upper', cookie, False),
        ('valid', 'a'*80, False),
    ]:
        script = source.replace('@@DEPLOY_SETTINGS@@', 'INSTANCE='+shlex.quote(instance))
        script += '\nprintf "%s\\n" "$CANDIDATE"\ntouch '+shlex.quote(str(marker))+'\n'
        result = subprocess.run(['sh', '-s', '--', 'deploy', nonce, '1.18.2', 'fixture',
                                 '', '', temporary, '8080', '18080', 'fixture.test'],
                                input=script, capture_output=True, text=True)
        assert (result.returncode == 0) == accepted, result.stderr
        assert marker.exists() == accepted, 'refused name crossed the mutation boundary'
        if accepted:
            name = result.stdout.strip()
            assert len(name) <= 63 and name.endswith(cookie), name
            marker.unlink()
    print('Remote agent: all accepted lengths fit DNS; invalid names/cookies stop before mutation')
