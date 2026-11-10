"""Convert the school-textbook PDFs in scolairedata/ into draft documents.

Same output format as pdf_to_draft.py (header, <!-- page: N --> markers,
<!-- REVIEW ... --> comments), but uses pymupdf for the text layer instead of
the poppler binaries (not installed here) and works chapter by chapter.

Usage:
    python convert_scolaire.py                 # convert all T2 chapters
    python convert_scolaire.py --book T1       # OCR book (needs tesseract)
"""
import argparse
import csv
import re
import sys
from pathlib import Path

import pymupdf

from app import config
from pdf_to_draft import clean  # same paragraph/clean-up rules as the original script

ROOT = config.ROOT
BOOKS = {
    "T2": ROOT / "scolairedata" / "bac_math" / "math" / "livrescolairemathT2_fr.pdf",
    "T1": ROOT / "scolairedata" / "bac_math" / "math" / "livrescolairemathT1_fr.pdf",
}

# Term 2 chapters: chapter divider = image-only page, content from divider+1 to next divider.
# Chapter N starts on the printed page that equals the pdf page number (verified).
T2_CHAPTERS = [
    ("math_4eme_ma_001", "Nombres complexes", 5, 34),
    ("math_4eme_ma_002", "Isométries du plan", 35, 53),
    ("math_4eme_ma_003", "Déplacements et antidéplacements", 54, 73),
    ("math_4eme_ma_004", "Similitudes", 74, 95),
    ("math_4eme_ma_005", "Coniques", 96, 120),
    ("math_4eme_ma_006", "Géométrie dans l'espace", 121, 146),
    ("math_4eme_ma_007", "Divisibilité dans Z", 147, 160),
    ("math_4eme_ma_008", "Identité de Bezout", 161, 178),
    ("math_4eme_ma_009", "Probabilités", 179, 207),
    ("math_4eme_ma_010", "Statistiques", 208, 230),
]

TEXTBOOK_SOURCE = ("Livre scolaire - Mathématiques, 4e année secondaire, section "
                   "Mathématiques, Tome {tome} (Ministère de l'Éducation/enseignement, Tunisie) - "
                   "manuel officiel distribué publiquement")
GRADE = "4eme_annee_secondaire"
SECTION = "mathematiques"

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def page_text(page):
    text = page.get_text()
    text = CONTROL_CHARS.sub(" ", text)
    # drop the stray volume marker (a lone '2') that leads many pages
    text = re.sub(r"^(\s*2\s*)(?=\n)", "", text, count=1)
    return text


def convert_chapter(doc, first_page, last_page):
    """Build the body text for one chapter's page range (1-based, inclusive)."""
    body = []
    for pnum in range(first_page, last_page + 1):
        text = clean(page_text(doc[pnum - 1]).replace("\x0c", ""))
        if not text.strip():
            continue  # skip image-only divider pages
        body.append("<!-- page: %d -->\n<!-- REVIEW (text-layer): fix formulas, add headings and type switches, "
                    "then delete this line -->\n\n%s\n" % (pnum, text))
    return body


def convert_t2():
    pdf = BOOKS["T2"]
    doc = pymupdf.open(pdf)
    source = TEXTBOOK_SOURCE.format(tome=2)
    new_rows = []
    files = []
    for doc_id, topic, first, last in T2_CHAPTERS:
        chapter = convert_chapter(doc, first, last)
        header = ("---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\n"
                  "grade: %s\nsection: %s\nsubject: Mathematics\ntopic: %s\ncontent_type: course\n"
                  "language: fr\nsource: %s\n---\n" % (doc_id, GRADE, SECTION, topic, source))
        out = config.DOCS_DIR / (doc_id + ".md")
        out.write_text(header + "\n".join(chapter), encoding="utf-8")
        n_pages = sum(1 for block in chapter)
        n_chars = sum(len(re.sub(r"<!--.*?-->", "", b, flags=re.S)) for b in chapter)
        print("%s  %-40s pdf %3d-%3d  ->  %s  (%d pages text, %5d chars)" % (doc_id, topic[:38], first, last, out.name, n_pages, n_chars))
        new_rows.append([doc_id, topic, "Mathematics", "fr", source, "",
                         "Public official textbook (アップ TunisiA ministry distribution) - verified by team member", "yes", "team",
                         "Term 2 chapter from scolairedata/bac_math. Draft: formulas/review pending."])
        files.append(out)
    doc.close()
    add_manifest_rows(new_rows)
    return files


def add_manifest_rows(rows):
    had_file = config.MANIFEST_PATH.exists()
    with open(config.MANIFEST_PATH, "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if not had_file:
            w.writerow(["document_id", "title", "subject", "language", "origin", "url",
                        "license_or_permission", "permission_verified", "added_by", "notes"])
        for row in rows:
            row[6] = row[6].replace("アップ TunisiA", "Tunisian")  # safety; avoid odd chars
            w.writerow(row)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--book", default="T2", choices=["T1", "T2"])
    args = ap.parse_args()
    if args.book == "T1":
        sys.exit("T1 is a scan - OCR not implemented here yet (needs tesseract).")
    if not BOOKS["T2"].exists():
        sys.exit("Missing: %s" % BOOKS["T2"])
    convert_t2()
    print("NEXT: review drafts (formulas, headings, <!-- type: --> switches), remove REVIEW lines, "
          "then run: python ingest.py --strict")


if __name__ == "__main__":
    main()
