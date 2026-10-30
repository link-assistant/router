chosen!(inherited);
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 9 } }; }
chosen!(shadowed);
