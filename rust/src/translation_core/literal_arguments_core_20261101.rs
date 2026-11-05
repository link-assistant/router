//! Portable owned literal-argument boundary, not the std::fmt::Arguments ABI.
//! The only retained storage is a shared static slice of shared static text.

/// A move-only zero-runtime-argument carrier with zero or one static piece.
/// The fields are private; the checked caller domain admits direct literals only.
pub struct LiteralArguments {
    pieces: &'static [&'static str],
}

/// Implementation entry for the qualified literal macro. Direct calls require
/// their own source contract and are deliberately outside checked translation.
#[doc(hidden)]
pub const fn __literal_arguments_from_static(
    pieces: &'static [&'static str],
) -> LiteralArguments {
    ::std::assert!(pieces.len() <= 1, "literal arguments require zero or one piece");
    ::std::assert!(pieces.is_empty() || pieces[0].len() <= 2 * 1024 * 1024, "literal piece bound");
    LiteralArguments { pieces }
}

/// Count pieces. Empty arguments and one empty string remain distinct.
#[must_use]
pub fn literal_arguments_piece_count(value: LiteralArguments) -> u64 {
    value.pieces.len() as u64
}

/// Count UTF-8 bytes in the retained static piece, without allocating text.
#[must_use]
pub fn literal_arguments_byte_len(value: LiteralArguments) -> u64 {
    if value.pieces.is_empty() { 0 } else { value.pieces[0].len() as u64 }
}

/// Test rendered literal emptiness. This consumes the move-only carrier.
#[must_use]
pub fn literal_arguments_is_empty(value: LiteralArguments) -> bool {
    value.pieces.is_empty() || value.pieces[0].is_empty()
}

// An exact empty destructor seals move-only/coherence semantics: application
// owners cannot add a custom destructor or Copy implementation for this type.
impl ::std::ops::Drop for LiteralArguments {
    fn drop(&mut self) {}
}

// Formatting internals remain untranslated behind this qualified owned boundary.
// This impl neither captures operation output nor changes process output routing.
impl ::std::fmt::Display for LiteralArguments {
    fn fmt(&self, formatter: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        for piece in self.pieces {
            formatter.write_str(piece)?;
        }
        ::std::result::Result::Ok(())
    }
}
