#!/usr/bin/env python3
"""
extract_layout.py

Dev-side authoring tool. NOT meant to be exposed in the poster app itself —
run this locally when adding a new template, sanity-check the output against
the actual poster, then hand-commit the values into TEMPLATES in code.

Combines two unreliable-alone sources into one:
  - Pixel diff (clean.png vs final.png)  -> ground truth for x, y, width,
    height, and alignment (this is the thing that kept breaking when an
    agent hand-translated Figma "Copy CSS").
  - Figma "Copy CSS"                     -> ground truth for font-family,
    font-size, font-weight, color, letter-spacing (things pixels alone
    can't tell you).

Usage:
    python extract_layout.py --clean background.png --final final_poster.png \
        --css figma_copy.css --out layout.json

Then open layout.json, check the "flags" on each block, and only copy
values you've visually confirmed into your TEMPLATES config.
"""

import argparse
import json
import re
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("Needs Pillow and numpy: pip install pillow numpy")


# ---------------------------------------------------------------------------
# Step 1: pixel diff -> candidate text blocks with real x/y/align
# ---------------------------------------------------------------------------

def load_diff_mask(clean_path, final_path, threshold=18):
    clean = Image.open(clean_path).convert("RGB")
    final = Image.open(final_path).convert("RGB")
    if clean.size != final.size:
        sys.exit(
            f"Image size mismatch: {clean_path} is {clean.size}, "
            f"{final_path} is {final.size}. Export both at the same pixel size."
        )
    a = np.asarray(clean, dtype=np.int32)
    b = np.asarray(final, dtype=np.int32)
    dist = np.sqrt(((a - b) ** 2).sum(axis=2))
    return dist > threshold  # boolean H x W mask


def group_rows_into_bands(mask, line_gap=14, block_gap=34):
    """
    Row-projection pass. Returns a list of "blocks", where each block is a
    list of (row_start, row_end) line-bands that are close enough together
    (< line_gap) to be the same paragraph, separated from other blocks by
    at least block_gap.
    """
    row_has_ink = mask.any(axis=1)
    rows = np.where(row_has_ink)[0]
    if len(rows) == 0:
        return []

    # collapse consecutive rows into raw line segments first
    lines = []
    start = rows[0]
    prev = rows[0]
    for r in rows[1:]:
        if r - prev > 1:
            lines.append((start, prev))
            start = r
        prev = r
    lines.append((start, prev))

    # merge lines into blocks based on gap size
    blocks = [[lines[0]]]
    for line in lines[1:]:
        gap = line[0] - blocks[-1][-1][1]
        if gap <= line_gap:
            blocks[-1].append(line)
        elif gap <= block_gap:
            blocks[-1].append(line)  # still same paragraph, looser line-height
        else:
            blocks.append([line])
    return blocks


def analyze_block(mask, lines):
    """Given the line-bands for one block, compute bbox + alignment guess."""
    row_start = lines[0][0]
    row_end = lines[-1][1]

    line_edges = []  # (left, right, width) per line
    for r0, r1 in lines:
        col_has_ink = mask[r0:r1 + 1, :].any(axis=0)
        cols = np.where(col_has_ink)[0]
        if len(cols) == 0:
            continue
        line_edges.append((int(cols[0]), int(cols[-1])))

    if not line_edges:
        return None

    x_min = min(l for l, _ in line_edges)
    x_max = max(r for _, r in line_edges)
    lefts = [l for l, _ in line_edges]
    centers = [(l + r) / 2 for l, r in line_edges]

    align = "single-line"
    if len(line_edges) > 1:
        left_spread = max(lefts) - min(lefts)
        center_spread = max(centers) - min(centers)
        if left_spread <= center_spread:
            align = "left"
        else:
            align = "center"

    avg_line_height = (row_end - row_start + 1) / len(lines)
    # rough cap-height -> font-size heuristic; varies by typeface, treat as
    # a starting guess only, not a final value
    est_font_size = round(avg_line_height / 0.72)

    return {
        "y_top": int(row_start),
        "y_bottom": int(row_end),
        "x_left": int(x_min),
        "x_right": int(x_max),
        "width": int(x_max - x_min),
        "height": int(row_end - row_start),
        "line_count": len(line_edges),
        "detected_align": align,
        "estimated_font_size_px": est_font_size,
    }


# ---------------------------------------------------------------------------
# Step 2: parse pasted Figma "Copy as CSS" text -> per-layer style props
# ---------------------------------------------------------------------------

CSS_PROP_RE = re.compile(r"([a-zA-Z-]+)\s*:\s*([^;]+);")

