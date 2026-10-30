// Independent native control oracle SOURCE. CI only after all JavaScript gates.
#[test]
fn absent_loop_options_preserve_nearest_break_and_continue() {
    for (source, expected) in [("ax", 1_u64), ("absent", 0_u64)] {
        let mut count = 0_u64;
        let mut result = 0_u64;
        while count < 2 {
            count += 1;
            let found = match source.find('x') { Some(value) => value as u64, None => continue };
            result = found;
            break;
        }
        assert_eq!(result, expected);
    }
    let pieces = vec![Some(vec![0_u8, 255]), Some(vec![128]), None];
    let mut output = Vec::new();
    for piece in pieces {
        let piece = match piece { Some(piece) => piece, None => break };
        output.extend(piece);
    }
    assert_eq!(output, vec![0, 255, 128]);
}
