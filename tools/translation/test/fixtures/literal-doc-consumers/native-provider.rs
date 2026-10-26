#![doc = "Literal helper module α😀"]
#![forbid(unsafe_code)]
#[doc = "Original macro α😀"]
macro_rules! chosen {
    ($name:ident) => {
        #[doc = "Generated function α😀"]
        pub fn $name() -> u8 { 7 }
    };
}
