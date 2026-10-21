"""Dump Maia2's move vocabulary and Elo bucket table as static JSON assets.

Both are deterministic functions of the official ``maia2`` package's own
source (``get_all_possible_moves`` / ``create_elo_dict``) with no model
weights involved, so we regenerate them ourselves rather than trust a
third party's copy. The JS port loads these JSON files verbatim instead of
re-deriving the move vocabulary from a different chess library, which could
silently produce a different ordering.
"""

import json
from pathlib import Path

from maia2.utils import create_elo_dict, get_all_possible_moves

OUT_DIR = Path(__file__).resolve().parent.parent / "extension" / "core" / "data"


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_moves = get_all_possible_moves()
    assert len(all_moves) == len(set(all_moves)), "move vocabulary has duplicates"
    vocab_path = OUT_DIR / "move-vocab.json"
    vocab_path.write_text(json.dumps(all_moves, indent=None), encoding="utf-8")
    print(f"wrote {vocab_path} ({len(all_moves)} moves)")

    elo_dict = create_elo_dict()
    elo_path = OUT_DIR / "elo-buckets.json"
    elo_path.write_text(json.dumps(elo_dict, indent=2), encoding="utf-8")
    print(f"wrote {elo_path} ({len(elo_dict)} buckets)")
    print(elo_dict)


if __name__ == "__main__":
    main()
