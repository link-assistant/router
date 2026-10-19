//! Partition complete test files; retain production code and shared fixtures.
use std::{collections::BTreeMap, env, fs, path::PathBuf};
use syn::{Item, spanned::Spanned, visit::Visit};

fn is_test(item: &syn::ItemFn) -> bool {
    item.attrs.iter().any(|attr| {
        attr.path()
            .segments
            .last()
            .is_some_and(|segment| segment.ident == "test")
    })
}

fn shared_fixtures(items: &[Item]) -> bool {
    items.iter().any(|item| {
        let visibility = match item {
            Item::Fn(item) if !is_test(item) => &item.vis,
            Item::Const(item) => &item.vis,
            Item::Enum(item) => &item.vis,
            Item::Mod(item) => &item.vis,
            Item::Static(item) => &item.vis,
            Item::Struct(item) => &item.vis,
            Item::Trait(item) => &item.vis,
            Item::Type(item) => &item.vis,
            Item::Use(item) => &item.vis,
            _ => return false,
        };
        !matches!(visibility, syn::Visibility::Inherited)
    })
}

fn has_external_modules(items: &[Item]) -> bool {
    items.iter().any(|item| match item {
        Item::Mod(item) => item
            .content
            .as_ref()
            .is_none_or(|(_, items)| has_external_modules(items)),
        Item::Macro(item) => item.mac.path.is_ident("include"),
        _ => false,
    })
}

#[derive(Default)]
struct Entries(Vec<usize>);

impl<'ast> Visit<'ast> for Entries {
    fn visit_item_fn(&mut self, item: &'ast syn::ItemFn) {
        if is_test(item) {
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
    }
}

struct Source {
    text: String,
    syntax: syn::File,
    entries: Vec<usize>,
    shard: usize,
    shared: bool,
}

struct Prune<'a> {
    sources: &'a BTreeMap<PathBuf, Source>,
    filename: &'a PathBuf,
    shard: usize,
    depth: usize,
    disabled: Vec<usize>,
}

impl Prune<'_> {
    fn external(&self, item: &syn::ItemMod) -> Option<&Source> {
        // Nested inline-module paths stay intact rather than being guessed.
        // Their individual test functions are still partitioned.
        if self.depth != 0 {
            return None;
        }
        let parent = self.filename.parent()?;
        let explicit = item.attrs.iter().find_map(|attr| {
            if attr.path().is_ident("path")
                && let syn::Meta::NameValue(value) = &attr.meta
                && let syn::Expr::Lit(value) = &value.value
                && let syn::Lit::Str(value) = &value.lit
            {
                return Some(parent.join(value.value()));
            }
            None
        });
        let path = explicit.unwrap_or_else(|| {
            let stem = self.filename.file_stem().unwrap().to_string_lossy();
            let directory = if matches!(stem.as_ref(), "lib" | "main" | "mod") {
                parent.to_path_buf()
            } else {
                parent.join(stem.as_ref())
            };
            let file = directory.join(format!("{}.rs", item.ident));
            if file.exists() {
                file
            } else {
                directory.join(item.ident.to_string()).join("mod.rs")
            }
        });
        self.sources.get(&path.canonicalize().ok()?)
    }
}

impl<'ast> Visit<'ast> for Prune<'_> {
    fn visit_item_mod(&mut self, item: &'ast syn::ItemMod) {
        let test_module = item.attrs.iter().any(|attr| {
            matches!(&attr.meta, syn::Meta::List(meta)
                if meta.path.is_ident("cfg") && meta.tokens.to_string() == "test")
        });
        let inactive = if let Some((_, items)) = &item.content {
            self.sources[self.filename].shard != self.shard
                && !shared_fixtures(items)
                && !has_external_modules(items)
        } else {
            self.external(item).is_some_and(|source| {
                !source.entries.is_empty() && source.shard != self.shard && !source.shared
            })
        };
        if test_module && inactive {
            self.disabled.push(item.span().start().line);
            return;
        }
        self.depth += 1;
        syn::visit::visit_item_mod(self, item);
        self.depth -= 1;
    }
}

fn main() {
    let args: Vec<_> = env::args().collect();
    let shard: usize = args[1].parse().unwrap();
    let count: usize = args[2].parse().unwrap();
    assert!(count > 0 && shard < count);
    let mut sources = BTreeMap::new();
    let mut ordinal = 0;
    let mut total = 0;
    let mut enabled = 0;
    for filename in &args[3..] {
        let text = fs::read_to_string(filename).unwrap();
        let syntax = syn::parse_file(&text).unwrap();
        let mut entries = Entries::default();
        entries.visit_file(&syntax);
        let assigned = ordinal % count;
        if !entries.0.is_empty() {
            ordinal += 1;
        }
        total += entries.0.len();
        if assigned == shard {
            enabled += entries.0.len();
        }
        let shared = shared_fixtures(&syntax.items) || has_external_modules(&syntax.items);
        sources.insert(
            PathBuf::from(filename).canonicalize().unwrap(),
            Source {
                text,
                syntax,
                entries: entries.0,
                shard: assigned,
                shared,
            },
        );
    }
    for (filename, source) in &sources {
        let mut prune = Prune {
            sources: &sources,
            filename,
            shard,
            depth: 0,
            disabled: Vec::new(),
        };
        prune.visit_file(&source.syntax);
        if source.shard != shard {
            prune.disabled.extend(&source.entries);
        }
        prune.disabled.sort_unstable();
        prune.disabled.dedup();
        let mut output = String::new();
        for (index, line) in source.text.split_inclusive('\n').enumerate() {
            if prune.disabled.binary_search(&(index + 1)).is_ok() {
                output.push_str("#[cfg(any())]\n");
            }
            output.push_str(line);
        }
        fs::write(filename, output).unwrap();
    }
    println!("Shard {shard}/{count}: {enabled}/{total} test entry points enabled");
}
