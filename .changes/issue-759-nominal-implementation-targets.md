Use resolved source namespace identities to distinguish unrelated nominal implementation targets even when their field layouts are carried. Generic aliases, inaccessible targets and unknown families retain Copy refusals; matching trait implementations never acquire derived Copy behavior.

Generic type binders shadow source nominal owners before both checked-layout and family lookup. Lifetimes and const binders retain their distinct namespaces; explicit crate-qualified type owners remain resolvable.
