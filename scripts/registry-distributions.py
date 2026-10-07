#!/usr/bin/env python3
"""Fail-closed exact distribution probes for publication and immutable retries.

A missing exact version permits publishing the attested asset. Network/auth
errors and a different distribution for the same version never do. After
publication, verify all registry bytes, then ordinary exact-version installs
and imports, before any stable promotion.
"""

import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.error
import urllib.request


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "router-release-verification"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def metadata(url):
    try:
        return json.loads(fetch(url))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def npm_identity(version, asset, load=metadata, download=fetch):
    record = load(f"https://registry.npmjs.org/@link-assistant%2frouter/{version}")
    if record is None:
        return False
    if record.get("name") != "@link-assistant/router" or record.get("version") != version:
        raise ValueError("npm returned the wrong package identity")
    actual = download(record["dist"]["tarball"])
    expected = asset.read_bytes()
    if actual != expected:
        raise ValueError("npm exact-version tarball differs from the attested GitHub asset")
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(expected).digest()).decode()
    if record["dist"].get("integrity") != integrity:
        raise ValueError("npm metadata integrity differs from the attested asset")
    return True


def python_identity(version, assets, load=metadata, download=fetch):
    record = load(f"https://pypi.org/pypi/link-assistant-router/{version}/json")
    if record is None:
        return False
    if record["info"]["version"] != version or record["info"]["name"].replace("_", "-") != "link-assistant-router":
        raise ValueError("PyPI returned the wrong package identity")
    urls = {item["filename"]: item for item in record["urls"]}
    if set(urls) != {asset.name for asset in assets}:
        raise ValueError("PyPI distribution set differs from the attested wheel and sdist")
    for asset in assets:
        item = urls[asset.name]
        if item.get("yanked"):
            raise ValueError("PyPI exact-version distribution is yanked")
        expected = asset.read_bytes()
        if hashlib.sha256(expected).hexdigest() != item["digests"]["sha256"] or download(item["url"]) != expected:
            raise ValueError(f"PyPI distribution differs from the attested asset: {asset.name}")
    return True


def install(kind, version, root):
    if kind == "npm":
        subprocess.run(["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund",
                        "--registry", "https://registry.npmjs.org", f"@link-assistant/router@{version}"], cwd=root, check=True)
        subprocess.run(["node", "--input-type=module", "-e", "import('@link-assistant/router').then(m => { if (!m.Router) throw new Error('Router export missing'); })"], cwd=root, check=True)
    else:
        subprocess.run(["python3", "-m", "venv", str(root / "venv")], check=True)
        python = root / "venv/bin/python"
        subprocess.run([str(python), "-m", "pip", "install", "--no-cache-dir", "--index-url", "https://pypi.org/simple", f"link-assistant-router=={version}"], check=True)
        subprocess.run([str(python), "-c", "from link_assistant_router import Router; import importlib.metadata as m; assert m.version('link-assistant-router') == " + repr(version)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["npm", "python"])
    parser.add_argument("--version", required=True)
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()
    if args.kind == "npm":
        exists = npm_identity(args.version, args.assets / f"link-assistant-router-{args.version}.tgz")
    else:
        assets = sorted(args.assets.glob(f"link_assistant_router-{args.version}*"))
        if len(assets) != 2 or not any(a.suffix == ".whl" for a in assets) or not any(a.name.endswith(".tar.gz") for a in assets):
            raise ValueError("expected the exact attested Python wheel and sdist")
        exists = python_identity(args.version, assets)
    if args.probe:
        print("present=true" if exists else "present=false")
    elif not exists:
        raise ValueError("exact version is absent from its registry after publication")
    else:
        with tempfile.TemporaryDirectory(prefix="router-registry-install-") as temporary:
            install(args.kind, args.version, Path(temporary))
        print(f"Verified registry hashes and ordinary exact-version {args.kind} install")


if __name__ == "__main__":
    main()
