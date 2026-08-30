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
const DOUBLETS_BOOTSTRAP_ITEMS: usize = 8 * 1024;

/// A mapping that keeps the capacity an existing file already represents.
///
/// `FileMapped` starts with a logical capacity of zero however much the file
/// holds, so `unit::Store::new` reads a truncated store: on a 64 MB file
/// carrying 307 token records it saw **91** links where this wrapper sees
/// **524,766**, and schema validation then failed at the first point past the
/// truncation with "doublets schema contains an invalid point". Reads still
/// answered -- the dual store falls back to the text projection -- so the
/// store looked healthy while every write failed (issue #374).
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
    preserve_bootstrap: bool,
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
            preserve_bootstrap: items > DOUBLETS_BOOTSTRAP_ITEMS,
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
        if self.preserve_bootstrap
            && self.inner.allocated().len().saturating_sub(count) == DOUBLETS_BOOTSTRAP_ITEMS
        {
            self.preserve_bootstrap = false;
            return Ok(());
        }
        self.inner.shrink(count)
    }
}
