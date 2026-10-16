# ActivityPub model marketplace

Router publishes model services using
[FEP-0837](https://fep.swf.pub/fep/0837/fep-0837.html). The vocabulary is
ActivityStreams, Valueflows (`https://w3id.org/valueflows/ont/vf#`) and OM2.
There are no router-specific JSON-LD fields or ForgeFed tickets.

Set `ACTIVITYPUB_ACTOR_BASE_URL=https://router.example.com` to the externally
reachable origin and `ACTIVITYPUB_PUBLIC_KEY_PEM` to the actor's public key.
The actor is `/api/services/activitypub/actor/code`.

## Discover models

With the same router bearer credential used for inference:

```sh
curl -H "Authorization: Bearer $ROUTER_TOKEN" \
  https://router.example.com/api/services/activitypub/outbox/code
```

The `OrderedCollection` contains `Create(Proposal)` activities. Each proposal
has `purpose: offer`, `attributedTo`, a title equal to the exact model ID,
`publishes: Intent`, `action: deliverService`, and a quantity of one invocation.
`unitBased: false` means each negotiation covers one invocation. Follow the
proposal's `id` to retrieve that proposal. IDs percent-encode model names,
including slashes and spaces. Only models visible in the caller's existing
OpenAI catalog are offered; authentication and entitlement errors propagate.
No credential or upstream provider URL is published.

## Negotiate

Send an `Offer(Agreement)` to `/api/services/activitypub/inbox/code`, with
`Content-Type: application/activity+json` and the same authorization header:

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", {
    "vf": "https://w3id.org/valueflows/ont/vf#",
    "om2": "http://www.ontology-of-units-of-measure.org/resource/om-2/",
    "Agreement": "vf:Agreement", "Commitment": "vf:Commitment",
    "stipulates": "vf:stipulates", "satisfies": "vf:satisfies",
    "resourceQuantity": "vf:resourceQuantity", "hasUnit": "om2:hasUnit",
    "hasNumericalValue": "om2:hasNumericalValue"
  }],
  "id": "https://consumer.example/offers/1",
  "type": "Offer",
  "actor": "https://consumer.example/actor",
  "object": {
    "type": "Agreement",
    "stipulates": {
      "type": "Commitment",
      "satisfies": "https://router.example.com/api/services/activitypub/outbox/code?model=example-model#primary",
      "resourceQuantity": {"hasUnit": "one", "hasNumericalValue": "1"}
    }
  }
}
```

Copy `satisfies` from the proposal's `publishes.id`. The response is
`Accept(Offer)` with the finalized `Agreement` in `result`, or `Reject(Offer)`
when the model is unavailable or quantities/units do not match. Finalized
agreements and commitments have global IDs. Unsupported activities return 400;
the inbox no longer pretends to accept arbitrary activities. HTTP 202 means
that negotiation was processed, not that inference ran.
Offer and actor IDs must be absolute URIs. Quantities may use JSON numbers or
numeric strings; equivalent values such as `1` and `"1.0"` are accepted and
finalized as `"1"`.

## Execute the model

FEP-0837 places the economic transaction outside the negotiation protocol.
`Accept.result.url` is a standard ActivityStreams `Link` to the router's
OpenAI Chat Completions endpoint. POST an ordinary OpenAI request to that URL:

```sh
curl -H "Authorization: Bearer $ROUTER_TOKEN" -H 'Content-Type: application/json' \
  https://router.example.com/api/services/openai/v1/chat/completions \
  -d '{"model":"example-model","messages":[{"role":"user","content":"Hello"}]}'
```

Use the exact model ID from the proposal title. All existing model policies,
client entitlements, billing, rate limits and streaming behavior apply at
execution. An agreement does not grant credentials, reserve capacity or lock a
price. A later loss of model availability is reported by the inference API.

This implementation supports HTTP discovery and negotiation. It does not yet
provide signed server-to-server delivery, persistent agreements, payment
settlement or ActivityPub confirmation delivery. HTTP bearer authentication
identifies the local caller; an asserted remote `actor` is not an authenticated
federated identity. Actor public keys alone do not enable signature verification.

## Migration

The Gonka and Crater/ForgeFed providers, CLI flags and environment settings are
removed. `UPSTREAM_PROVIDER=gonka`, `crater` and `forgefed` are rejected. Generic
OpenAI-compatible brokers can use `UPSTREAM_PROVIDER=openai-compatible` and
`OPENAI_COMPATIBLE_*` settings. The old ForgeFed Follow activity now returns
HTTP 410 Gone; its route ID is retained for API compatibility. Actor aliases
are removed. Configure the normal inference providers and discover their
models using the marketplace outbox instead.

HTTP contracts are published in [OpenAPI v2](../openapi/router.v2.yaml). The
previous `openapi/router.yaml` is retained as the immutable v1 contract for
compatibility analysis; it describes the retired public inbox behavior.
