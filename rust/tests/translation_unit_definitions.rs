//! Independent native unit definition oracle sources. CI-only; all unrun.
// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::branches_sharing_code)]
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::redundant_else)]
fn empty() {}

// Explicit returns and identical returning branches are the oracle inputs.
#[allow(clippy::needless_return)]
fn explicit() {
    return;
}

#[allow(clippy::needless_return, clippy::if_same_then_else)]
fn branch(flag: bool) {
    if flag {
        return;
    } else {
        return;
    }
}

#[allow(clippy::needless_return)]
fn guard(flag: bool) {
    if flag {
        return;
    }
}

fn identity(flag: bool) -> bool {
    flag
}

#[allow(clippy::needless_return)]
fn helper_guard(flag: bool) {
    if identity(flag) {
        return;
    }
}

#[test]
fn unit_definitions_preserve_every_branch() {
    empty();
    explicit();
    for flag in [false, true] {
        branch(flag);
        guard(flag);
        helper_guard(flag);
    }
}
