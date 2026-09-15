# Failing remote-deploy candidate

This image provides liveness but deliberately omits Router's catalog routes.
It exercises the failure boundary after candidate startup but before cutover.

Tag the working image used as the baseline, then point a test deployment's
target build path at this directory:

```sh
docker tag <working-image> link-assistant-router:issue-579-e2e
router deploy --server <target> \
  --build "$PWD/experiments/remote-deploy-failing-candidate"
```

The command must fail verification. The previous backend must remain selected
by the relay and continue serving on the same published port.
