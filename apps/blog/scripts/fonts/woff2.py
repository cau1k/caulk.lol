#!/usr/bin/env python3
"""Generate lossless WOFF2 companions for the public latin CMU webfonts.

The system `woff2_compress` binary accepts sfnt/TTF input, not WOFF. This script
uses fontTools to unpack each WOFF into a temporary TTF, compresses that TTF with
the installed Google WOFF2 tools, then decompresses the WOFF2 and checks that the
glyph set, Unicode map, metrics, and glyf outlines match the original WOFF.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
FONT_DIRS = (
    ROOT / "apps/blog/public/fonts/cmu-serif",
    ROOT / "apps/blog/public/fonts/cmu-sans",
)
TTFont = None


@dataclass(frozen=True)
class FontRecord:
    source: str
    output: str
    source_sha256: str
    output_sha256: str
    glyphs: int
    cmap_entries: int


def main() -> None:
    args = parse_args()
    load_fonttools(args.extra_python_path)
    compressor = require_tool(args.woff2_compress)
    decompressor = require_tool(args.woff2_decompress)
    records = [
        convert_font(path, compressor, decompressor, args.check, args.check_only)
        for path in latin_woff_paths()
    ]
    print(json.dumps([asdict(record) for record in records], indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--woff2-compress", default="woff2_compress")
    parser.add_argument("--woff2-decompress", default="woff2_decompress")
    parser.add_argument(
        "--extra-python-path",
        action="append",
        default=[],
        help="append an existing site-packages path after stdlib paths",
    )
    parser.add_argument(
        "--check",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="verify generated WOFF2 files by decompressing and comparing tables",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="regenerate into a temp dir and fail if checked-in WOFF2 files are stale",
    )
    return parser.parse_args()


def load_fonttools(extra_python_paths: list[str]) -> None:
    for path in extra_python_paths:
        sys.path.append(path)

    global TTFont
    from fontTools.ttLib import TTFont as loaded_tt_font

    TTFont = loaded_tt_font


def latin_woff_paths() -> list[Path]:
    paths = sorted(
        path
        for directory in FONT_DIRS
        for path in directory.glob("*-latin.woff")
    )
    if not paths:
        raise RuntimeError("No latin WOFF inputs found.")
    return paths


def require_tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Missing required tool: {name}")
    return path


def convert_font(
    source: Path,
    compressor: str,
    decompressor: str,
    check: bool,
    check_only: bool,
) -> FontRecord:
    output = source.with_suffix(".woff2")
    with tempfile.TemporaryDirectory(prefix="caulk-font-") as directory:
        temp = Path(directory)
        unpacked = temp / f"{source.stem}.ttf"
        generated_woff2 = unpacked.with_suffix(".woff2")
        decompressed = temp / source.with_suffix(".ttf").name

        original = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
        original.flavor = None
        original.save(unpacked, reorderTables=False)

        subprocess.run([compressor, str(unpacked)], check=True)
        if check_only:
            if not output.exists():
                raise RuntimeError(f"Missing generated font: {output}")
            if generated_woff2.read_bytes() != output.read_bytes():
                raise RuntimeError(f"Generated font is stale: {output}")
        else:
            shutil.copyfile(generated_woff2, output)

        if check:
            shutil.copyfile(output, temp / source.with_suffix(".woff2").name)
            subprocess.run(
                [decompressor, str(temp / source.with_suffix(".woff2").name)],
                check=True,
                stdout=subprocess.DEVNULL,
            )
            verify_lossless(source, decompressed)

    font = TTFont(source)
    return FontRecord(
        source=relative(source),
        output=relative(output),
        source_sha256=sha256(source),
        output_sha256=sha256(output),
        glyphs=len(font.getGlyphOrder()),
        cmap_entries=len(best_cmap(font)),
    )


def verify_lossless(source: Path, decompressed: Path) -> None:
    original = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    generated = TTFont(decompressed, recalcTimestamp=False, recalcBBoxes=False)
    if original.getGlyphOrder() != generated.getGlyphOrder():
        raise RuntimeError(f"Glyph order changed: {source}")
    if best_cmap(original) != best_cmap(generated):
        raise RuntimeError(f"Unicode cmap changed: {source}")
    if original["hmtx"].metrics != generated["hmtx"].metrics:
        raise RuntimeError(f"Horizontal metrics changed: {source}")
    if compiled_glyphs(original) != compiled_glyphs(generated):
        raise RuntimeError(f"Glyph outlines changed: {source}")


def best_cmap(font: TTFont) -> dict[int, str]:
    return font.getBestCmap() or {}


def compiled_glyphs(font: TTFont) -> dict[str, bytes]:
    glyf = font["glyf"]
    return {
        glyph_name: glyf[glyph_name].compile(glyf)
        for glyph_name in font.getGlyphOrder()
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


if __name__ == "__main__":
    main()
