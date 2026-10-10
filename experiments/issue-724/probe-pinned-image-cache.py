#!/usr/bin/env python3
"""Check a public cache for exact pinned manifests without pulling layers."""
import hashlib
import json
import resource
import urllib.error
import urllib.request
from pathlib import Path
import re

resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024,) * 2)
root = Path(__file__).resolve().parents[2]
images = []
for source in (root / "Dockerfile", root / "docker/tunnel/Dockerfile"):
    for image in re.findall(r"^FROM (\S+@sha256:[a-f0-9]{64})", source.read_text(), re.M):
        name, digest = image.split("@")
        repository = name.rsplit(":", 1)[0]
        if "/" not in repository:
            repository = "library/" + repository
        images.append((repository, digest))
accept = ", ".join([
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
])
unique_images = dict.fromkeys(images)
assert unique_images, "no pinned images found"
successes = 0
for repository, digest in unique_images:
    url = f"https://mirror.gcr.io/v2/{repository}/manifests/{digest}"
    request = urllib.request.Request(url, headers={"Accept": accept})
    try:
        with urllib.request.urlopen(request) as response:
            body = response.read(1024 * 1024 + 1)
            assert len(body) <= 1024 * 1024, "manifest exceeds bounded probe size"
            measured = "sha256:" + hashlib.sha256(body).hexdigest()
            assert measured == digest, (measured, digest)
            manifest = json.loads(body)
            print(repository, response.status, measured, manifest.get("mediaType"), flush=True)
            successes += 1
    except urllib.error.HTTPError as error:
        print(repository, error.code, error.read(1024).decode(errors="replace"), flush=True)
    except Exception as error:
        print(repository, type(error).__name__, str(error), flush=True)
print(f"Exact cached manifests: {successes}/{len(unique_images)}", flush=True)
raise SystemExit(0 if successes == len(unique_images) else 1)
