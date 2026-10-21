"""Generate golden-value test fixtures from the real maia2 package, and verify
our own ONNX export reproduces them bit-for-bit (within float tolerance).

These fixtures are what the future TypeScript port gets checked against —
nothing here is borrowed from a third party; every expected value is
produced by the official PyTorch model, straight from the verified
checkpoints, using maia2's own preprocessing/postprocessing code
(maia2.inference.preprocessing / inference_each).
"""

import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from maia2 import model as maia2_model
from maia2.inference import inference_each, prepare
from maia2.utils import map_to_category

ROOT = Path(__file__).resolve().parent.parent
ONNX_DIR = ROOT / "extension" / "public" / "models"
FIXTURES_DIR = ROOT / "extension" / "tests" / "fixtures"
CKPT_DIR = ROOT / "maia2_models"

POSITIONS = [
    ("startpos", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 1500, 1500),
    ("after_e4_black_ep", "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", 1200, 1900),
    (
        "italian_midgame",
        "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4",
        1600,
        1600,
    ),
    (
        "black_to_move_asym_castling",
        "r3k2r/pppqbppp/2n1bn2/1B2p3/4P3/2N1BN2/PPPQ1PPP/R3K2R b kq - 6 8",
        1100,
        2100,
    ),
    (
        "near_promotion_white",
        "8/4Pppk/8/8/8/8/5PPP/6K1 w - - 0 1",
        1900,
        1000,
    ),
    (
        "near_promotion_black_mirrors_to_white_vocab",
        "6k1/5ppp/8/8/8/8/4pPPK/8 b - - 0 1",
        1900,
        1000,
    ),
    (
        "queenside_castle_available",
        "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
        1500,
        1500,
    ),
    (
        "endgame_rook_vs_pawns",
        "8/8/4k3/8/8/4K3/4R3/8 w - - 0 1",
        2000,
        1000,
    ),
    (
        "sicilian_black_to_move",
        "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 5",
        1400,
        1400,
    ),
    (
        "endgame_black_to_move_low_elo",
        "8/8/8/3k4/3K4/8/8/8 b - - 0 1",
        950,
        950,
    ),
]


def run_onnx(session, board_input, elo_self_idx, elo_oppo_idx):
    boards = board_input.unsqueeze(0).numpy().astype(np.float32)
    elo_self = np.array([elo_self_idx], dtype=np.int64)
    elo_oppo = np.array([elo_oppo_idx], dtype=np.int64)
    logits_maia, _, logits_value = session.run(
        ["logits_maia", "logits_side_info", "logits_value"],
        {"boards": boards, "elo_self": elo_self, "elo_oppo": elo_oppo},
    )
    return logits_maia[0], float(logits_value[0])


def softmax_masked(logits, legal_idx):
    masked = np.full_like(logits, -np.inf)
    masked[legal_idx] = logits[legal_idx]
    masked = masked - np.max(masked)
    exp = np.exp(masked)
    return exp / exp.sum()


def gen_for_kind(kind: str):
    print(f"\n=== {kind} ===")
    model = maia2_model.from_pretrained(type=kind, device="cpu", save_root=str(CKPT_DIR))
    model.eval()
    session = ort.InferenceSession(
        str(ONNX_DIR / f"maia2-{kind}.onnx"), providers=["CPUExecutionProvider"]
    )
    prepared = prepare()
    all_moves_dict, elo_dict, all_moves_dict_reversed = prepared

    cases = []
    max_prob_diff = 0.0
    max_value_diff = 0.0

    for label, fen, elo_self, elo_oppo in POSITIONS:
        move_probs, win_prob = inference_each(model, prepared, fen, elo_self, elo_oppo)

        from maia2.inference import preprocessing

        board_input, elo_self_idx, elo_oppo_idx, legal_moves = preprocessing(
            fen, elo_self, elo_oppo, elo_dict, all_moves_dict
        )
        legal_idx = legal_moves.nonzero(as_tuple=True)[0].numpy()

        onnx_logits, onnx_raw_value = run_onnx(session, board_input, elo_self_idx, elo_oppo_idx)
        onnx_probs = softmax_masked(onnx_logits, legal_idx)
        onnx_win_prob = float(np.clip(onnx_raw_value / 2 + 0.5, 0, 1))
        black_to_move = fen.split(" ")[1] == "b"
        if black_to_move:
            onnx_win_prob = 1 - onnx_win_prob

        best_move_mirrored_idx = int(np.argmax(onnx_probs[legal_idx]))
        best_idx = int(legal_idx[best_move_mirrored_idx])
        best_move_uci = all_moves_dict_reversed[best_idx]
        if black_to_move:
            from maia2.utils import mirror_move

            best_move_uci = mirror_move(best_move_uci)

        torch_best_move, torch_best_prob = next(iter(move_probs.items()))
        onnx_best_prob = float(onnx_probs[best_idx])
        prob_diff = abs(torch_best_prob - onnx_best_prob)
        value_diff = abs(win_prob - onnx_win_prob)
        max_prob_diff = max(max_prob_diff, prob_diff)
        max_value_diff = max(max_value_diff, value_diff)

        status = "OK" if (best_move_uci == torch_best_move and prob_diff < 1e-3 and value_diff < 1e-3) else "MISMATCH"
        print(
            f"[{status}] {label}: torch_best={torch_best_move}({torch_best_prob}) "
            f"onnx_best={best_move_uci}({onnx_best_prob:.4f}) "
            f"win_prob torch={win_prob} onnx={onnx_win_prob:.4f}"
        )

        cases.append(
            {
                "label": label,
                "fen": fen,
                "elo_self": elo_self,
                "elo_oppo": elo_oppo,
                "elo_self_idx": elo_self_idx,
                "elo_oppo_idx": elo_oppo_idx,
                "best_move": torch_best_move,
                "win_prob": win_prob,
                "move_probs": move_probs,
            }
        )

    print(f"max best-move prob diff (torch vs onnx): {max_prob_diff:.6f}")
    print(f"max win_prob diff (torch vs onnx): {max_value_diff:.6f}")

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FIXTURES_DIR / f"fixtures_{kind}.json"
    out_path.write_text(json.dumps({"cases": cases}, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    for kind in ("rapid", "blitz"):
        gen_for_kind(kind)
