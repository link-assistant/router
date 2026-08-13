//! Compatibility adapter for `doublets` 0.4 and `platform-mem` 0.3.
//!
//! `FileMapped` starts with a logical capacity of zero even when its file
//! already contains data. `doublets::unit::Store::new` consequently treats a
//! reopened file as empty. This adapter restores the mapped capacity and
//! preserves it across the store's initial bootstrap resize.

use std::fs::File;
use std::io;
use std::mem::{MaybeUninit, size_of};

use doublets::parts::LinkPart;
use mem::{FileMapped, RawMem};

const DOUBLETS_BOOTSTRAP_ITEMS: usize = 8 * 1024;

pub(super) struct LoadedFileMapped {
    inner: FileMapped<LinkPart<usize>>,
    preserve_bootstrap: bool,
}

impl LoadedFileMapped {
    pub(super) fn new(file: File) -> io::Result<Self> {
        let bytes = usize::try_from(file.metadata()?.len())
            .map_err(|_| io::Error::other("mapped file is too large for this platform"))?;
        if bytes % size_of::<LinkPart<usize>>() != 0 && bytes >= 4096 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "mapped file length is not aligned to a doublets link part",
            ));
        }
        let mut inner = FileMapped::new(file)?;
        let items = bytes.max(4096) / size_of::<LinkPart<usize>>();

        // SAFETY: LinkPart<usize> is repr(C), consists solely of usize fields,
        // and every bit pattern is valid. The mapped bytes came from the same
        // native doublets store on this platform.
        unsafe {
            inner.grow_assumed(items).map_err(platform_mem_error)?;
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

    unsafe fn grow(
        &mut self,
        addition: usize,
        fill: impl FnOnce(usize, (&mut [Self::Item], &mut [MaybeUninit<Self::Item>])),
    ) -> mem::Result<&mut [Self::Item]> {
        // SAFETY: The caller supplies the initialization callback required by
        // RawMem, and FileMapped enforces the same contract.
        unsafe {
            self.inner.grow(addition, fill)?;
        }
        // FileMapped 0.3 returns only the newly grown tail. doublets expects
        // RawMem::grow to return the complete allocation when it refreshes
        // its internal pointers.
        Ok(self.inner.allocated_mut())
    }

    fn shrink(&mut self, count: usize) -> mem::Result<()> {
        if self.preserve_bootstrap
            && self.inner.allocated().len().saturating_sub(count) == DOUBLETS_BOOTSTRAP_ITEMS
        {
            self.preserve_bootstrap = false;
            return Ok(());
        }
        self.inner.shrink(count)
    }
}

fn platform_mem_error(error: mem::Error) -> io::Error {
    match error {
        mem::Error::System(error) => error,
        other => io::Error::other(other),
    }
}
