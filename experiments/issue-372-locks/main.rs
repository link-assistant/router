//! What `std::fs::File`'s Rust 1.89 advisory locks do that `fs2` did.
//!
//! The router locks through `fs2` today and tells contention apart from a
//! broken lock by comparing raw OS errors, because `fs2` reports contention
//! with the platform's own error. `std` has a dedicated `TryLockError::
//! WouldBlock` variant instead. Two questions before the swap:
//!
//! 1. Do two *separately opened* handles to one file contend inside a single
//!    process, so a contention test needs no second process?
//! 2. Is a contended `try_lock` reported as `TryLockError::WouldBlock` rather
//!    than as an `io::Error` needing platform-specific classification?
//!
//! Run with: `cargo run --manifest-path experiments/issue-372-locks/Cargo.toml`

use std::fs::{File, OpenOptions, TryLockError};

fn main() {
    let directory = std::env::temp_dir().join("issue-372-std-locks");
    let _ = std::fs::remove_dir_all(&directory);
    std::fs::create_dir_all(&directory).expect("create the directory");
    let path = directory.join("credential.lock");

    let open = || {
        OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)
            .expect("open the lock file")
    };

    let holder: File = open();
    holder.lock().expect("take the exclusive lock");

    let waiter = open();
    match waiter.try_lock() {
        Ok(()) => println!("1+2. a second handle took the lock: no contention in-process"),
        Err(TryLockError::WouldBlock) => {
            println!("1. two handles in one process contend");
            println!("2. contention is reported as TryLockError::WouldBlock");
        }
        Err(TryLockError::Error(error)) => println!("2. contention surfaced as io::Error: {error}"),
    }

    holder.unlock().expect("release the lock");
    match waiter.try_lock() {
        Ok(()) => println!("3. the lock is free once the holder releases it"),
        Err(error) => println!("3. still refused after unlock: {error:?}"),
    }
}
