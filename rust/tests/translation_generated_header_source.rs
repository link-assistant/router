//! Independent source header/member layout oracle SOURCE. CI-only UNRUN.
#[repr(C)]
#[derive(Clone,Copy)]
struct Packet(u64);
#[allow(dead_code)]
impl Packet { #[inline] fn get(&self)->u64{self.0} #[allow(dead_code)] const LIMIT:u64=7; }
#[test]
fn ordinary_source_headers_keep_original_type_layout_and_associated_member_values(){let value=Packet(7);assert_eq!(value.get(),Packet::LIMIT);assert_eq!(std::mem::size_of::<Packet>(),std::mem::size_of::<u64>());}
