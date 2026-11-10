"""Choose, per page, how to extract a textbook PDF: clean text layer, OCR, or LaTeX (math) OCR.

The problem this solves: when prose extraction or OCR is unreliable (scanned pages, pages where
formulas come out as garbled glyphs), a math-aware OCR (pix2tex local / Mathpix service) can
produce LaTeX, and formula_ocr.latex_to_text() turns it back into the plain Unicode text the
retriever needs. The LaTeX itself is NEVER put in the documents: it is written inside the
<!-- REVIEW ... --> comment of the draft so the reviewer can compare and replace formulas
(chunker ignores REVIEW lines).

Usage:
    python math_extract.py --plan book.pdf --pages 96-120        # just report the risk decisions
    python math_extract.py book.pdf --id math_4eme_ma_005 --pages 96-120 \
        --topic Coniques --language fr --source "..."           # build a draft (engine none: prose only)
    python math_extract.py book.pdf ... --engine pix2tex          # add LaTeX hints on risky pages
    python math_extract.py book.pdf ... --engine mathpix         # external service: to declare in report

Source choice (plain rules, per page):
    no text layer                    -> scan: starts as ocr; with an engine set, it is rendered and
                                         upgraded to the math path (LaTeX hint recorded)
    text layer, but garbled enough   -> math   (the LaTeX path: risky, REVIEW + LaTeX hint)
    text layer, clean                -> text   (nothing to do)
"""
import argparse
import csv
import re
import sys
import tempfile
from pathlib import Path

import pymupdf

from app import config
from formula_ocr import latex_to_text, run_pix2tex, run_mathpix  # reuse the tested converters

# thresholds (measured on the term-2 book: garbled pages scored 0.010 - 0.060 of control chars)
GARBLE_RATIO_MAX = 0.008      # above: the text layer is considered unreliable -> LaTeX path

MATH_CHARS = set("∀∂∃∅∇∈∉∋∏∑−∗√∝∞∠∧∨∩∪∫∴∼≅≈≠≡≤≥⊂⊃⊄⊆⊕⊗⊘×·–—”“’")
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def quality(text):
    """Extraction-quality signals for one page of extracted text (plain, no state)."""
    total = len(text) or 1
    garble = sum(1 for ch in text
                 if (ord(ch) < 0x20 and ch not in "\n\t") or 0x7f <= ord(ch) <= 0x9f)
    garble += text.count("�")
    tricks = len(re.findall(r"(?:\^ `|> @|d d\b)", text))       # garbled layouts seen in math textbooks
    return {"chars": len(text.strip()), "garble_ratio": garble / total, "math_glyphs": sum(1 for ch in text if ch in MATH_CHARS),
            "garble_tricks": tricks}


def decide(pdf_page, text, engine):
    """Return (source, reason) - the per-page routing decision, for reports and for drafts.

    Scanned pages always start as the ocr path; build_draft upgrades them to the math path
    when an engine is configured (rendering the image first is the only way to know formulas
    are involved, and the engine needs that image anyway).
    """
    q = quality(text)
    if q["chars"] < 40:
        return "ocr", "scanned page (no text layer)"
    if q["garble_ratio"] > GARBLE_RATIO_MAX or q["garble_tricks"] > 2:
        if engine != "none":
            return "math", "garbled text layer (garble %.3f, tricks %d)" % (q["garble_ratio"], q["garble_tricks"])
        return "math", "GARBLE %.3f > %.3f and no engine set: formulas will stay garbled" % (q["garble_ratio"], GARBLE_RATIO_MAX)
    return "text", "clean text layer"


def render_page(doc, page, dpi, workdir):
    out = Path(workdir) / ("p%d.png" % page)
    doc[page - 1].get_pixmap(dpi=dpi).save(str(out))
    return out


def run_engine_one(image_path, engine):
    """Run one page image through the math engine and return the LaTeX string ('' if engine none)."""
    if engine == "pix2tex":
        return run_pix2tex([image_path])[0]
    if engine == "mathpix":
        return run_mathpix([image_path])[0]
    return ""


