//! Split test entry points while retaining production code and fixture helpers.
use std::{env, fs};
use syn::{spanned::Spanned, visit::Visit};

struct Entries(Vec<usize>);

impl<'ast> Visit<'ast> for Entries {
    fn visit_item_fn(&mut self, item: &'ast syn::ItemFn) {
        if item.attrs.iter().any(|attr| {
            attr.path()
                .segments
                .last()
                .is_some_and(|segment| segment.ident == "test")
        }) {
            self.0.push(item.span().start().line);
        }
        syn::visit::visit_item_fn(self, item);
    }

    fn visit_item_macro(&mut self, item: &'ast syn::ItemMacro) {
        if item
            .mac
            .path
            .segments
            .last()
            .is_some_and(|segment| segment.ident == "proptest")
        {
            self.0.push(item.span().start().line);
        }
        syn::visit::visit_item_macro(self, item);
    }
}

fn main() {
    let args: Vec<_> = env::args().collect();
    let shard: usize = args[1].parse().unwrap();
    let count: usize = args[2].parse().unwrap();
    assert!(count > 0 && shard < count);
    let mut total = 0;
    let mut enabled = 0;
    for filename in &args[3..] {
        let source = fs::read_to_string(filename).unwrap();
        let mut entries = Entries(Vec::new());
        entries.visit_file(&syn::parse_file(&source).unwrap());
        entries.0.sort_unstable();
        let mut disabled = Vec::new();
        for line in entries.0 {
            if total % count == shard {
                enabled += 1;
            } else {
                disabled.push(line);
            }
            total += 1;
        }
        let mut output = String::new();
        for (index, line) in source.split_inclusive('\n').enumerate() {
            if disabled.binary_search(&(index + 1)).is_ok() {
                output.push_str("#[cfg(any())]\n");
            }
            output.push_str(line);
        }
        fs::write(filename, output).unwrap();
    }
    println!("Shard {shard}/{count}: {enabled}/{total} test entry points enabled");
}
