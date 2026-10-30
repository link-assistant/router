# Checked primitive constant arithmetic source draft

SOURCE ONLY. All implementation, source equations, cases and receiving obligations
are UNRUN. Whole drafting, coverage, parity, freshness, resources, platforms and
CI remain OPEN. No local implementation, parser, translator or compiler ran.

The existing actual constant dependency observer now drafts arithmetic literal
substitutions inside its genuine source-linked primitive constant body only.
It reuses the registered native arithmetic operation table, exact width/sign
bounds and original complete function's native tree guard. Actual checked add,
subtract, multiply, truncating divide/remainder and signed negation require
identical by-value primitive operands and their checked source semantics.

Only operands that reduce through the same bounded source observation to exact
same-width integer literals can be folded. Every operand/result is range checked;
zero divisors, signed minimum divided or remaindered by minus one, and minimum
negation refuse. Unsupported constant parents or operations remain refused.
Original source-linked constant checking and independent complete receiving/native
comparison remain required; no serialized proof or numeric metadata grants
admission. No new runtime arithmetic operation or panic model is selected.

Four complete source equations preserve originals/inverses under exactly language
then repository phases. Independent drafts cover all ten widths, six unsigned and
eight signed constant forms, nested arithmetic, exact signed remainder, automatic
bulk discovery, both source authorities, strict typed values and overflow/zero/
minimum edge refusals. Raw runtime BigInt arithmetic remains separately refused.
Every case is UNRUN. Broader runtime failure order, ownership, aggregates, module
lifecycle and full receiving/CI remain OPEN; fatal Rust stays CI-only after all
eight same-SHA JavaScript gates.
