#[cfg(any())]
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 19 } }; }
#[cfg(all())]
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 7 } }; }
