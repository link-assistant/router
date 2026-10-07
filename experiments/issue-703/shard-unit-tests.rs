#!/usr/bin/env rust-script
//! Prepare bounded local unit-test compilation without changing repository sources.
//! Run: rust-script experiments/issue-703/shard-unit-tests.rs
//! Then run each printed command sequentially; ordinary CI remains unsharded.
//! ```cargo
//! [dependencies]
//! syn = { version = "2", features = ["full", "visit-mut"] }
//! prettyplease = "0.2"
//! ```

use std::path::{Path, PathBuf};
use syn::visit_mut::{self, VisitMut};

const DEFAULT_SHARDS: usize = 8;

struct Sharder {
    file: String,
    counts: Vec<usize>,
}

impl VisitMut for Sharder {
    fn visit_item_fn_mut(&mut self, function: &mut syn::ItemFn) {
        if function.attrs.iter().any(|attribute| {
            let parts: Vec<_> = attribute
                .path()
                .segments
                .iter()
                .map(|s| s.ident.to_string())
                .collect();
            parts == ["test"] || parts == ["tokio", "test"]
        }) {
            let key = format!("{}:{}", self.file, function.sig.ident);
            let hash = key.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |h, b| {
                (h ^ u64::from(b)).wrapping_mul(0x0000_0100_0000_01b3)
            });
            let shard = (hash % self.counts.len() as u64) as usize;
            let value = shard.to_string();
            function
                .attrs
                .push(syn::parse_quote!(#[cfg(router_local_unit_shard = #value)]));
            self.counts[shard] += 1;
        }
        visit_mut::visit_item_fn_mut(self, function);
    }
}

fn copy(source: &Path, destination: &Path, root: &Path, counts: &mut [usize]) {
    std::fs::create_dir_all(destination).unwrap();
    for entry in std::fs::read_dir(source).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let out = destination.join(entry.file_name());
        if path.is_dir() {
            copy(&path, &out, root, counts);
        } else if path.extension().is_some_and(|ext| ext == "rs") {
            let source = std::fs::read_to_string(&path).unwrap();
            let mut syntax = syn::parse_file(&source)
                .unwrap_or_else(|error| panic!("{}: {error}", path.display()));
            let mut sharder = Sharder {
                file: path.strip_prefix(root).unwrap().display().to_string(),
                counts: vec![0; counts.len()],
            };
            sharder.visit_file_mut(&mut syntax);
            for (total, count) in counts.iter_mut().zip(sharder.counts) {
                *total += count;
            }
            std::fs::write(out, prettyplease::unparse(&syntax)).unwrap();
        } else {
            std::fs::copy(path, out).unwrap();
        }
    }
}

fn main() {
    let root = std::env::current_dir().unwrap();
    let output = root.join("target/local-unit-shards");
    std::fs::create_dir_all(&output).unwrap();
    let shards = std::env::var("ROUTER_LOCAL_UNIT_SHARDS").map_or(DEFAULT_SHARDS, |value| {
        value.parse().expect("integer shard count")
    });
    assert!(
        (1..=64).contains(&shards),
        "shard count must be between 1 and 64"
    );
    let mut counts = vec![0; shards];
    copy(&root.join("src"), &output.join("src"), &root, &mut counts);
    // Preserve relative include paths outside src; the original manifest and
    // generated OUT_DIR remain the compiler's ordinary Cargo environment.
    for entry in std::fs::read_dir(&root).unwrap() {
        let entry = entry.unwrap();
        let name = entry.file_name();
        if name == "src" || name == "target" {
            continue;
        }
        let destination = output.join(name);
        if std::fs::symlink_metadata(&destination).is_err() {
            std::os::unix::fs::symlink(entry.path(), destination).unwrap();
        }
    }
    for (shard, count) in counts.iter().enumerate() {
        let wrapper: PathBuf = output.join(format!("shard-{shard}.py"));
        let allowed = (0..shards)
            .map(|number| format!("\"{number}\""))
            .collect::<Vec<_>>()
            .join(", ");
        let text = format!(
            "#!/usr/bin/env python3\nimport os,sys\na=sys.argv[1:]\na=[{source:?} if x=='src/lib.rs' else x for x in a]\na += ['--cfg', 'router_local_unit_shard=\"{shard}\"', '--check-cfg', 'cfg(router_local_unit_shard, values({allowed}))']\nos.execv(a[0],a)\n",
            source = output.join("src/lib.rs").display().to_string()
        );
        std::fs::write(&wrapper, text).unwrap();
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&wrapper, std::fs::Permissions::from_mode(0o755)).unwrap();
        println!(
            "shard {shard}: {count} test functions; RUSTC_WORKSPACE_WRAPPER={} cargo test --locked --lib --all-features",
            wrapper.display()
        );
    }
}
