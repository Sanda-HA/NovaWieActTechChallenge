"""Convert the school-textbook PDFs in scolairedata/ into draft documents.

Same output format as pdf_to_draft.py (header, <!-- page: N --> markers,
<!-- REVIEW ... --> comments), but uses pymupdf for the text layer instead of
the poppler binaries (not installed here) and works chapter by chapter. The
T1 book has no text layer, so that path renders pages and runs Tesseract.

Usage:
    python convert_scolaire.py                 # convert all T2 chapters
    python convert_scolaire.py --book SVT      # convert the SVT book (chapter splits below)
    python convert_scolaire.py --book ENG      # convert the English book (unit splits below)
    python convert_scolaire.py --book T1       # OCR the scanned Term 1 book (needs tesseract + fra)
    python convert_scolaire.py --book T1 --chapter math_4eme_ma_015
    python convert_scolaire.py --backfill-manifest  # add missing manifest rows, then stop
"""
import argparse
import csv
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import pymupdf

from app import config
from pdf_to_draft import clean  # same paragraph/clean-up rules as the original script

ROOT = config.ROOT
BOOKS = {
    "T2": ROOT / "scolairedata" / "bac_math" / "math" / "livrescolairemathT2_fr.pdf",
    "T1": ROOT / "scolairedata" / "bac_math" / "math" / "livrescolairemathT1_fr.pdf",
    "SVT": ROOT / "scolairedata" / "bac_math" / "math" / "svt_4M.pdf",
    "ENG": ROOT / "scolairedata" / "bac_math" / "english" / "anglais_4eme.pdf",
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

# SVT book (svt_4M.pdf): printed page == pdf page (verified against its table of
# contents on pdf page 160). Three themed parts; thematic intro pages are prepended
# to the first chapter of each theme. The whole-book glossary at the end becomes a
# separate "definition" document. Verified chapter limits (1-based pdf pages):
#   Theme 1 Neurophysiologie: intro 5-6, ch1 7-19, ch2 20-56, ch3 57-69
#   Theme 2 Reproduction: intro 70, ch1 71-87, ch2 88-114, ch3 115-127
#   Theme 3 Génétique humaine: 128-154 ; verbes d'action 155, glossaire A-Z 156-158,
#   bibliographie 159, table des matières 160 (front/back matter excluded).
SVT_CHAPTERS = [
    ("svt_4eme_ma_001", "Le tissu nerveux", 5, 19, "course"),
    ("svt_4eme_ma_002", "L'activité réflexe", 20, 56, "course"),
    ("svt_4eme_ma_003", "L'hygiène du système nerveux", 57, 69, "course"),
    ("svt_4eme_ma_004", "La fonction reproductrice chez l'homme", 70, 87, "course"),
    ("svt_4eme_ma_005", "La fonction reproductrice chez la femme", 88, 114, "course"),
    ("svt_4eme_ma_006", "La procréation", 115, 127, "course"),
    ("svt_4eme_ma_007", "Génétique humaine", 128, 154, "course"),
    ("svt_4eme_ma_008", "Glossaire et verbes d'action de l'évaluation", 155, 159, "definition"),
]
SVT_SOURCE = ("Livre scolaire - Sciences de la Vie et de la Terre, 4e année secondaire, "
              "section Mathématiques (Centre National Pédagogique, Tunisie) - "
              "manuel officiel distribué publiquement")

# English book (anglais_4eme.pdf, "Skills for Life", 280 pages, text layer).
# Printed page == pdf page. Unit covers are image-only or one-word divider pages,
# so the ranges below start at the unit cover and skip empty/outline pages.
# Lesson start pages come from the CONTENTS pages (pdf pages 5-7).
ENG_CHAPTERS = [
    ("eng_4eme_ma_001", "First Impressions", 8, 34),
    ("eng_4eme_ma_002", "Art Shows and Holidaying", 35, 86),
    ("eng_4eme_ma_003", "Education Matters", 87, 134),
    ("eng_4eme_ma_004", "Creative Inventive Minds", 135, 190),
    ("eng_4eme_ma_005", "Life Issues", 191, 253),
]
ENG_LESSONS = {
    "eng_4eme_ma_001": [
        (9, "Farewell to..., Hello to... / How Creative Are You?"),
        (18, "Learning Quiz"),
        (19, "Synonyms and Antonyms"),
        (20, "Digital Language Pal / Get to Know Your Book"),
        (21, "Definitions, Collocations, Idioms and Phrasal Verbs"),
        (27, "Englishman in New York"),
        (29, "Finding Out About English(es)"),
        (30, "Webquest 1: American and British English / Pronunciation"),
        (32, "Recognising Text Types"),
        (34, "Cultures and Languages"),
    ],
    "eng_4eme_ma_002": [
        (37, "Lesson 1: Holidaying"),
        (41, "Lesson 2: Space Tourism"),
        (47, "Lesson 3: Art Shows, Strings"),
        (54, "Lesson 4: Exploring a Song: Immortality"),
        (59, "Lesson 5: Walking Tour"),
        (64, "Lesson 6: A Package Tour"),
        (67, "Project Work 1: My Festival"),
        (68, "Lesson 7: At the Travel Agency"),
        (74, "Lesson 8: Put a Little Drama in Your Travel"),
        (77, "Lesson 9: The Winter's Tale (Part 1)"),
        (82, "Arts Session 1: The Winter's Tale (Part 2)"),
        (85, "Arts Session 2: Tale End...?"),
    ],
    "eng_4eme_ma_003": [
        (88, "Lesson 1: School-Related Words"),
        (93, "Lesson 2: Education for All"),
        (97, "Lesson 3: Virtual Schools"),
        (101, "Lesson 4: Online Learning"),
        (103, "Lesson 5: Comparing Educational Systems"),
        (107, "Lesson 6: Age or...?"),
        (111, "Lesson 7: Lifelong Learning"),
        (115, "Lesson 8: Reading the Back Cover of a Book"),
        (118, "Lesson 9: Alexander Graham Bell"),
        (123, "Project Work 2: Expository Texts"),
        (124, "Arts Session 3: Later"),
        (128, "Arts Session 4: Writing a Narrative"),
        (130, "Check Your Reading Skills"),
        (132, "Check Your Language and Skills"),
    ],
    "eng_4eme_ma_004": [
        (136, "Lesson 1: Inventions-Related Words"),
        (142, "Lesson 2: Technology: A Blessing in Disguise?"),
        (147, "Lesson 3: The Father of PlayStation"),
        (151, "Lesson 4: Prize Winners"),
        (156, "Lesson 5: Women Choose to Opt Out"),
        (161, "Lesson 6: The Brain Drain"),
        (168, "Lesson 7: Scientists' Achievements"),
        (174, "Lesson 8: The Daffodils"),
        (180, "Lesson 9: Writing as a Process: Argumentative Text"),
        (182, "Arts Session 5: The Bard's Sonnet 18"),
        (186, "Arts Session 6: As You Like It"),
        (189, "Arts Session 7: Project Work 3"),
    ],
    "eng_4eme_ma_005": [
        (193, "Lesson 1: Life Concerns"),
        (198, "Lesson 2: Attitudes"),
        (202, "Lesson 3: If..., a Poem by Kipling"),
        (205, "Lesson 4: Consumerism"),
        (211, "Lesson 5: Ecodriving"),
        (218, "Lesson 6: Urban Exodus"),
        (222, "Lesson 7: A Newscast"),
        (227, "Lesson 8: Staff Management"),
        (232, "Lesson 9: Job Ads"),
        (235, "Arts Session 8: The Richer, The Poorer"),
        (240, "Arts Session 9: A Secret for Two"),
        (245, "Arts Session 10: What a Wonderful World!"),
        (248, "Check Your Language and Skills"),
        (249, "Check Your Skills"),
    ],
}
ENG_SOURCE = ("Skills for Life - English, Year 4 Secondary Education "
              "(National Pedagogic Centre, Tunisia) - official textbook")
# Project/check pages are exercises; switch back to course when the next lesson starts.
ENG_TYPE_SWITCHES = {
    "eng_4eme_ma_002": {67: "exercise", 68: "course"},
    "eng_4eme_ma_003": {123: "exercise", 124: "course", 130: "exercise"},
    "eng_4eme_ma_004": {189: "exercise"},
    "eng_4eme_ma_005": {248: "exercise"},
}

# Term 1 is a scan (no text layer on 206/207 pages). Chapter limits come from the
# Sommaire on pdf page 4 and were checked against the chapter divider pages.
# Printed page == pdf page. Tesseract with the French model is required.
T1_CHAPTERS = [
    ("math_4eme_ma_011", "Continuité et limites", 5, 27),
    ("math_4eme_ma_012", "Suites réelles", 28, 52),
    ("math_4eme_ma_013", "Dérivabilité", 53, 76),
    ("math_4eme_ma_014", "Fonctions réciproques", 77, 95),
    ("math_4eme_ma_015", "Primitives", 96, 108),
    ("math_4eme_ma_016", "Intégrales", 109, 136),
    ("math_4eme_ma_017", "Fonction logarithme népérien", 137, 157),
    ("math_4eme_ma_018", "Fonction exponentielle", 158, 188),
    ("math_4eme_ma_019", "Équations différentielles", 189, 207),
]
T1_SOURCE = ("Livre scolaire - Mathématiques, 4e année secondaire, section Mathématiques, "
             "Tome 1 (Ministère de l'Éducation, Tunisie) - manuel officiel distribué publiquement")
OCR_LANG = "fra"
OCR_DPI = 300

# Labels that switch the chunk content_type. They must be alone at the start of a
# line: OCR puts the book's labels on their own line almost every time.
DEFINITION_LABELS = ("Définition", "Définitions")
EXERCISE_LABELS = ("Activité", "Activités", "Exercice", "Exercices", "QCM",
                   "Vrai ou faux", "Problème résolu", "Problèmes résolus", "Tester les acquis")
COURSE_LABELS = ("Théorème", "Théorèmes", "Propriété", "Propriétés", "Corollaire",
                 "Remarque", "Exemple", "Exemples", "Démonstration", "Méthode", "Retenir")
SECTION_RE = re.compile(r"^([IVX]+[l1]{0,3}|[IVX]+)[.)]\s+(.{2,90})$")
SUBSECTION_RE = re.compile(r"^(\d{1,2}\.\d{1,2})\s+(.{2,90})$")
NUMBERED_HEADING_RE = re.compile(r"^(\d{1,2})[.)]\s+(.{2,80})$")
STRUCTURE_HEADING_RE = re.compile(
    r"^(QCM\b|Vrai ou faux\b|Tester les acquis\b|Exercices? et probl[eè]mes?\b|Exercices?\s*$)", re.I)
ROMAN_FIX = {"Il": "II", "Ill": "III", "IY": "IV", "Y": "V", "Yl": "VI", "Vl": "VI"}

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def page_text(page):
    text = page.get_text()
    text = CONTROL_CHARS.sub(" ", text)
    # drop the stray volume marker (a lone '2') that leads many pages
    text = re.sub(r"^(\s*2\s*)(?=\n)", "", text, count=1)
    return text


def svt_page_text(page):
    text = page.get_text()
    text = CONTROL_CHARS.sub(" ", text)
    # drop the leading printed page number ('133', '133 ', ' 133\n') this book shows
    text = re.sub(r"^\s*\d{1,3}\s*\n", "", text, count=1)
    return text


def eng_page_paragraphs(page, topic):
    """Text-layer paragraphs for the English book, one per PDF text block.

    The book uses lots of small layout boxes (exercises, tables, speech bubbles), so
    blocks are a better unit than the raw page text: a merged page would mix columns.
    """
    out = []
    for block in page.get_text("blocks", sort=True):
        text = CONTROL_CHARS.sub(" ", block[4])
        lines = []
        for line in text.splitlines():
            cleaned = re.sub(r"[ \t]+", " ", line).strip()
            if not cleaned:
                continue
            if re.fullmatch(r"\d{1,3}", cleaned):          # page number
                continue
            if re.fullmatch(r"Lesson\s*\d+", cleaned, re.I):
                continue
            if cleaned.lower() == topic.lower():           # page title, already a ## heading
                continue
            letters = [ch for ch in cleaned if ch.isalpha()]
            if letters and sum(1 for ch in letters if ord(ch) < 128) / len(letters) < 0.85:
                continue                                   # custom-font gibberish
            lines.append(cleaned)
        if not lines:
            continue
        paragraph = " ".join(lines).strip()
        if len(paragraph) < 2:
            continue
        # A few decorative/song pages use a custom font whose glyphs extract as
        # gibberish ("YtÜxãxÄÄ àÉ Üxáà|Çz"). Drop blocks that are not mostly Latin.
        letters = [ch for ch in paragraph if ch.isalpha()]
        if letters and sum(1 for ch in letters if ord(ch) < 128) / len(letters) < 0.85:
            continue
        out.append(paragraph)
    return out


# ---------------------------------------------------------------- T1 OCR path


def tesseract_check():
    if shutil.which("tesseract") is None:
        sys.exit("Tesseract is required for --book T1. Install it and put tesseract on PATH "
                 "(French data: fra.traineddata).")


def ocr_page(doc, page, workdir):
    """Render one page and OCR it; return paragraphs and the mean word confidence (0-100)."""
    image = Path(workdir) / ("p%03d.png" % page)
    base = Path(workdir) / ("p%03d" % page)
    doc[page - 1].get_pixmap(dpi=OCR_DPI).save(str(image))
    result = subprocess.run(
        ["tesseract", str(image), str(base), "-l", OCR_LANG, "--psm", "3",
         "-c", "tessedit_create_tsv=1"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        sys.exit("Tesseract failed on page %d: %s" % (page, result.stderr.strip()[:400]))
    lines, current, buf, confs = [], None, [], []
    tsv = Path(str(base) + ".tsv")
    if not tsv.exists():
        return [], 0
    with open(tsv, encoding="utf-8", newline="") as f:
        next(f, None)  # header: level, page_num, block_num, ..., conf, text
        for raw in f:
            # Fixed columns, not csv: a recognised '"' in the text column would
            # otherwise open a quoted field and swallow the rest of the page.
            parts = raw.rstrip("\r\n").split("\t", 11)
            if len(parts) < 12 or parts[0] != "5":
                continue
            word = parts[11].strip()
            if not word:
                continue
            key = (parts[2], parts[3], parts[4])  # block, par, line
            if key != current:
                if buf:
                    lines.append({"par": (current or ("0", "0"))[:2], "text": " ".join(buf)})
                buf, current = [], key
            buf.append(word)
            try:
                c = float(parts[10])
            except ValueError:
                c = -1.0
            if c >= 0:
                confs.append(c)
    if buf:
        lines.append({"par": (current or ("0", "0"))[:2], "text": " ".join(buf)})
    return paragraphs_from_lines(lines), round(sum(confs) / len(confs)) if confs else 0


def paragraphs_from_lines(lines):
    """Group OCR lines into paragraphs, joining only wrapped prose lines."""
    groups = []
    for line in lines:
        if groups and groups[-1]["par"] == line["par"]:
            groups[-1]["lines"].append(line)
        else:
            groups.append({"par": line["par"], "lines": [line]})
    out = []
    for group in groups:
        parts = [ln["text"] for ln in group["lines"]]
        merged = parts[0]
        for previous, following in zip(parts, parts[1:]):
            if (not re.search(r"[.;:!?]\s*$", previous)
                    and (following[:1].islower() or following[:1] in "([{")):
                merged += " " + following
            else:
                merged += "\n" + following
        out.append(merged)
    return out


def strip_page_noise(paragraphs, topic, page):
    """Drop running heads, page numbers and the chapter label (kept as a ## heading)."""
    out = []
    for paragraph in paragraphs:
        kept = []
        for line in paragraph.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if re.fullmatch(r"\d{1,3}", stripped):
                continue
            if re.fullmatch(r"\|?\s*Chapitre\s+\d+\s*\|?", stripped, re.I):
                continue
            if stripped in ("€", "&", "©", "Œ", '"', "'", "«", "»", "-", "—", "–", "|"):
                continue
            if stripped.lower() == "cours":
                continue
            if len(re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ0-9]", stripped)) <= 1:
                continue
            if stripped.lower() == topic.lower():
                continue
            if stripped.startswith("(") and len(stripped) < 60:
                continue
            kept.append(stripped)
        if kept:
            out.append("\n".join(kept))
    while out:
        last = out[-1].strip()
        if re.fullmatch(r"\d{1,3}", last) or (last.startswith("(") and len(last) < 60):
            out.pop()
            continue
        if topic.split()[0].lower() in last.lower() and len(last) < len(topic) + 25:
            out.pop()
            continue
        break
    return out


def label_type(line):
    for label in EXERCISE_LABELS:
        if re.match(r"^%s\b" % re.escape(label), line, re.I):
            return "exercise"
    for label in DEFINITION_LABELS:
        if re.match(r"^%s\b" % re.escape(label), line, re.I):
            return "definition"
    for label in COURSE_LABELS:
        if re.match(r"^%s\b" % re.escape(label), line, re.I):
            return "course"
    return None


ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]


def normalize_roman(value):
    """Turn OCR variants such as Il/Ill/I1/V1 into II/III/II/VI."""
    value = ROMAN_FIX.get(value, value)
    cleaned = value.replace("l", "I").replace("1", "I").replace("Y", "V")
    return cleaned if re.fullmatch(r"[IVX]+", cleaned) else value


def next_roman(value):
    try:
        return ROMAN_ORDER[ROMAN_ORDER.index(value) + 1]
    except (ValueError, IndexError):
        return value


def fix_duplicate_sections(text):
    """OCR sometimes drops the last I in III; bump a repeated numeral with a new title."""
    seen, titles, out = [], set(), []
    for line in text.splitlines():
        match = re.match(r"^## ([IVX]+)\.\s+(.*)$", line)
        if match:
            roman, title = match.group(1), match.group(2)
            if roman in seen and title not in titles:
                roman = next_roman(roman)
            seen.append(roman)
            titles.add(title)
            line = "## %s. %s" % (roman, title)
        out.append(line)
    return "\n".join(out)


HEADING_STARTS = set("""
    definition definitions generalites introduction introductions rappel rappels propriete proprietes primitives primitive
    calcul calculs fonctions fonction limites limite continuite derivabilite suites suite integrales
    integrale equations equation image images exemples exemple croissances theoreme theoremes
    methode methodes complements activites activite exercices exercice qcm vrai tester applications
    application etude etudes representation representations derivees derivee comparaison operations
    operation formes forme branches asymptotes courbes lecture resolution systemes ensembles nombres
    geometrie statistiques probabilites notion notions formule formules tableau tableaux
    demonstration demonstrations remarque remarques corollaire corollaires lemme lemmes proposition
    propositions vocabulaire objectifs objectif
""".split())


def first_word(text):
    words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]+", text)
    if not words:
        return ""
    value = unicodedata.normalize("NFKD", words[0])
    return "".join(ch for ch in value if not unicodedata.combining(ch)).lower()


def looks_like_heading(text):
    return (len(text.split()) <= 12
            and not re.search(r"[.;!?]$", text)
            and not re.match(r"^[a-z]\)", text)
            and first_word(text) in HEADING_STARTS)


def heading_type(text):
    return "definition" if first_word(text) in ("definition", "definitions") else "course"


def add_structure(paragraphs, topic, first_page):
    """Add chunk boundaries (##) and content_type switches heuristically; review afterwards."""
    blocks = []
    if first_page:
        blocks.append("## %s" % topic)
    for paragraph in paragraphs:
        current = []

        def flush():
            if current:
                blocks.append("\n".join(current))
                current.clear()

        for line in paragraph.splitlines():
            text = line.strip()
            if not text:
                continue
            # OCR sometimes reads a table rule as '#', which the chunker would
            # mistake for a Markdown heading.
            if text.startswith("#"):
                text = text.lstrip("#").strip()
                if not text:
                    continue
            # The book uses vertical rules around some section labels. Only strip
            # them for label-like lines: "|x|" and "|x| < 1" are real formulas.
            if text.startswith("|"):
                candidate = re.sub(r"^\|\s*", "", text)
                candidate = re.sub(r"\s*\|\)?\.?$", "", candidate).strip()
                if (STRUCTURE_HEADING_RE.match(candidate)
                        or first_word(candidate) in HEADING_STARTS):
                    text = candidate
            if not text:
                continue
            # OCR often reads the Roman numeral I as a lower-case l ("l. Définition").
            if re.match(r"^l[.)]\s+[A-ZÀ-Ü]", text):
                text = "I." + text[2:]
            section = SECTION_RE.match(text)
            subsection = SUBSECTION_RE.match(text)
            numbered = NUMBERED_HEADING_RE.match(text)
            kind = label_type(text)
            if STRUCTURE_HEADING_RE.match(text):
                flush()
                blocks.append("<!-- type: exercise -->")
                blocks.append("## " + text)
                continue
            if section and looks_like_heading(section.group(2)):
                flush()
                blocks.append("<!-- type: %s -->" % heading_type(section.group(2)))
                blocks.append("## %s. %s" % (normalize_roman(section.group(1)),
                                            section.group(2).strip().rstrip(".")))
                continue
            if numbered and looks_like_heading(numbered.group(2)):
                flush()
                blocks.append("<!-- type: %s -->" % heading_type(numbered.group(2)))
                blocks.append("## %s. %s" % (numbered.group(1), numbered.group(2).strip().rstrip(".")))
                continue
            if subsection and looks_like_heading(subsection.group(2)):
                flush()
                blocks.append("<!-- type: %s -->" % heading_type(subsection.group(2)))
                blocks.append("## %s %s" % (subsection.group(1), subsection.group(2).strip()))
                continue
            if kind:
                flush()
                blocks.append("<!-- type: %s -->" % kind)
            current.append(text)
        flush()
    return blocks


def convert_t1(only_chapter=None):
    tesseract_check()
    pdf = BOOKS["T1"]
    doc = pymupdf.open(pdf)
    new_rows, files = [], []
    # Keep rendered pages beside the repo (D:) instead of the system temp drive.
    with tempfile.TemporaryDirectory(prefix=".ocr_t1_", dir=str(config.ROOT)) as workdir:
        for doc_id, topic, first, last in T1_CHAPTERS:
            if only_chapter is not None and doc_id != only_chapter:
                continue
            body, confs = [], []
            for pnum in range(first, last + 1):
                paragraphs, confidence = ocr_page(doc, pnum, workdir)
                confs.append(confidence)
                paragraphs = strip_page_noise(paragraphs, topic, pnum)
                structured = add_structure(paragraphs, topic, pnum == first)
                flag = "conf %d%%" % confidence
                if confidence < 60:
                    flag += ", LOW CONFIDENCE"
                if not structured:
                    structured = ["*(no text extracted from this page)*"]
                body.append("<!-- page: %d -->\n"
                            "<!-- REVIEW (ocr-t1, %s): verify formulas, headings and type switches; "
                            "delete this line when the page is checked -->\n\n%s\n"
                            % (pnum, flag, "\n\n".join(structured)))
            header = ("---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\n"
                      "grade: %s\nsection: %s\nsubject: Mathematics\ntopic: %s\ncontent_type: course\n"
                      "language: fr\nsource: %s\n---\n" % (doc_id, GRADE, SECTION, topic, T1_SOURCE))
            out = config.DOCS_DIR / (doc_id + ".md")
            document = fix_duplicate_sections(header + "\n".join(body))
            out.write_text(document, encoding="utf-8")
            text_only = re.sub(r"<!--.*?-->", "", "\n".join(body), flags=re.S)
            mean_conf = round(sum(confs) / len(confs)) if confs else 0
            low = [p for p, c in zip(range(first, last + 1), confs) if c < 60]
            print("%s  %-32s pdf %3d-%3d -> %s  (%d pages, %6d chars, mean conf %d%%%s)"
                  % (doc_id, topic[:30], first, last, out.name, len(body), len(text_only), mean_conf,
                     ", low pages " + str(low) if low else ""))
            new_rows.append([doc_id, topic, "Mathematics", "fr", T1_SOURCE, "",
                             "Public official textbook (Tunisian Ministry of Education distribution) "
                             "- permission not verified", "no", "team",
                             "Tome 1 chapter OCR draft (tesseract fra). Formulas/headings/types need "
                             "review; delete REVIEW lines, then verify permission."])
            files.append(out)
    doc.close()
    add_manifest_rows(new_rows)
    return files


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
                         "Public official textbook (Tunisian Ministry of Education distribution) "
                         "- permission not verified", "no", "team",
                         "Term 2 chapter from scolairedata/bac_math. Draft: formulas and permission "
                         "review pending."])
        files.append(out)
    doc.close()
    add_manifest_rows(new_rows)
    return files


