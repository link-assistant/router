---
bump: patch
---

### Fixed
- A backfilled release page no longer takes the "Latest" marker from the version that actually is latest. GitHub derives that marker from publication time, so a page created late for an older version becomes "Latest" and every tool asking for the newest release gets the wrong one — v0.116.0, backfilled after v0.118.0 had shipped, did exactly that. Backfills now send `make_latest: false`; a release published on time still leaves the marker to GitHub.
- The release-provenance audit resolves the newest *version* rather than the most recently published release. A backfilled page legitimately carries no binary assets, because the artifact jobs ran for whichever version was being released at the time, so auditing it reported a failure that described nothing wrong with the release it was really about.
