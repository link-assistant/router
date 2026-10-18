### Fixed

Update three historical frozen JSON storage fixtures to require the exact current four-export namespace while retaining all three original storage names, callability checks, complete historical helpers and original test deadlines. The additive equality hint must remain callable and return no hint for unequal frozen, mutable, accessor and proxy inputs, without reading accessors/proxy traps or changing storage facts.

Production serializers, source/owner checks and cache behavior are unchanged. This source-only fixture repair requires complete Node/Bun receiving qualification; no performance or full CI result is claimed.
