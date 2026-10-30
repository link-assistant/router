chosen!(inherited);
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 13 } }; }
chosen!(shadowed);
