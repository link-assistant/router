#![allow(unused_macros)]
#![forbid(unsafe_code)]
#[cfg(any())]
unknown_inactive_producer!();
#[cfg(all())]
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 7 } }; }
