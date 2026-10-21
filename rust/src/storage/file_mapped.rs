//! Capacity-preserving file mapping for the doublets token store.
//!
//! Split from `associative.rs` to keep that file within the repository's
//! 1000-line limit.

use std::mem::{MaybeUninit, size_of};

use doublets::mem::RawMem;
use doublets::mem::unit::LinkPart;
use link_cli::storage::PersistentFileMapped;

use super::StorageError;

/// Number of items `unit::Store` bootstraps with before it sizes itself.
#[cfg(test)]
const DOUBLETS_BOOTSTRAP_ITEMS: usize = 8 * 1024;

/// A mapping that keeps the capacity an existing file already represents.
///
/// `FileMapped` starts with a logical capacity of zero however much the file
/// holds, so `unit::Store::new` reads only a small prefix of an existing links
/// network. Schema validation then fails at the first point past the truncation
/// with "doublets schema contains an invalid point". Reads still answer -- the
/// dual store falls back to the text projection -- so the store can look
/// healthy while every write fails (issue #374).
///
/// Three things are needed, and `PersistentFileMapped` alone provides none of
/// them:
///
/// * the capacity has to be adopted without writing over the persisted bytes,
///   which `grow_filled` does not do -- despite its documentation it fills the
///   whole region and empties the store (link-foundation/link-cli#102);
/// * `grow` must return the complete allocation, because that is what
///   `doublets` re-derives its pointers from, not just the new tail;
/// * the store's initial bootstrap `shrink` has to be refused once, or it
///   discards the capacity that was just adopted.
pub(super) struct LoadedFileMapped {
    inner: PersistentFileMapped<LinkPart<usize>>,
    minimum_capacity: usize,
}

impl LoadedFileMapped {
    pub(super) fn new(file: std::fs::File) -> Result<Self, StorageError> {
        let bytes = usize::try_from(file.metadata()?.len())
            .map_err(|_| std::io::Error::other("mapped file is too large for this platform"))?;
        if bytes % size_of::<LinkPart<usize>>() != 0 && bytes >= 4096 {
            return Err(StorageError::Codec(
                "mapped file length is not aligned to a doublets link part".into(),
            ));
        }
        let mut inner = PersistentFileMapped::new(file)?;
        let items = bytes.max(4096) / size_of::<LinkPart<usize>>();
        // SAFETY: `grow_assumed` requires the grown region to be initialised.
        // It is: these bytes were written as `LinkPart<usize>` values by a
        // doublets store on this platform, and `LinkPart<usize>` is `repr(C)`
        // over `usize` fields, so every bit pattern is valid. Its fill closure
        // writes nothing, so no persisted byte is touched.
        #[allow(unsafe_code)]
        unsafe {
            inner
                .grow_assumed(items)
                .map_err(|error| StorageError::Codec(format!("restore capacity: {error}")))?;
        }
        Ok(Self {
            inner,
            minimum_capacity: items,
        })
    }
}

impl RawMem for LoadedFileMapped {
    type Item = LinkPart<usize>;

    fn allocated(&self) -> &[Self::Item] {
        self.inner.allocated()
    }

    fn allocated_mut(&mut self) -> &mut [Self::Item] {
        self.inner.allocated_mut()
    }

    #[allow(unsafe_code)]
    unsafe fn grow(
        &mut self,
        addition: usize,
        fill: impl FnOnce(usize, (&mut [Self::Item], &mut [MaybeUninit<Self::Item>])),
    ) -> doublets::mem::Result<&mut [Self::Item]> {
        // SAFETY: the caller supplies the initialisation callback `RawMem`
        // requires, and the wrapped mapping enforces the same contract.
        unsafe {
            self.inner.grow(addition, fill)?;
        }
        // The mapping returns only the newly grown tail; `doublets` expects the
        // complete allocation when it refreshes its internal pointers.
        Ok(self.inner.allocated_mut())
    }

    fn shrink(&mut self, count: usize) -> doublets::mem::Result<()> {
        // `LinksHeader::allocated` is the highest live address, not a count.
        // During initialization doublets first asks to shrink a loaded mapping
        // to its bootstrap page and then to `allocated`; satisfying the second
        // request discards the live slot at that inclusive address. Preserve
        // every element represented by the existing file. Rebuilds compact by
        // constructing a fresh mapping, so an opened store never needs to
        // shrink below this floor (issue #557).
        if self.inner.allocated().len().saturating_sub(count) < self.minimum_capacity {
            return Ok(());
        }
        self.inner.shrink(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Reopening a doublets file performs two initialization shrinks: first to
    /// the bootstrap page, then to the highest allocated address. The latter
    /// address is inclusive, so allowing either shrink discards live storage
    /// and leaves a tree pointer exactly one past the mapping (issue #557).
    #[test]
    fn an_existing_mapping_never_shrinks_below_its_file_capacity() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let path = directory.path().join("tokens.bin");
        let existing_items = DOUBLETS_BOOTSTRAP_ITEMS + 37;
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create_new(true)
            .open(&path)
            .expect("create mapping");
        file.set_len((existing_items * size_of::<LinkPart<usize>>()) as u64)
            .expect("size mapping");

        let mut mapping = LoadedFileMapped::new(file).expect("load mapping");
        mapping
            .shrink(existing_items - DOUBLETS_BOOTSTRAP_ITEMS)
            .expect("ignore bootstrap shrink");
        mapping.shrink(1).expect("ignore inclusive-address shrink");

        assert_eq!(
            mapping.allocated().len(),
            existing_items,
            "initialization must retain the slot at the highest allocated address"
        );
        assert_eq!(
            std::fs::metadata(path).expect("mapping metadata").len(),
            (existing_items * size_of::<LinkPart<usize>>()) as u64
        );
    }
}
