// Generated draft from src/thinking/anthropic.rs; sha256=5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_DEFAULT_MAX_TOKENS() {
  return 8192n;
}

function CLAUDE_MIN_THINKING_BUDGET() {
  return 1024n;
}

function CLAUDE_OUTPUT_HEADROOM() {
  return 8192n;
}

function CLAUDE_OUTPUT_FLOOR() {
  return 4096n;
}

function CLAUDE_FIXED_TOKEN_CEILING() {
  return 32000n;
}

function CLAUDE_ADAPTIVE_TOKEN_CEILING() {
  return 40192n;
}

function reasoning_budget(effort) {
  if (!(typeof effort === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(effort))) throw new TypeError('argument outside supported Rust value domain');
  if ((effort === "minimal")) {
    return 1024n;
  } else {
    if ((effort === "low")) {
      return 4096n;
    } else {
      if ((effort === "medium")) {
        return 8192n;
      } else {
        if ((effort === "xhigh")) {
          return 24576n;
        } else {
          if ((effort === "max")) {
            return 32000n;
          } else {
            return 16384n;
          }
        }
      }
    }
  }
}

function adaptive_effort(effort) {
  if (!(typeof effort === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(effort))) throw new TypeError('argument outside supported Rust value domain');
  if ((effort === "minimal")) {
    return "low";
  } else {
    if ((effort === "low")) {
      return "low";
    } else {
      if ((effort === "medium")) {
        return "medium";
      } else {
        if ((effort === "xhigh")) {
          return "max";
        } else {
          if ((effort === "max")) {
            return "max";
          } else {
            return "high";
          }
        }
      }
    }
  }
}

export const translated = { "CLAUDE_DEFAULT_MAX_TOKENS": CLAUDE_DEFAULT_MAX_TOKENS(), "CLAUDE_MIN_THINKING_BUDGET": CLAUDE_MIN_THINKING_BUDGET(), "CLAUDE_OUTPUT_HEADROOM": CLAUDE_OUTPUT_HEADROOM(), "CLAUDE_OUTPUT_FLOOR": CLAUDE_OUTPUT_FLOOR(), "CLAUDE_FIXED_TOKEN_CEILING": CLAUDE_FIXED_TOKEN_CEILING(), "CLAUDE_ADAPTIVE_TOKEN_CEILING": CLAUDE_ADAPTIVE_TOKEN_CEILING(), reasoning_budget, adaptive_effort };
export const provenance = {"sourcePath":"src/thinking/anthropic.rs","sourceSha256":"5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da","executable":8,"executableFunctions":2,"executableConstants":6,"carried":4,"preserved":13,"runtimeParity":false};
