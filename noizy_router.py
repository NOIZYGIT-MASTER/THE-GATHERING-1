#!/usr/bin/env python3
"""
NOIZY ROUTER — local-first AI tiering for the M2 Ultra (192 GB).

Purpose
-------
Route each task to the cheapest capable engine and keep sensitive
catalog/identity data ON-MACHINE. Claude is reserved for hard reasoning;
local Ollama handles bulk, drafts, classification, and anything private.

Tiers
-----
  LOCAL_FAST  -> small local model   (classification, extraction, short drafts)
  LOCAL_DEEP  -> large local model   (summaries, reasoning over private data)
  ESCALATE    -> Claude / cloud       (hard reasoning, synthesis, code, strategy)

Sovereignty rule
----------------
If a task is flagged sensitive (contracts, royalties, unreleased catalog,
personal identity, secrets), it is PINNED to local — never escalated to cloud —
regardless of difficulty. Privacy beats convenience. This is a design goal,
not a setting.

Usage
-----
  python3 noizy_router.py "summarise this contract clause"        # decide only
  python3 noizy_router.py --run "write 3 taglines for noizykidz"   # decide + run local
  echo "long text..." | python3 noizy_router.py --run -            # read task from stdin

Zero third-party dependencies (urllib only). Talks to Ollama on :11434.
"""

import json
import re
import sys
import urllib.request
import urllib.error

OLLAMA = "http://127.0.0.1:11434"

# ---- model map — edit to match `ollama list` on the box ----------------------
MODELS = {
    "LOCAL_FAST": "gemma3:latest",  # fast/cheap; swap for your smallest good model
    "LOCAL_DEEP": "phi4:latest",    # heavyweight local reasoning on the 192 GB rig
}

# ---- routing signals ---------------------------------------------------------
SENSITIVE = re.compile(
    r"\b(contract|royalt|advance|master rights|publishing split|unreleased|"
    r"pre-?release|stems?|isrc|upc|ssn|passport|bank|iban|api[_ ]?key|secret|"
    r"token|password|private key|nda|settlement|lawsuit|minor|child)\b",
    re.I,
)
HARD = re.compile(
    r"\b(architect|strategy|design a system|refactor|debug|prove|trade-?off|"
    r"legal analysis|negotiat|multi-step plan|reconcile|synthesi[sz]e across|"
    r"write code|implement|algorithm)\b",
    re.I,
)
BULK = re.compile(
    r"\b(classif|tag|label|extract|list|rename|reformat|translate|transcrib|"
    r"summari[sz]e|tl;?dr|draft a (tweet|caption|tagline|reply)|bullet)\b",
    re.I,
)


def decide(task: str) -> dict:
    """Return a routing decision with a human-readable reason."""
    t = task.strip()
    length = len(t)

    # Force FOSS doctrine (Rob requested ALL FOSS until further notice)
    # Never escalate to cloud/Claude.
    
    if SENSITIVE.search(t):
        tier = "LOCAL_DEEP"
        reason = "sensitive content — pinned local for sovereignty"
        pinned = True
    elif HARD.search(t) or length > 6000:
        tier = "LOCAL_DEEP"
        reason = "hard reasoning / large context — routed to local deep model (FOSS override)"
        pinned = True
    elif BULK.search(t) or length < 800:
        tier = "LOCAL_FAST"
        reason = "bulk / short task — local fast model (FOSS)"
        pinned = True
    else:
        tier = "LOCAL_DEEP"
        reason = "general task — local deep model (FOSS)"
        pinned = True

    return {
        "tier": tier,
        "engine": MODELS.get(tier, "local"),
        "pinned_local": pinned,
        "reason": reason,
        "chars": length,
    }


def run_local(task: str, model: str) -> str:
    """Call Ollama's /api/generate (non-streaming)."""
    payload = json.dumps({"model": model, "prompt": task, "stream": False}).encode()
    req = urllib.request.Request(
        f"{OLLAMA}/api/generate", data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read()).get("response", "").strip()
    except urllib.error.URLError as e:
        return f"[router] Ollama unreachable on :11434 ({e}). Is the service up?"


def main(argv):
    run = False
    args = [a for a in argv[1:]]
    if "--run" in args:
        run = True
        args.remove("--run")
    if not args:
        print(__doc__)
        return 0

    task = args[0]
    if task == "-":
        task = sys.stdin.read()

    d = decide(task)
    print(f"→ tier:   {d['tier']}")
    print(f"→ engine: {d['engine']}")
    print(f"→ why:    {d['reason']}")
    if d["pinned_local"]:
        print("→ LOCK:   sovereignty pin — this will not leave the machine")

    if d["tier"] == "ESCALATE":
        print("\n[router] Escalate this to Claude (cloud). Not run locally.")
        return 0

    if run:
        print("\n--- local output ---")
        print(run_local(task, d["engine"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
