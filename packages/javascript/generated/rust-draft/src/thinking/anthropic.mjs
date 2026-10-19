// Generated draft from src/thinking/anthropic.rs; sha256=5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da
// Carried constructs are data, never runtime parity evidence.
function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f44454641554c545f4d41585f544f4b454e53() {
  return 8192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4d494e5f5448494e4b494e475f425544474554() {
  return 1024n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f48454144524f4f4d() {
  return 8192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f464c4f4f52() {
  return 4096n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f46495845445f544f4b454e5f4345494c494e47() {
  return 32000n;
}

function rp_7468696e6b696e672e616e7468726f7069632e434c415544455f41444150544956455f544f4b454e5f4345494c494e47() {
  return 40192n;
}

function rp_7468696e6b696e672e616e7468726f7069632e726561736f6e696e675f627564676574(effort) {
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

function rp_7468696e6b696e672e616e7468726f7069632e61646170746976655f6566666f7274(effort) {
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

export const translated = { ["CLAUDE_DEFAULT_MAX_TOKENS"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f44454641554c545f4d41585f544f4b454e53(), ["CLAUDE_MIN_THINKING_BUDGET"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4d494e5f5448494e4b494e475f425544474554(), ["CLAUDE_OUTPUT_HEADROOM"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f48454144524f4f4d(), ["CLAUDE_OUTPUT_FLOOR"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f4f55545055545f464c4f4f52(), ["CLAUDE_FIXED_TOKEN_CEILING"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f46495845445f544f4b454e5f4345494c494e47(), ["CLAUDE_ADAPTIVE_TOKEN_CEILING"]: rp_7468696e6b696e672e616e7468726f7069632e434c415544455f41444150544956455f544f4b454e5f4345494c494e47(), ["reasoning_budget"]: rp_7468696e6b696e672e616e7468726f7069632e726561736f6e696e675f627564676574, ["adaptive_effort"]: rp_7468696e6b696e672e616e7468726f7069632e61646170746976655f6566666f7274 };
export const provenance = {"sourcePath":"src/thinking/anthropic.rs","sourceSha256":"5f70c30a7f886ba0de83049872f598e3c18c9f5e9f5d2b070cbc9252d52aa2da","executable":8,"executableFunctions":2,"executableConstants":6,"executableTypes":0,"executableConstructors":0,"carried":4,"preserved":13,"runtimeParity":false};