def existing_manifest_ids():
    if not config.MANIFEST_PATH.exists():
        return set()
    with open(config.MANIFEST_PATH, encoding="utf-8", newline="") as f:
        return {row["document_id"] for row in csv.DictReader(f)}


def add_manifest_rows(rows):
    """Append manifest rows, skipping document_ids that are already present."""
    known = existing_manifest_ids()
    rows = [row for row in rows if row[0] not in known]
    if not rows:
        return
    had_file = config.MANIFEST_PATH.exists()
    with open(config.MANIFEST_PATH, "a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if not had_file:
            w.writerow(["document_id", "title", "subject", "language", "origin", "url",
                        "license_or_permission", "permission_verified", "added_by", "notes"])
        for row in rows:
            row[6] = row[6].replace("アップ TunisiA", "Tunisian")  # safety; avoid odd chars
            w.writerow(row)


def backfill_manifest():
    """Add a conservative manifest row for every document that has none.

    Existing documents written by earlier passes (notably the own-work summaries
    math_4eme_ma_101..108) had no manifest row, which made ingest.py abort. This
    restores a consistent manifest without claiming that permission or content was
    reviewed: permission_verified stays 'no' until a human checks the licence.
    """
    from app.chunking import parse_header

    known = existing_manifest_ids()
    rows = []
    for path in sorted(config.DOCS_DIR.glob("*.md")):
        doc_id = path.stem
        if doc_id in known:
            continue
        try:
            header, _ = parse_header(path.read_text(encoding="utf-8"))
        except ValueError as exc:
            print("skip %s: %s" % (path.name, exc))
            continue
        source = header.get("source", "")
        if "OWN WORK" in source.upper():
            licence = "Own work - no third-party content"
            notes = "Own work; manifest row backfilled. Teacher/content review pending."
        else:
            licence = "Unknown - backfilled from document header; verify before use"
            notes = "Manifest row backfilled from document header. Permission/content review pending."
        rows.append([doc_id, header.get("topic", doc_id), header.get("subject", ""),
                     header.get("language", "fr"), source, "", licence, "no", "team", notes])
    add_manifest_rows(rows)
    print("Backfilled %d manifest row(s)." % len(rows))


def convert_svt():
    pdf = BOOKS["SVT"]
    doc = pymupdf.open(pdf)
    new_rows = []
    files = []
    for doc_id, topic, first, last, content_type in SVT_CHAPTERS:
        body = []
        for pnum in range(first, last + 1):
            text = clean(svt_page_text(doc[pnum - 1]).replace("\x0c", ""))
            if not text.strip():
                continue  # skip image-only intro pages
            body.append("<!-- page: %d -->\n<!-- REVIEW (text-layer): fix formulas, add headings and type switches, "
                        "then delete this line -->\n\n%s\n" % (pnum, text))
        if not body:
            sys.exit("No text extracted for %s (pages %d-%d)" % (doc_id, first, last))
        header = ("---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\n"
                  "grade: %s\nsection: %s\nsubject: SVT\ntopic: %s\ncontent_type: %s\n"
                  "language: fr\nsource: %s\n---\n" % (doc_id, GRADE, SECTION, topic, content_type, SVT_SOURCE))
        out = config.DOCS_DIR / (doc_id + ".md")
        out.write_text(header + "\n".join(body), encoding="utf-8")
        n_pages = len(body)
        n_chars = sum(len(re.sub(r"<!--.*?-->", "", b, flags=re.S)) for b in body)
        print("%s  %-44s pdf %3d-%3d  ->  %s  (%d pages text, %5d chars)"
              % (doc_id, topic[:42], first, last, out.name, n_pages, n_chars))
        new_rows.append([doc_id, topic, "SVT", "fr", SVT_SOURCE, "",
                         "Public official textbook (Tunisian Centre National Pédagogique distribution) "
                         "- content review pending", "no", "team",
                         "Chapter from scolairedata/bac_math/math/svt_4M.pdf. Draft: add headings and "
                         "<!-- type: --> switches, check wording, then delete REVIEW lines."])
        files.append(out)
    doc.close()
    add_manifest_rows(new_rows)
    return files


def convert_eng():
    pdf = BOOKS["ENG"]
    doc = pymupdf.open(pdf)
    new_rows = []
    files = []
    for doc_id, topic, first, last in ENG_CHAPTERS:
        lessons = dict(ENG_LESSONS.get(doc_id, []))
        type_switches = ENG_TYPE_SWITCHES.get(doc_id, {})
        body = []
        for pnum in range(first, last + 1):
            paragraphs = eng_page_paragraphs(doc[pnum - 1], topic)
            joined = "\n".join(paragraphs).strip()
            if not joined:
                continue                      # image-only divider page
            if "UNIT OUTLINE" in joined.upper():
                continue                      # table layout is too jumbled to help retrieval
            if len(joined) < 40:
                continue                      # one-word divider page
            blocks = []
            if pnum in type_switches:
                blocks.append("<!-- type: %s -->" % type_switches[pnum])
            if pnum == first:
                blocks.append("## %s" % topic)
            if pnum in lessons:
                blocks.append("## %s" % lessons[pnum])
            blocks.extend(paragraphs)
            body.append("<!-- page: %d -->\n"
                        "<!-- REVIEW (text-layer): check tables, headings and type switches; "
                        "delete this line when the page is checked -->\n\n%s\n"
                        % (pnum, "\n\n".join(blocks)))
        if not body:
            sys.exit("No text extracted for %s (pages %d-%d)" % (doc_id, first, last))
        header = ("---\ndocument_id: %s\ncountry: Tunisia\neducational_level: secondary\n"
                  "grade: %s\nsection: %s\nsubject: English\ntopic: %s\ncontent_type: course\n"
                  "language: en\nsource: %s\n---\n" % (doc_id, GRADE, SECTION, topic, ENG_SOURCE))
        out = config.DOCS_DIR / (doc_id + ".md")
        out.write_text(header + "\n".join(body), encoding="utf-8")
        text_only = re.sub(r"<!--.*?-->", "", "\n".join(body), flags=re.S)
        print("%s  %-38s pdf %3d-%3d  ->  %s  (%d pages text, %6d chars)"
              % (doc_id, topic[:36], first, last, out.name, len(body), len(text_only)))
        new_rows.append([doc_id, topic, "English", "en", ENG_SOURCE, "",
                         "Public official textbook (Tunisian National Pedagogic Centre "
                         "distribution) - permission not verified", "no", "team",
                         "English unit from scolairedata/bac_math/english/anglais_4eme.pdf "
                         "(Skills for Life). Text-layer draft: check tables, headings and type "
                         "switches; permission/content review pending."])
        files.append(out)
    doc.close()
    add_manifest_rows(new_rows)
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--book", default="T2", choices=["T1", "T2", "SVT", "ENG"])
    ap.add_argument("--chapter", help="T1 only: document_id to convert, e.g. math_4eme_ma_015")
    ap.add_argument("--backfill-manifest", action="store_true",
                    help="add rows for documents that are missing from source_manifest.csv")
    args = ap.parse_args()
    if args.backfill_manifest:
        backfill_manifest()
        if not args.chapter:
            return
    if args.chapter and args.book != "T1":
        sys.exit("--chapter is only supported with --book T1")
    if args.chapter:
        known = {chapter[0] for chapter in T1_CHAPTERS}
        if args.chapter not in known:
            sys.exit("Unknown T1 chapter id: %s (choose from %s)"
                     % (args.chapter, ", ".join(sorted(known))))
    if not BOOKS[args.book].exists():
        sys.exit("Missing: %s" % BOOKS[args.book])
    if args.book == "T2":
        convert_t2()
    elif args.book == "T1":
        convert_t1(args.chapter)
    elif args.book == "ENG":
        convert_eng()
    else:
        convert_svt()
    print("NEXT: review drafts (formulas, headings, <!-- type: --> switches), remove REVIEW lines, "
          "then run: python ingest.py (non-strict) to index them. Use --strict only after review.")


if __name__ == "__main__":
    main()