def build_draft(pdf, args, doc):
    body, report = [], []
    with tempfile.TemporaryDirectory() as workdir:
        for page in args.pages:
            text = doc[page - 1].get_text()
            if args.force_ocr:
                text = ""
            source, reason = decide(doc[page - 1], text, args.engine)
            latex, plain = "", ""
            from pdf_to_draft import clean
            if args.engine != "none" and ((source == "math" and "GARBLE" not in reason) or source == "ocr"):
                image = render_page(doc, page, args.dpi, workdir)
                latex = run_engine_one(image, args.engine)
                if latex:
                    plain = latex_to_text(latex)
                if source == "ocr" and latex:
                    source, reason = "math", "scanned page + LaTeX hint"
                text = plain or ""
            else:
                text = clean(text)
            report.append((page, source, reason, latex))
            body.append("<!-- page: %d -->\n" % page)
            body.append("<!-- REVIEW (%s): %s -->\n" % (source, reason))
            if latex:
                body.append("<!-- REVIEW (math-latex hint) USE THIS PLAIN TEXT: %s | LATEX: %s -->\n"
                            % (plain, latex))
            body.append("\n%s\n" % text)
    return body, report


def write_draft(body, args):
    header = ("---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\ngrade: %s\nsection: %s\n"
              "subject: %s\ntopic: %s\ncontent_type: %s\nlanguage: %s\nsource: %s\n---\n"
              % (args.id, args.grade, args.section, args.subject, args.topic, args.content_type,
                 args.language, args.source))
    out = config.DOCS_DIR / (args.id + ".md")
    out.write_text(header + "\n".join(body), encoding="utf-8")
    return out


def add_manifest_row(args, source_note):
    new = not config.MANIFEST_PATH.exists()
    with open(config.MANIFEST_PATH, "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["document_id", "title", "subject", "language", "origin", "url", "license_or_permission",
                        "permission_verified", "added_by", "notes"])
        w.writerow([args.id, args.topic, args.subject, args.language, args.source, "", "TO CHECK", "no", "",
                    "draft from math_extract.py (%s)" % source_note])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("pdf")
    p.add_argument("--plan", action="store_true", help="only print the per-page source decision, no draft written")
    p.add_argument("--id", help="document_id = output file name (required with a draft)")
    p.add_argument("--subject", default="Mathematics")
    p.add_argument("--topic", default="")
    p.add_argument("--language", default="fr", choices=["fr", "ar", "en"])
    p.add_argument("--source", default="", help="origin of the PDF (the citation shown to students)")
    p.add_argument("--grade", default="4eme_annee_secondaire")
    p.add_argument("--section", default="mathematiques")
    p.add_argument("--content-type", default="course", choices=list(config.CONTENT_TYPES))
    p.add_argument("--pages", default="", help="e.g. 3-12 or 1,4,6-8 (default: all)")
    p.add_argument("--engine", default="none", choices=["none", "pix2tex", "mathpix"],
                   help="math OCR used on risky pages (default none: prose only)")
    p.add_argument("--force-ocr", action="store_true", help="ignore the text layer on every page")
    p.add_argument("--dpi", type=int, default=200)
    p.add_argument("--add-manifest", action="store_true")
    args = p.parse_args()

    from pdf_to_draft import parse_pages

    doc = pymupdf.open(args.pdf)
    total = len(doc)
    args.pages = parse_pages(args.pages, total)
    if not args.plan and not args.id:
        sys.exit("give --id (the document_id) or use --plan")

    body, report = build_draft(args.pdf, args, doc)
    for page, source, reason, latex in report:
        flag = "  <- LaTeX hint added (check with the page image!)" if latex else ""
        print("  page %3d  %-5s  %s%s" % (page, source, reason, flag))
    risky = sum(1 for _, s, _, _ in report if s == "math")
    print("pages: %d | text %d | math-path %d | ocr %d | engine %s"
          % (len(report), sum(1 for _, s, _, _ in report if s == "text"), risky,
             sum(1 for _, s, _, _ in report if s == "ocr"), args.engine))
    if args.plan:
        return
    out = write_draft(body, args)
    print("Draft written: %s" % out)
    if args.add_manifest:
        add_manifest_row(args, "engine %s, pages %s" % (args.engine, args.pages[0]))
        print("Manifest row added with permission_verified=no.")
    if args.engine == "mathpix":
        print("Mathpix is an external paid service: declare it in the report (extra service) and use it only on public material.")
    print("NEXT: review the draft (formulas vs the LaTeX hints, Arabic, headings), remove the REVIEW lines, then run: python ingest.py --strict")


if __name__ == "__main__":
    main()
