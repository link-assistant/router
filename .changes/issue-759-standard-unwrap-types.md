Preserve the checked payload type through generated Option/Result unwrap_or
helpers. TypeScript can infer subsequent string replacement callbacks from
the actual string payload instead of losing it through any. Separate tag
branches retain the original eager fallback behavior and permit TypeScript
to narrow valid constructor fields. Source, ownership and lifetime admission
rules are unchanged. The retained original login-provider semantic meta and
Option/Result payload regressions exercise JavaScript and strict TypeScript.
