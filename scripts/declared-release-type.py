#!/usr/bin/env python3
"""Allow breaking Rust API changes only when a new fragment declares major."""
import argparse
import re
import subprocess
from pathlib import Path


def release_type(base):
    paths = subprocess.check_output(
        ['git', 'diff', '--name-only', '--diff-filter=A', base, '--', 'changelog.d/'],
        text=True,
    ).splitlines()
    for path in paths:
        text = Path(path).read_text()
        frontmatter = re.match(r'\A---\s*\n(.*?)\n---', text, re.S)
        if frontmatter and re.search(r'^bump:\s*major\s*$', frontmatter[1], re.M):
            return 'major'
    return 'minor'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    print(release_type(parser.parse_args().base))
