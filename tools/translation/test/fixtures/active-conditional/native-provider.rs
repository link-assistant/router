#![cfg_attr(not(any()), doc = "native helpers", allow(dead_code))]

#[cfg_attr(all(), doc = "native macro", cfg_attr(not(any()), allow(unused_macros)))]
macro_rules! chosen {
    ($name:ident) => { fn $name() -> u8 { 7 } };
}
