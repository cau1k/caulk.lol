#!/usr/bin/env python3
"""Generate WOFF2 CMU webfont assets from checked-in WOFF sources.

The full ``*-latin.woff2`` files are lossless WOFF2 companions for the original
latin WOFF files. The ``*-latin-core.woff2`` and ``*-latin-ext.woff2`` files split
that same cmap coverage with CSS ``unicode-range`` so ASCII first paint only
loads the smaller core face while extended Latin characters keep the exact CMU
outlines, metrics, and OpenType layout behavior.
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
MANIFEST = ROOT / "apps/blog/scripts/fonts/cmu-latin-subsets.json"
CORE_RANGES = (
    (0x0020, 0x007E),
    (0x2010, 0x2014),
    (0x2018, 0x201A),
    (0x201C, 0x201E),
    (0x2022, 0x2022),
    (0x2026, 0x2026),
)
EXT_RANGES = (
    (0x00A0, 0x00FF),
    (0x2039, 0x203A),
    (0x205F, 0x205F),
)
TTFont = None
subset = None


@dataclass(frozen=True)
class FontRecord:
    source: str
    output: str
    source_sha256: str
    output_sha256: str
    glyphs: int
    cmap_entries: int


@dataclass(frozen=True)
class FontFamilyRecord:
    source: str
    full: FontRecord
    core: FontRecord
    ext: FontRecord


def main() -> None:
    args = parse_args()
    load_fonttools(args.extra_python_path)
    compressor = require_tool(args.woff2_compress)
    decompressor = require_tool(args.woff2_decompress)
    records = [convert_family(path, compressor, decompressor, args.check, args.check_only) for path in latin_woff_paths()]
    manifest = {"generator_sha256": sha256(Path(__file__)), "families": [asdict(record) for record in records]}
    manifest_json = json.dumps(manifest, indent=2) + "\n"
    if args.check_only:
        if MANIFEST.read_text() != manifest_json:
            raise RuntimeError(f"Generated manifest is stale: {relative(MANIFEST)}")
    else:
        MANIFEST.write_text(manifest_json)
    print(manifest_json, end="")


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
        help="verify generated WOFF2 files by decompressing and comparing font tables",
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

    global TTFont, subset
    from fontTools import subset as loaded_subset
    from fontTools.ttLib import TTFont as loaded_tt_font

    TTFont = loaded_tt_font
    subset = loaded_subset


def latin_woff_paths() -> list[Path]:
    paths = sorted(path for directory in FONT_DIRS for path in directory.glob("*-latin.woff"))
    if not paths:
        raise RuntimeError("No latin WOFF inputs found.")
    return paths


def require_tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Missing required tool: {name}")
    return path


def convert_family(source: Path, compressor: str, decompressor: str, check: bool, check_only: bool) -> FontFamilyRecord:
    with tempfile.TemporaryDirectory(prefix="caulk-font-") as directory:
        temp = Path(directory)
        full_path = source.with_suffix(".woff2")
        core_path = subset_output(source, "core")
        ext_path = subset_output(source, "ext")
        full = write_woff2(source, full_path, None, temp, compressor, decompressor, check_only)
        core = write_woff2(source, core_path, CORE_RANGES, temp, compressor, decompressor, check_only)
        ext = write_woff2(source, ext_path, EXT_RANGES, temp, compressor, decompressor, check_only)

        if check:
            verify_lossless(source, full_path, decompressor, temp)
            verify_subset(source, core_path, CORE_RANGES, decompressor, temp)
            verify_subset(source, ext_path, EXT_RANGES, decompressor, temp)
            verify_union(source, (core_path, ext_path), decompressor, temp)

    return FontFamilyRecord(source=relative(source), full=full, core=core, ext=ext)


def write_woff2(
    source: Path,
    output: Path,
    ranges: tuple[tuple[int, int], ...] | None,
    temp: Path,
    compressor: str,
    decompressor: str,
    check_only: bool,
) -> FontRecord:
    font = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    if ranges is not None:
        subset_font(font, ranges)

    unpacked = temp / f"{output.stem}.ttf"
    generated_woff2 = unpacked.with_suffix(".woff2")
    font.flavor = None
    font.save(unpacked, reorderTables=False)
    subprocess.run([compressor, str(unpacked)], check=True, stdout=subprocess.DEVNULL)

    if check_only:
        if not output.exists():
            raise RuntimeError(f"Missing generated font: {output}")
        if generated_woff2.read_bytes() != output.read_bytes():
            raise RuntimeError(f"Generated font is stale: {output}")
    else:
        shutil.copyfile(generated_woff2, output)

    generated = decompress(output, decompressor, temp)
    return FontRecord(
        source=relative(source),
        output=relative(output),
        source_sha256=sha256(source),
        output_sha256=sha256(output),
        glyphs=len(generated.getGlyphOrder()),
        cmap_entries=len(best_cmap(generated)),
    )


def subset_font(font, ranges: tuple[tuple[int, int], ...]) -> None:
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.layout_features = ["*"]
    options.recommended_glyphs = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recalc_bounds = False
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=expand(ranges))
    sub.subset(font)


def verify_lossless(source: Path, output: Path, decompressor: str, temp: Path) -> None:
    original = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    generated = decompress(output, decompressor, temp)
    if original.getGlyphOrder() != generated.getGlyphOrder():
        raise RuntimeError(f"Glyph order changed: {source}")
    if best_cmap(original) != best_cmap(generated):
        raise RuntimeError(f"Unicode cmap changed: {source}")
    if original["hmtx"].metrics != generated["hmtx"].metrics:
        raise RuntimeError(f"Horizontal metrics changed: {source}")
    if compiled_glyphs(original) != compiled_glyphs(generated):
        raise RuntimeError(f"Glyph outlines changed: {source}")


def verify_subset(source: Path, output: Path, ranges: tuple[tuple[int, int], ...], decompressor: str, temp: Path) -> None:
    original = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    generated = decompress(output, decompressor, temp)
    expected_cmap = {codepoint: glyph for codepoint, glyph in best_cmap(original).items() if codepoint in expand(ranges)}
    if best_cmap(generated) != expected_cmap:
        raise RuntimeError(f"Subset cmap changed: {output}")
    original_tags = {tag for tags in layout_tags(original).values() for tag in tags}
    generated_tags = {tag for tags in layout_tags(generated).values() for tag in tags}
    if not generated_tags <= original_tags:
        raise RuntimeError(f"Unexpected OpenType layout features in subset: {output}")
    if ranges == CORE_RANGES and not {"liga", "kern"} <= generated_tags:
        raise RuntimeError(f"Core OpenType layout features changed: {output}")
    for glyph_name in set(expected_cmap.values()):
        if original["hmtx"].metrics[glyph_name] != generated["hmtx"].metrics[glyph_name]:
            raise RuntimeError(f"Subset metric changed for {glyph_name}: {output}")
        if compiled_glyph(original, glyph_name) != compiled_glyph(generated, glyph_name):
            raise RuntimeError(f"Subset outline changed for {glyph_name}: {output}")


def verify_union(source: Path, outputs: tuple[Path, ...], decompressor: str, temp: Path) -> None:
    original = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    expected_latin_cmap = expand(CORE_RANGES) | expand(EXT_RANGES)
    if not set(best_cmap(original)) <= expected_latin_cmap:
        raise RuntimeError(f"Unexpected latin cmap coverage: {source}")
    union = set()
    for output in outputs:
        union |= set(best_cmap(decompress(output, decompressor, temp)))
    if union != set(best_cmap(original)):
        raise RuntimeError(f"Core/ext union does not match original cmap: {source}")


def decompress(output: Path, decompressor: str, temp: Path):
    copy = temp / output.name
    target = temp / output.with_suffix(".ttf").name
    copy.write_bytes(output.read_bytes())
    if target.exists():
        target.unlink()
    subprocess.run([decompressor, str(copy)], check=True, stdout=subprocess.DEVNULL)
    return TTFont(target, recalcTimestamp=False, recalcBBoxes=False)


def subset_output(source: Path, suffix: str) -> Path:
    return source.with_name(f"{source.stem}-{suffix}.woff2")


def expand(ranges: tuple[tuple[int, int], ...]) -> set[int]:
    return {codepoint for start, end in ranges for codepoint in range(start, end + 1)}


def best_cmap(font) -> dict[int, str]:
    return font.getBestCmap() or {}


def compiled_glyphs(font) -> dict[str, bytes]:
    return {glyph_name: compiled_glyph(font, glyph_name) for glyph_name in font.getGlyphOrder()}


def compiled_glyph(font, glyph_name: str) -> bytes:
    glyf = font["glyf"]
    return glyf[glyph_name].compile(glyf)


def layout_tags(font) -> dict[str, list[str]]:
    return {
        table: sorted(record.FeatureTag for record in font[table].table.FeatureList.FeatureRecord)
        for table in ("GSUB", "GPOS")
        if table in font and font[table].table.FeatureList is not None
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


if __name__ == "__main__":
    main()
