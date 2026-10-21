"""Export the official Maia2 PyTorch checkpoints to ONNX ourselves.

Input/output naming follows the model's own forward() signature
(MAIA2Model.forward(self, boards, elos_self, elos_oppo) -> logits_maia,
logits_side_info, logits_value) read directly from the installed maia2
package. We trace with the real checkpoint loaded via maia2.model.from_pretrained,
which SHA256-verifies the weights before this script ever sees them.
"""

import json
from pathlib import Path

import torch

from maia2 import model as maia2_model

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "extension" / "public" / "models"
CKPT_DIR = ROOT / "maia2_models"
OPSET = 17


def export_one(kind: str):
    print(f"Loading verified {kind} checkpoint...")
    model = maia2_model.from_pretrained(type=kind, device="cpu", save_root=str(CKPT_DIR))
    model.eval()

    boards = torch.zeros(1, 18, 8, 8, dtype=torch.float32)
    elo_self = torch.zeros(1, dtype=torch.long)
    elo_oppo = torch.zeros(1, dtype=torch.long)

    out_path = OUT_DIR / f"maia2-{kind}.onnx"
    torch.onnx.export(
        model,
        (boards, elo_self, elo_oppo),
        str(out_path),
        input_names=["boards", "elo_self", "elo_oppo"],
        output_names=["logits_maia", "logits_side_info", "logits_value"],
        dynamic_axes={
            "boards": {0: "batch"},
            "elo_self": {0: "batch"},
            "elo_oppo": {0: "batch"},
            "logits_maia": {0: "batch"},
            "logits_side_info": {0: "batch"},
            "logits_value": {0: "batch"},
        },
        opset_version=OPSET,
        do_constant_folding=True,
    )
    print(f"wrote {out_path} ({out_path.stat().st_size / 1e6:.1f} MB)")
    return model


def write_manifest(models_info):
    manifest_path = OUT_DIR / "models.json"
    manifest_path.write_text(json.dumps(models_info, indent=2), encoding="utf-8")
    print(f"wrote {manifest_path}")


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    info = {}
    for kind in ("rapid", "blitz"):
        export_one(kind)
        onnx_path = OUT_DIR / f"maia2-{kind}.onnx"
        info[kind] = {
            "file": onnx_path.name,
            "opset": OPSET,
            "inputs": {
                "boards": "float32[batch,18,8,8]",
                "elo_self": "int64[batch]",
                "elo_oppo": "int64[batch]",
            },
            "outputs": {
                "logits_maia": "float32[batch,1880] (policy logits, needs legal-move mask + softmax)",
                "logits_side_info": "float32[batch,2021] (auxiliary training signal: 6+6+1 piece/capture/check one-hots + 64+64 from/to-square one-hots + 1880 legal-move mask; unused at inference)",
                "logits_value": "float32[batch] (raw value; winProbWhite = clamp(v/2+0.5, 0, 1))",
            },
        }
    write_manifest(info)
