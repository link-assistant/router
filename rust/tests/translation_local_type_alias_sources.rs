//! Independent ordinary alias/native call oracle SOURCE. CI-only, UNRUN.
mod model {
    pub type Error = Box<dyn std::error::Error + Send + Sync>;
    pub type Values<T = Vec<u8>> = Vec<T>;
    pub type Lookup<'a> = &'a dyn Fn(&str) -> Option<String>;
    pub type Bytes<const N:usize = {1 << 2}> = [u8;N];
}
use model::{Bytes,Error,Lookup,Values};
#[test]
fn imported_aliases_preserve_native_types_and_ordinary_literal_behavior() {
    let values:Values<String> = vec!["Ω😀".to_owned()];
    let lookup = |key:&str| if key == "key" {Some(values[0].clone())} else {None};
    let view:Lookup<'_> = &lookup;
    assert_eq!(view("key"),Some("Ω😀".to_owned()));
    assert_eq!(view("missing"),None);
    let bytes:Bytes = [0,1,2,255];assert_eq!(bytes.len(),4);
    let error:Error = std::io::Error::other("kept ordinary").into();
    assert_eq!(error.to_string(),"kept ordinary");
    assert_eq!(link_assistant_router::translation_core::format!("ordinary alias Ω😀"),"ordinary alias Ω😀".to_owned());
}
