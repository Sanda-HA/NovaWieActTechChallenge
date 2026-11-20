# Post-conversion pass for the SVT textbook drafts (run in RAG/).
# Adds Markdown headings (chunk boundaries), <!-- type: exercise --> switches
# before "Tester les acquis", and fixes verified typos from the book text layer.
#
# The scan for ALL-CAPS chapter titles can eat the first letter(s) of the word
# that follows ("Réflexe" -> "R") because that letter is also part of the caps
# character class. Short (<=3 chars) trailing fragments are peeled back and
# re-joined, and a too-short caps run (title-case TOC listing, e.g.
# "Chapitre 2 : L’activité réflexe") is rejected: inline text is left untouched.
import glob
import pathlib
import re

FILES = sorted(glob.glob("data/documents/svt_4eme_ma_00*.md"))

TYPOS = [
    ("humiane ", "humaine "),
    ("tramsmission ", "transmission "),
    ("hériditaires", "héréditaires"),
    ("texticule", "testicule"),
    ("doccument", "document"),
    ("progagation", "propagation"),
    ("condudtion", "conduction"),
    ("hypthalamo", "hypothalamo"),
    ("la fontion", "la fonction"),
    ("rapporche", "rapproche"),
    ("mœlle épinière", "moelle épinière"),
    ("au niveau du recepteur sensoriel", "au niveau du récepteur sensoriel"),
    ("ce dernièr ", "ce dernier "),
    ("ultastructure", "ultrastructure"),
    ("Document 9 :ét", "Document 9 : ét"),
]

RUN_CHARS = "A-ZÀ-Ü0-9\u2019'-"

TITLE_END = re.compile(
    r"[?!.]|\n"
    r"|\s+(?:[A-ZÀ-Ü][a-zà-ÿ]|\u2022"
    r"|[1-5][a-e]?\s?-|[a-e]-\s?"
    r"|(?:1er|2[eè]me|3[eè]me)\s+cas"
    r"|(?:\d\s+){2,}"
    r"|Document\s|Bilan\s|Commentaire\s|L[\u2019']|\d{2,3}\s)"
)

MARKERS = [
    r"S'INTERROGER", r"SE RAPPELER", r"OBJECTIFS", r"Commentaire",
    r"Introduction générale", r"Bilan des activités et synthèse",
]

CH_START = re.compile(r"(?<![\w#])Chapitre \d+\s*:\s*")
RUN_RE = re.compile(r"[%s]" % RUN_CHARS)


def strip_header(text):
    m = re.match(r"^---\n.*?\n---\n", text, re.S)
    return m.group(0), text[m.end():]


def cut_points(body, start, max_chars=145):
    seg = body[start:start + max_chars + 20]
    m = TITLE_END.search(seg)
    pos = min(m.start(), max_chars) if m and m.start() > 1 else len(seg.rstrip())
    sp = seg.rfind(" ", 0, pos)
    return sp if sp > 1 else min(pos, len(seg.rstrip()))


def promote(body, pattern):
    out, pos, count = [], 0, 0
    for m in re.finditer(r"(?<![\w#])(%s)" % pattern, body):
        cut = cut_points(body, m.end())
        title = body[m.start():m.end() + cut].strip()
        if title:
            out.append(body[pos:m.start()])
            out.append("\n\n## %s\n\n" % title)
            pos = m.end() + cut
            count += 1
    out.append(body[pos:])
    return "".join(out), count


def promote_chapters(body):
    parts, pos, count, idx = [], 0, 0, 0
    while True:
        m = CH_START.search(body, idx)
        if m is None:
            break
        i = m.end()
        idx = i
        raw = body[i:i + 240]
        j = 0
        while j < len(raw):
            if RUN_RE.match(raw[j]):
                j += 1
            elif raw[j] in " \n" and j + 1 < len(raw) and RUN_RE.match(raw[j + 1]):
                j += 1
            else:
                break
        if not j:
            continue
        run = re.sub(r"\s+", " ", raw[:j]).strip()
        peeled = ""
        for _ in range(2):
            head, sep, tail = run.rpartition(" ")
            if sep and tail and len(tail) <= 3 and tail not in ("LA", "DU", "ET", "ES", "À", "DE"):
                nxt = body[i + j:i + j + 1]
                if nxt.islower() or nxt in "\u2019'" or tail[-1:] in "\u2019'":
                    run = head.strip()
                    peeled = tail + peeled
        if len(run) < 12:
            continue
        candidate = re.sub(r"\s+", " ", m.group(0).strip() + " " + run).strip()
        if len(candidate) < 20 or candidate.endswith(":"):
            continue
        parts.append(body[pos:m.start()])
        parts.append("\n\n## %s\n\n" % candidate)
        parts.append(peeled)
        pos = i + j
        idx = i + j
        count += 1
    parts.append(body[pos:])
    return "".join(parts), count


def run():
    for path in FILES:
        name = pathlib.Path(path).name
        text = open(path, encoding="utf-8").read()
        header, body = strip_header(text)
        if "## Tester les acquis" in body:
            print("%s: already polished, skipped" % name)
            continue
        stats = {}
        t = body
        for bad, good in TYPOS:
            n = t.count(bad)
            if n:
                t = t.replace(bad, good)
                stats["typos"] = stats.get("typos", 0) + n
        # re-join all-caps lines the book splits across lines ("... À POINT DE\nDÉPART SPINAL")
        t = re.sub(r"(?<=[%s])\n(?=[%s])" % (RUN_CHARS, RUN_CHARS), " ", t)
        t, stats["chapters"] = promote_chapters(t)
        for marker in MARKERS:
            t, n = re.subn(r"(?<![\w#])(%s)(?=[\s:•]|$)" % marker, lambda m: "\n\n## %s\n\n" % m.group(1).strip(), t)
            stats["markers"] = stats.get("markers", 0) + n
        t, stats["exercise_switch"] = re.subn(
            r"(?<![\w#])(Tester les acquis)(?=[\s:]|$)",
            "\n\n<!-- type: exercise -->\n\n## Tester les acquis\n\n", t)
        t, stats["activities"] = promote(t, r"Activit[ée]\s*\d+")
        t, stats["captions"] = promote(t, r"Document \d+[ab]?\s*:\s*")
        open(path, "w", encoding="utf-8").write(header + t)
        print(name, stats)


run()
