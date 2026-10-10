// Generated draft from src/native_service_target.rs; sha256=c8fa1aa66aa04abc9a5241f430aa6cdbad0356db355283c112a28371dde61d73
// Carried constructs are data, never runtime parity evidence.
function codex_history_notes_operation(path) {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  if ((path === "/api/services/codex/v1/alpha/history/v2/list_windows")) {
    return Object.freeze({ $: 'Some', field0: "codex.history.list_windows" });
  } else {
    if ((path === "/api/services/codex/v1/alpha/history/v2/list_items")) {
      return Object.freeze({ $: 'Some', field0: "codex.history.list_items" });
    } else {
      if ((path === "/api/services/codex/v1/alpha/history/v2/read_item")) {
        return Object.freeze({ $: 'Some', field0: "codex.history.read_item" });
      } else {
        if ((path === "/api/services/codex/v1/alpha/history/v2/search_contents")) {
          return Object.freeze({ $: 'Some', field0: "codex.history.search_contents" });
        } else {
          if ((path === "/api/services/codex/v1/alpha/notes/v2/thread_hint")) {
            return Object.freeze({ $: 'Some', field0: "codex.notes.thread_hint" });
          } else {
            if ((path === "/api/services/codex/v1/alpha/notes/v2/list_files_by_prefix")) {
              return Object.freeze({ $: 'Some', field0: "codex.notes.list_files_by_prefix" });
            } else {
              if ((path === "/api/services/codex/v1/alpha/notes/v2/read_file")) {
                return Object.freeze({ $: 'Some', field0: "codex.notes.read_file" });
              } else {
                if ((path === "/api/services/codex/v1/alpha/notes/v2/search_contents")) {
                  return Object.freeze({ $: 'Some', field0: "codex.notes.search_contents" });
                } else {
                  if ((path === "/api/services/codex/v1/alpha/notes/v2/append_to_file")) {
                    return Object.freeze({ $: 'Some', field0: "codex.notes.append_to_file" });
                  } else {
                    if ((path === "/api/services/codex/v1/alpha/notes/v2/write_file")) {
                      return Object.freeze({ $: 'Some', field0: "codex.notes.write_file" });
                    } else {
                      return Object.freeze({ $: 'None' });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export const translated = { codex_history_notes_operation };
export const provenance = {"sourcePath":"src/native_service_target.rs","sourceSha256":"c8fa1aa66aa04abc9a5241f430aa6cdbad0356db355283c112a28371dde61d73","executable":1,"executableFunctions":1,"executableConstants":0,"carried":20,"preserved":21,"runtimeParity":false};
