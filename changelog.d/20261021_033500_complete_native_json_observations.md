### Fixed
- Preserve the original full JSON projection when transporting complete Core corpus observations, including class-shaped results and every repeated string occurrence. Keep the existing plain-DATA codec and original resource/deadline limits.
- Compare a copied context refusal with the exact original foreign-context refusal, instead of assuming its error text.

### Development
- Prior complete Node receiving: private DATA 6/6, indexed transport 6/6, ASCII base 4/4, corpus 5/6; no duration breaches. The complete replacement transport/corpus run is pending. Proof-byte source cases still exceed their original deadlines. No Rust tools were executed.
