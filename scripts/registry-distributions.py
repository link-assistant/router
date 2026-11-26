#!/usr/bin/env python3
"""Fail-closed exact distribution probes for publication and immutable retries.

A missing exact version permits publishing the attested asset. Network/auth
errors and a different distribution for the same version never do. After
publication, verify all registry bytes, then ordinary exact-version installs
and imports, before any stable promotion.

Python assets are selected by exact distribution name, so the
`.publish.attestation` sidecars the PyPI publish action writes into the same
directory never count as distributions (issue #806).
"""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
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


NPM_PACKAGE_URL = "https://registry.npmjs.org/@link-assistant%2frouter"


class NpmBootstrapRequired(RuntimeError):
    """The package has never been published and no bootstrap token exists.

    npm Trusted Publishing can only be configured for a package that already
    exists, so the first publication needs a human-approved credential
    (issue #805). Fail before `npm publish` with the actions to take instead of
    npm's generic ENEEDAUTH.
    """


def npm_bootstrap_message(version, source_run, repository):
    asset = f"link-assistant-router-{version}.tgz"
    run = source_run or "<tagged release run id>"
    return (
        "@link-assistant/router has never been published to npm, and the repository secret NPM_TOKEN is empty. "
        "npm Trusted Publishing (OIDC) cannot be configured until the package exists, so this first publication "
        "needs a human-approved credential (see docs/ci-cd/registry-publishers.md, issue #805). Do ONE of: "
        "(a) add an npm granular access token with read and write permission for the @link-assistant scope "
        f"as the repository secret NPM_TOKEN, then retry the existing release without rebuilding it: "
        f"gh workflow run release.yml --repo {repository} --ref main -f release_mode=retry-registries "
        f"-f release_version={version} -f source_run={run} -f bump_type=patch; or "
        f"(b) as an npm owner of @link-assistant, run scripts/bootstrap-npm-package.sh {version} --publish "
        f"to publish the attested GitHub asset {asset} after npm login with MFA, then rerun the retry command. "
        "Afterwards add the npm trusted publisher (organization link-assistant, repository router, "
        "workflow release.yml, no environment), publish the next release through OIDC within npm's validation "
        "window and revoke NPM_TOKEN."
    )


def npm_publish_preflight(version, token_configured, source_run="", repository="link-assistant/router", load=metadata):
    """Return whether the package exists; raise when no credential can create it."""
    exists = load(NPM_PACKAGE_URL) is not None
    if not exists and not token_configured:
        raise NpmBootstrapRequired(npm_bootstrap_message(version, source_run, repository))
    return exists


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


# Every distribution format PyPI accepts or has accepted. Anything else in the
# directory, such as the `.publish.attestation` files pypa/gh-action-pypi-publish
# writes beside each uploaded file, is a sidecar and never a distribution.
DISTRIBUTION_SUFFIXES = (".whl", ".tar.gz", ".zip", ".tar.bz2", ".tar.xz", ".tgz", ".egg", ".exe", ".msi", ".rpm", ".dmg")


def python_distribution_assets(directory, version):
    """Return exactly the attested wheel and sdist, ignoring publication sidecars.

    pypa/gh-action-pypi-publish writes `<distribution>.publish.attestation`
    files next to the uploaded distributions (issues #805 and #806), so a broad
    `link_assistant_router-<version>*` glob is not the distribution set.

    Fails closed when the wheel or sdist is missing, or when any other
    distribution (another wheel, another version, another format) is present,
    because the PyPI publish action uploads every distribution in the directory.
    """
    distributions = sorted(path for path in directory.iterdir()
                           if path.is_file() and path.name.endswith(DISTRIBUTION_SUFFIXES))
    prefix = f"link_assistant_router-{version}"
    wheels = [path for path in distributions if path.name.startswith(f"{prefix}-") and path.name.endswith(".whl")]
    sdists = [path for path in distributions if path.name == f"{prefix}.tar.gz"]
    if len(wheels) != 1 or len(sdists) != 1 or len(distributions) != 2:
        names = ", ".join(path.name for path in distributions) or "none"
        raise ValueError(f"expected the exact attested Python wheel and sdist, found: {names}")
    return [*wheels, *sdists]


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
    parser.add_argument("--publish-preflight", action="store_true",
                        help="npm only: fail with bootstrap instructions when the package does not exist and NPM_TOKEN is empty")
    args = parser.parse_args()
    if args.publish_preflight:
        if args.kind != "npm":
            parser.error("--publish-preflight applies to npm only")
        try:
            exists = npm_publish_preflight(
                args.version,
                os.environ.get("NPM_TOKEN_CONFIGURED") == "true",
                os.environ.get("SOURCE_RUN") or os.environ.get("GITHUB_RUN_ID", ""),
                os.environ.get("GITHUB_REPOSITORY") or "link-assistant/router",
            )
        except NpmBootstrapRequired as error:
            print(f"::error title=npm first-publish bootstrap required (issue #805)::{error}")
            sys.exit(1)
        print("Package exists; npm publishes through the trusted publisher (OIDC)." if exists
              else "Package is new; publishing with the approved NPM_TOKEN bootstrap credential.")
        return
    if args.kind == "npm":
        exists = npm_identity(args.version, args.assets / f"link-assistant-router-{args.version}.tgz")
    else:
        exists = python_identity(args.version, python_distribution_assets(args.assets, args.version))
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
