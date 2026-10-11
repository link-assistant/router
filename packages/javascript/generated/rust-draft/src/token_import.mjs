// Generated draft from src/token_import.rs; sha256=cab8e9946b0f348c195d39ac22b0a90e97e3d254c3d5c3fa2058bbc1742c69c8
// Carried constructs are data, never runtime parity evidence.
function BACKUP_DIRECTORY() {
  return "token-import-backups";
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
};

const serde_json = {
  error: {

  },
};

function ml_make_ImportMode_MergeMissing() {
  return Object.freeze({ $: 'MergeMissing' });
}

function ml_make_ImportMode_Replace() {
  return Object.freeze({ $: 'Replace' });
}

export const translated = { ["BACKUP_DIRECTORY"]: BACKUP_DIRECTORY(), ["ImportMode"]: Object.freeze({ ["MergeMissing"]: ml_make_ImportMode_MergeMissing, ["Replace"]: ml_make_ImportMode_Replace }) };
export const provenance = {"sourcePath":"src/token_import.rs","sourceSha256":"cab8e9946b0f348c195d39ac22b0a90e97e3d254c3d5c3fa2058bbc1742c69c8","executable":2,"executableFunctions":0,"executableConstants":1,"executableTypes":1,"executableConstructors":2,"carried":24,"preserved":27,"runtimeParity":false};
