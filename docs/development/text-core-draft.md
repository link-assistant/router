# Bounded UTF-8 text core draft

Twenty explicit text interfaces provide trimming, literal search/replacement,
byte and scalar counts, character taking/dropping, byte slicing, prefix/suffix
removal and repetition. Rust uses its native string operations. JS validates
primitive Unicode scalar strings and converts UTF-16 positions to UTF-8 byte
offsets. Whitespace uses Rust's documented Unicode property; empty patterns and
replacement dollars retain literal character-boundary behavior. See the
[Rust string reference](https://doc.rust-lang.org/std/primitive.str.html).

Input and output stay within one MiB. Replacement and repeat validate result
size before allocating. Counts use portable u64 values; invalid widths,
unpaired surrogates, malformed byte boundaries and coercion objects refuse.
The runtime captures host methods and creates fresh Option values without a
cross-invocation value, source, verdict or encoded-result cache. Empty deletion
fragments are omitted to avoid building a large array of empty strings.

One description drives operation rows and declarations. Complete native source,
root before-images, the copied native-root preparer, two ordered rule sequences
and adjacent SSE/text root inverses remain present. Historical code is source
DATA and is not executed. Native internals remain intentionally untranslated
behind the shared explicit interfaces.

Independent JS boundary/refusal cases and native Rust oracle source are drafted
and unrun. Translator registration, source units, forward/reverse callers,
standard-method adoption, production application and the rest of issue #759
still need their remaining draft. No execution coverage or parity is claimed.
