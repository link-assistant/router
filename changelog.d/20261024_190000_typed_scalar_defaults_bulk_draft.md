Draft TypeScript annotation substitutions that preserve explicit closed scalar
parameter defaults through the existing JavaScript parser/checker/meta/emitters.
Retain initializer source spans and check signature default presence. Compose
complete alias, absence and default source histories without rewinding later
implementations. Missing/undefined, zero/false/empty, signed-zero, arity and
refusal regression sources are drafted and unrun.
