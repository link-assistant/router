//! Independent native public-interface oracle source. Run only in JS-gated CI.
mod interface {
    pub type Label = ::std::string::String;
    pub type Enabled = ::core::primitive::bool;
    pub type Weight = ::core::primitive::f64;
    pub type String = ::std::string::String;
}

#[test]
fn public_aliases_keep_native_values_and_do_not_redirect_their_own_targets() {
    let label: interface::Label = "nul\0 and 世界 😀".to_owned();
    let mut shadow: interface::String = label.clone();
    shadow.push('!');
    let enabled: interface::Enabled = shadow.ends_with('!');
    assert!(shadow.as_bytes().starts_with(label.as_bytes()));
    assert!(enabled);
    assert!(label.ends_with('😀'));
}

#[test]
fn public_number_alias_retains_ieee_boundaries() {
    let negative_zero: interface::Weight = -0.0;
    assert_eq!(negative_zero.to_bits(), 1_u64 << 63);
    let infinities: [interface::Weight; 2] = [f64::INFINITY, f64::NEG_INFINITY];
    assert!(infinities[0].is_sign_positive());
    assert!(infinities[1].is_sign_negative());
    let nan: interface::Weight = f64::NAN;
    assert!(nan.is_nan());
}
