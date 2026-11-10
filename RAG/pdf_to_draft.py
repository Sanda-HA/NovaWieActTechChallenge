"""Turn a PDF into a DRAFT document in the ingest format (you must review it before ingesting).

For each page: use the PDF's text layer when it has one, otherwise OCR the page image.
Needs the command-line tools  pdftotext, pdftoppm (poppler)  and  tesseract  (with the fra / ara / eng data).

Usage:
    python pdf_to_draft.py my.pdf --id math_4eme_se_010 --subject Mathematics --topic "Limits" \
        --language fr --source "Edunet - Maths 4eme SE, chap. 2" --pages 3-12 --add-manifest

Then open data/documents/<id>.md, fix OCR/formula errors, add '##' headings and type switches,
and set permission_verified=yes in data/source_manifest.csv once you have checked the licence.
"""
import argparse
import csv
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from app import config

MIN_TEXT_CHARS = 40          # a page with fewer characters than this is treated as scanned
OCR_LANGS = {"fr": "fra", "ar": "ara+fra", "en": "eng"}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def page_count(pdf):
    out = run(["pdfinfo", str(pdf)]).stdout
    match = re.search(r"Pages:\s+(\d+)", out)
    if not match:
        sys.exit("Could not read %s (is it a valid PDF?)" % pdf)
    return int(match.group(1))


def parse_pages(spec, total):
    if not spec:
        return list(range(1, total + 1))
    pages = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            pages.extend(range(int(a), int(b) + 1))
        else:
            pages.append(int(part))
    return [p for p in pages if 1 <= p <= total]


def text_layer(pdf, page):
    return run(["pdftotext", "-f", str(page), "-l", str(page), "-layout", str(pdf), "-"]).stdout


def ocr_page(pdf, page, lang, workdir):
    prefix = Path(workdir) / ("p%d" % page)
    run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", "300", "-png", "-singlefile", str(pdf), str(prefix)])
    image = str(prefix) + ".png"
    result = run(["tesseract", image, "stdout", "-l", lang, "--psm", "3"])
    return result.stdout


def clean(text):
    text = text.replace("\x0c", "")
    text = re.sub(r"-\n(?=[a-zà-ÿ])", "", text)                  # undo end-of-line hyphenation
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    paragraphs, buf = [], []
    for ln in lines:
        if ln:
            buf.append(ln)
        elif buf:
            paragraphs.append(" ".join(buf))
            buf = []
    if buf:
        paragraphs.append(" ".join(buf))
    return "\n\n".join(paragraphs)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("pdf")
    p.add_argument("--id", required=True, help="document_id, also the file name, e.g. math_4eme_se_010")
    p.add_argument("--subject", required=True)
    p.add_argument("--topic", default="")
    p.add_argument("--language", required=True, choices=["fr", "ar", "en"])
    p.add_argument("--source", required=True, help="where the PDF comes from (shown as the citation)")
    p.add_argument("--grade", default="4eme_annee_secondaire")
    p.add_argument("--section", default="sciences_experimentales")
    p.add_argument("--content-type", default="course", choices=list(config.CONTENT_TYPES))
    p.add_argument("--pages", default="", help="e.g. 3-12 or 1,4,6-8 (default: all)")
    p.add_argument("--force-ocr", action="store_true", help="OCR every page even if it has a text layer")
    p.add_argument("--add-manifest", action="store_true", help="append a row to source_manifest.csv (permission_verified=no)")
    args = p.parse_args()

    for tool in ("pdftotext", "pdftoppm", "tesseract"):
        if run(["which", tool]).returncode != 0:
            sys.exit("Missing tool: %s" % tool)
    pdf = Path(args.pdf)
    pages = parse_pages(args.pages, page_count(pdf))
    lang = OCR_LANGS[args.language]

    body, report = [], []
    with tempfile.TemporaryDirectory() as workdir:
        for page in pages:
            text = "" if args.force_ocr else text_layer(pdf, page)
            method = "text-layer"
            if len(text.strip()) < MIN_TEXT_CHARS:
                text, method = ocr_page(pdf, page, lang, workdir), "OCR"
            text = clean(text)
            report.append((page, method, len(text)))
            body.append("<!-- page: %d -->\n<!-- REVIEW (%s): fix formulas and Arabic, add headings and type switches, then delete this line -->\n\n%s\n"
                        % (page, method, text))

    header = "---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\ngrade: %s\nsection: %s\nsubject: %s\n" \
             "topic: %s\ncontent_type: %s\nlanguage: %s\nsource: %s\n---\n" % (
                 args.id, args.grade, args.section, args.subject, args.topic, args.content_type, args.language, args.source)
    config.DOCS_DIR.mkdir(parents=True, exist_ok=True)
    out = config.DOCS_DIR / (args.id + ".md")
    out.write_text(header + "\n".join(body), encoding="utf-8")

    if args.add_manifest:
        new = not config.MANIFEST_PATH.exists()
        with open(config.MANIFEST_PATH, "a", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["document_id", "title", "subject", "language", "origin", "url", "license_or_permission",
                            "permission_verified", "added_by", "notes"])
            w.writerow([args.id, args.topic, args.subject, args.language, args.source, "", "TO CHECK", "no", "", "draft from pdf_to_draft.py"])

    print("Draft written: %s" % out)
    for page, method, n in report:
        flag = "   <- very little text, check the page" if n < MIN_TEXT_CHARS else ""
        print("  page %3d  %-10s %5d chars%s" % (page, method, n, flag))
    if args.add_manifest:
        print("Manifest row added with permission_verified=no. Verify the licence, then set it to yes.")
    print("NEXT: review the draft (formulas, Arabic), remove the REVIEW comments, then run: python ingest.py --strict")


if __name__ == "__main__":
    main()