def parse_css_blob(css_text):
    """
    Figma's "Copy as CSS" gives one or more blocks. When multiple layers are
    selected it just concatenates several rule-ish chunks. We don't rely on
    selector names (Figma's are usually unhelpful, e.g. "Frame 42") — we
    only pull declarations in the order they appear and treat each
    top-level brace group as one layer.
    """
    blocks = re.findall(r"\{([^}]*)\}", css_text)
    if not blocks:
        # user may have pasted bare declarations with no braces at all
        blocks = [css_text]

    layers = []
    for block in blocks:
        props = {}
        for prop, val in CSS_PROP_RE.findall(block):
            props[prop.strip().lower()] = val.strip()
        if props:
            layers.append(props)
    return layers


def extract_style(props):
    return {
        "font_family": props.get("font-family", "").strip('"\' '),
        "font_size_css": props.get("font-size", ""),
        "font_weight": props.get("font-weight", ""),
        "color": props.get("color", ""),
        "letter_spacing": props.get("letter-spacing", ""),
        "line_height": props.get("line-height", ""),
        "css_text_align": props.get("text-align", ""),
    }


def px_to_float(val):
    if not val:
        return None
    m = re.match(r"([\d.]+)px", val.strip())
    return float(m.group(1)) if m else None


# ---------------------------------------------------------------------------
# Step 3: reconcile — pixels win for position/align, CSS wins for styling,
# flag anything that disagrees enough to need a human look
# ---------------------------------------------------------------------------

def reconcile(diff_blocks, css_layers):
    n = max(len(diff_blocks), len(css_layers))
    if len(diff_blocks) != len(css_layers):
        print(
            f"⚠️  Count mismatch: pixel diff found {len(diff_blocks)} text "
            f"block(s), CSS paste had {len(css_layers)} layer(s). "
            f"Matching by order — check the tail entries by hand.",
            file=sys.stderr,
        )

    results = []
    for i in range(n):
        diff = diff_blocks[i] if i < len(diff_blocks) else None
        css = css_layers[i] if i < len(css_layers) else None
        style = extract_style(css) if css else {}

        flags = []
        entry = {"index": i}

        if diff:
            entry.update({
                "x_left": diff["x_left"],
                "x_right": diff["x_right"],
                "y_top": diff["y_top"],
                "y_bottom": diff["y_bottom"],
                "width": diff["width"],
                "height": diff["height"],
                "align": diff["detected_align"],
            })
        else:
            flags.append("No matching pixel-diff block found for this CSS layer.")

        if style:
            entry.update(style)
            css_align = style.get("css_text_align", "").lower()
            if diff and css_align and css_align != "single-line":
                if css_align in ("left", "center", "right") and diff["detected_align"] not in ("single-line",):
                    if css_align != diff["detected_align"]:
                        flags.append(
                            f"Alignment mismatch: CSS says '{css_align}', "
                            f"pixels show '{diff['detected_align']}'. "
                            f"Trust the pixels — set align='{diff['detected_align']}'."
                        )
            css_size = px_to_float(style.get("font_size_css"))
            if diff and css_size:
                est = diff["estimated_font_size_px"]
                if abs(css_size - est) / css_size > 0.18:
                    flags.append(
                        f"Font-size check: CSS says {css_size}px, pixel bbox "
                        f"implies ~{est}px. If far off, the font may not be "
                        f"loading (fallback font substitution) or line-height "
                        f"differs from what you expect."
                    )
        else:
            flags.append("No matching CSS layer found for this pixel-diff block — style unknown, fill in manually.")

        entry["flags"] = flags
        results.append(entry)
    return results


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--clean", required=True, help="Path to blank background export")
    ap.add_argument("--final", required=True, help="Path to same export with sample copy filled in")
    ap.add_argument("--css", required=True, help="Path to a text file containing pasted Figma 'Copy as CSS' output")
    ap.add_argument("--out", default="layout.json", help="Output JSON path")
    ap.add_argument("--diff-threshold", type=int, default=18, help="Pixel color-distance threshold to count as changed")
    ap.add_argument("--line-gap", type=int, default=14, help="Max px gap between lines to treat as same paragraph")
    ap.add_argument("--block-gap", type=int, default=34, help="Max px gap to still merge into one block")
    args = ap.parse_args()

    mask = load_diff_mask(args.clean, args.final, args.diff_threshold)
    bands = group_rows_into_bands(mask, args.line_gap, args.block_gap)
    diff_blocks = [b for b in (analyze_block(mask, lines) for lines in bands) if b]

    with open(args.css, "r") as f:
        css_layers = parse_css_blob(f.read())

    results = reconcile(diff_blocks, css_layers)

    with open(args.out, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{len(results)} text block(s) written to {args.out}\n")
    for r in results:
        flag_note = f"  ⚠ {len(r['flags'])} flag(s)" if r["flags"] else "  ✓ clean"
        print(f"  [{r['index']}] x={r.get('x_left')} y={r.get('y_top')} align={r.get('align')}{flag_note}")
        for fl in r["flags"]:
            print(f"        - {fl}")
    print("\nReview flagged entries against the actual poster before committing to TEMPLATES.\n")


if __name__ == "__main__":
    main()
