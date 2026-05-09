# ForgeFed Integration

Link.Assistant.Router exposes a small ActivityPub/ForgeFed surface so coding
problem sources can discover and address the router as a service actor.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/actor/code` | `GET` | Public service actor document |
| `/inbox/code` | `POST` | Inbound ActivityStreams activities |
| `/outbox/code` | `GET` | Local actor outbox collection |
| `/actors/code/followers` | `GET` | Local followers collection |
| `/activities/follow-problemsets-code-001` | `GET` | Follow activity targeting `problemsets.lefine.pro` |

All successful ActivityPub responses use `application/activity+json`.

## Configuration

Set these values when the router is served from a public URL:

| Variable | Description |
|---|---|
| `ACTIVITYPUB_ACTOR_BASE_URL` | Public origin used in actor, inbox, outbox, and activity IDs |
| `ACTIVITYPUB_PUBLIC_KEY_PEM` | PEM public key advertised in the actor document |

Example:

```bash
export ACTIVITYPUB_ACTOR_BASE_URL=https://router.example.com
export ACTIVITYPUB_PUBLIC_KEY_PEM="$(cat public.pem)"
export TOKEN_SECRET="$(openssl rand -hex 32)"
link-assistant-router serve
```

## Discovery Check

After deployment, verify the actor document:

```bash
curl -H 'Accept: application/activity+json' \
  https://router.example.com/actor/code | jq .
```

The response should include:

- `@context` containing `https://www.w3.org/ns/activitystreams` and
  `https://forgefed.org/ns`
- `type` set to `Service`
- `inbox` set to the public `/inbox/code` URL
- `publicKey.owner` matching the actor ID

## Following Problem Sets

The router publishes a reusable Follow activity for the public problemsets
actor:

```bash
curl -H 'Accept: application/activity+json' \
  https://router.example.com/activities/follow-problemsets-code-001 | jq .
```

Submit that activity to a compatible ForgeFed inbox when a remote problem source
requires an explicit follow request.
