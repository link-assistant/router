//! A deployment lifecycle lock owned by the operation's scope.

pub(super) struct OperationLock(pub(super) std::fs::File);

impl Drop for OperationLock {
    fn drop(&mut self) {
        // Closing one descriptor does not release a Unix lock while an
        // unrelated child still has a copy between fork and exec. Release
        // ownership explicitly when the operation and its awaited work end.
        let _ = self.0.unlock();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inherited_descriptors_do_not_keep_a_finished_operation_locked() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("operation.lock");
        let open = || {
            std::fs::OpenOptions::new()
                .create(true)
                .truncate(false)
                .read(true)
                .write(true)
                .open(&path)
                .unwrap()
        };
        let file = open();
        file.try_lock().unwrap();
        let operation = OperationLock(file);
        // A duplicated descriptor shares the lock, just as one inherited by
        // an unrelated child between fork and exec does on Unix.
        let inherited = operation.0.try_clone().unwrap();
        let next = open();
        assert!(
            next.try_lock().is_err(),
            "the active operation owns its lock"
        );
        drop(operation);
        next.try_lock()
            .expect("finishing the operation releases its lock even while a descriptor survives");
        next.unlock().unwrap();
        drop(inherited);
    }
}
