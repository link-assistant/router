// Independent native baseline SOURCE. UNRUN and not a new Cargo target.
// Parent may include this whole file in an existing gated native oracle later.
// This detached baseline establishes no token_report/module-owner admission.
#[test]
fn constant_array_indices_format_copy_borrowed_str_values() {
    const LABELS: [&str; 3] = ["É😀", "", "tail"];
    const INDEX: usize = 2;
    assert_eq!(
        format!("{0:<6}|{1}|{2}", LABELS[0], LABELS[1], LABELS[INDEX]),
        "É😀    ||tail"
    );
    assert_eq!(format!("{0}/{0}", LABELS[INDEX]), "tail/tail");
}

#[test]
fn changed_native_constant_cell_changes_all_real_uses() {
    const RENAMED_OWNER: [&str; 3] = ["λ🧱", "", "tail"];
    const fn choose() -> usize { 2 }
    const INDEX: usize = choose();
    assert_eq!(
        format!("{0:<6}|{1}|{2}", RENAMED_OWNER[0], RENAMED_OWNER[1], RENAMED_OWNER[INDEX]),
        "λ🧱    ||tail"
    );
    assert_eq!(format!("{0}/{0}", RENAMED_OWNER[0]), "λ🧱/λ🧱");
}
