# link-assistant-router

Official Python 3.10+ operations and fixtures, with generated type stubs and strict versioned JSON validation.

```python
from link_assistant_router import Router
result = Router().tokens.list()
print(result['data'])
```

Supply secrets through `env` or `stdin`. `ROUTER_BIN` or PATH selects an installed binary; versions must match unless explicitly allowed. Downloads verify checksums and tag-bound GitHub attestations. `RouterError` exposes the exit status, stderr and structured report. `deadline` bounds child execution.

See the [integration guide](https://github.com/link-assistant/router/blob/main/docs/integration/downstream.md) and `link_assistant_router.testing`.
