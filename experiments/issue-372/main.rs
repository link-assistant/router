//! What `doublets` 0.5 and `link-cli` 0.2 change for the router's token store.
//!
//! Three questions the router's storage code encodes an answer to today, each
//! answered against `doublets` 0.4 (issue #357, issue #370):
//!
//! 1. Does a file-mapped store survive being reopened, without the router's
//!    own `LoadedFileMapped` adapter and its `unsafe` block?
//! 2. Does `Doublets::delete_all` still panic or hang on a store holding real
//!    links? 0.4's `update` detached the source and target trees by the *new*
//!    values instead of the stored ones, which is what corrupted the tree
//!    sizes; 0.5 fixed exactly that.
//! 3. Does a plain store still accept a duplicate `(source, target)` pair, so
//!    that interning through `get_or_create` is still required?
//!
//! Run with: `cargo run --manifest-path experiments/issue-372/Cargo.toml`

use std::path::Path;

use doublets::mem::unit::LinkPart;
use doublets::{Doublets, unit};
use link_cli::storage::PersistentFileMapped;

type Store = unit::Store<usize, PersistentFileMapped<LinkPart<usize>>>;

fn open(path: &Path) -> Store {
    let memory = PersistentFileMapped::<LinkPart<usize>>::from_path(path).expect("map the file");
    unit::Store::<usize, _>::new(memory).expect("open the store")
}

fn main() {
    let directory = std::env::temp_dir().join("issue-372-doublets-05");
    let _ = std::fs::remove_dir_all(&directory);
    std::fs::create_dir_all(&directory).expect("create the directory");
    let path = directory.join("tokens.bin");

    // 1. Persistence across reopen, with no adapter of our own.
    let written = {
        let mut store = open(&path);
        for _ in 0..4_096 {
            store.create_point().expect("create a point");
        }
        let a = store.create_point().expect("create a point");
        let b = store.create_point().expect("create a point");
        store.get_or_create(a, b).expect("create a pair");
        store.count()
    };
    let reopened = open(&path).count();
    println!("1. wrote {written} links, reopened {reopened}");
    assert_eq!(written, reopened, "a reopened store must hold what was written");

    // 2. `delete_all` on a store holding real links.
    {
        let mut store = open(&path);
        store.delete_all().expect("delete every link");
        println!("2. delete_all left {} links", store.count());
        assert_eq!(store.count(), 0);
    }
    println!("2. delete_all terminated without a panic");

    // 3. Duplicate pairs on a plain store.
    {
        let path = directory.join("duplicates.bin");
        let mut store = open(&path);
        let a = store.create_point().expect("create a point");
        let b = store.create_point().expect("create a point");
        let first = store.create_link(a, b).expect("create a pair");
        match store.create_link(a, b) {
            Ok(second) if second != first => {
                println!("3. create_link created a duplicate pair: {first} and {second}");
            }
            Ok(same) => println!("3. create_link resolved to the existing link {same}"),
            Err(error) => println!("3. create_link rejected the duplicate: {error}"),
        }
    }
}
