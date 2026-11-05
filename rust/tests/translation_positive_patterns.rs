// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
fn status_class(value: u16) -> u8 {
    match value { 200..=299 => 1, 400..=499 => 2, 500..=599 => 3, _ => 0 }
}

fn selected_status(value: u16) -> bool { matches!(value, | 200 | 204) }
fn latin_letter(value: char) -> bool { matches!(value, 'a'..='z') }

#[test]
fn range_bindings_keep_inclusive_boundaries_and_negative_character_values() {
    for (value, expected) in [(199, 0), (200, 1), (299, 1), (300, 0), (400, 2), (499, 2), (500, 3), (599, 3), (600, 0)] { assert_eq!(status_class(value), expected); }
    let value = -4;
    assert_eq!(match value { selected @ -9..=-1 => selected, _ => 0 }, -4);
    assert!(latin_letter('q'));
    assert!(!latin_letter('猫'));
    assert!(selected_status(204));
    assert!(!selected_status(201));
}

fn edges(value: &[u8]) -> Option<(u8, usize, u8)> {
    let [first, middle @ .., last] = value else { return None; };
    Some((*first, middle.len(), *last))
}

#[test]
fn rest_bindings_preserve_sequence_shape_and_shorthand_reference_modes() {
    assert_eq!(edges(&[]), None);
    assert_eq!(edges(&[1]), None);
    assert_eq!(edges(&[1, 2]), Some((1, 0, 2)));
    assert_eq!(edges(&[1, 2, 3, 4]), Some((1, 2, 4)));
    struct Named { first: u8, second: u8 }
    let mut value = Named { first: 1, second: 2 };
    let Named { ref mut first, .. } = value;
    *first += 1;
    assert_eq!(value.first, 2);
    assert_eq!(value.second, 2);
    struct Pair(u8, u8);
    let Pair { 0: first, 1: second } = Pair(3, 4);
    assert_eq!((first, second), (3, 4));
}
