// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
#[test]
fn rust_character_literals_are_scalars_with_matching_pattern_values() {
    let cases = [('a', 97), ('猫', 0x732b), ('🦀', 0x1f980), ('\n', 10), ('\r', 13), ('\t', 9), ('\0', 0), ('\\', 92), ('\'', 39), ('\"', 34), ('\x7f', 127), ('\u{D7FF}', 0xd7ff), ('\u{E000}', 0xe000), ('\u{10_FF_FF}', 0x10ffff)];
    for (value, expected) in cases { assert_eq!(u32::from(value), expected); }
    assert!(matches!('🦀', '\u{1F980}'));
    assert!(matches!('\n', '\x0A'));
    let mut count = 0;
    let value = loop { count += 1; if count == 2 { break '🦀'; } };
    assert_eq!(value, '🦀');
}
