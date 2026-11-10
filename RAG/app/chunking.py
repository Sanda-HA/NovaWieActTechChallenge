"""Document parsing and chunking.

Document format (see README): a front-matter header between two '---' lines, then Markdown.
Inside the body:
  <!-- page: N -->        sets the page number for the following text
  <!-- type: definition --> switches content_type (course | exercise | definition) until the next directive
  ## Heading              starts a new section (a chunk never crosses a heading)
"""
import re

from app import config

PAGE_RE = re.compile(r"^<!--\s*page:\s*(\d+)\s*-->\s*$")
REVIEW_RE = re.compile(r"^<!--\s*REVIEW\b.*-->\s*$")
TYPE_RE = re.compile(r"^<!--\s*type:\s*(\w+)\s*-->\s*$")
SENT_RE = re.compile(r"(?<=[.!?؟])\s+")

REQUIRED_HEADER = ["document_id", "grade", "section", "subject", "content_type", "language", "source"]


def parse_header(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.S)
    if not m:
        raise ValueError("document must start with a '---' front-matter block")
    header = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            header[key.strip()] = value.strip()
    missing = [k for k in REQUIRED_HEADER if k not in header]
    if missing:
        raise ValueError("missing header fields: " + ", ".join(missing))
    if header["content_type"] not in config.CONTENT_TYPES:
        raise ValueError("content_type must be one of %s" % (config.CONTENT_TYPES,))
    return header, m.group(2)


def split_long_paragraph(paragraph, max_chars):
    """Split an over-long paragraph at sentence boundaries."""
    parts, current = [], ""
    for sentence in SENT_RE.split(paragraph):
        if current and len(current) + len(sentence) + 1 > max_chars:
            parts.append(current)
            current = sentence
        else:
            current = (current + " " + sentence).strip()
    if current:
        parts.append(current)
    return parts


def flush_section(paragraphs, meta, out):
    """Pack paragraphs into chunks of at most CHUNK_MAX_CHARS."""
    pieces = []
    for p in paragraphs:
        pieces.extend(split_long_paragraph(p, config.CHUNK_MAX_CHARS) if len(p) > config.CHUNK_MAX_CHARS else [p])
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 2 > config.CHUNK_MAX_CHARS:
            out.append(dict(meta, content=current))
            current = piece
        else:
            current = (current + "\n\n" + piece).strip()
    if current:
        out.append(dict(meta, content=current))


def chunk_document(text):
    header, body = parse_header(text)
    out = []
    page = 1
    ctype = header["content_type"]
    heading = header.get("topic", "")
    paragraphs, buf = [], []

    def close_paragraph():
        if buf:
            paragraphs.append("\n".join(buf).strip())
            buf.clear()

    def close_section():
        close_paragraph()
        if paragraphs:
            meta = {"heading": heading, "page": page, "content_type": ctype}
            flush_section(paragraphs, meta, out)
            paragraphs.clear()

    for line in body.splitlines():
        stripped = line.strip()
        if REVIEW_RE.match(stripped):
            continue                      # draft marker from pdf_to_draft.py, never part of the content
        elif PAGE_RE.match(stripped):
            close_section()
            page = int(PAGE_RE.match(stripped).group(1))
        elif TYPE_RE.match(stripped):
            close_section()
            ctype = TYPE_RE.match(stripped).group(1)
            if ctype not in config.CONTENT_TYPES:
                raise ValueError("unknown type directive: " + ctype)
        elif stripped.startswith("#"):
            close_section()
            heading = stripped.lstrip("#").strip()
        elif stripped == "":
            close_paragraph()
        else:
            buf.append(line.rstrip())
    close_section()

    chunks = []
    for n, c in enumerate(out, start=1):
        chunks.append({
            "chunk_id": "%s_chunk_%03d" % (header["document_id"], n),
            "document_id": header["document_id"],
            "country": header.get("country", "Tunisia"),
            "educational_level": header.get("educational_level", "secondary"),
            "grade": header["grade"],
            "section": header["section"],
            "subject": header["subject"],
            "topic": header.get("topic", ""),
            "heading": c["heading"],
            "content_type": c["content_type"],
            "language": header["language"],
            "content": c["content"],
            "source": header["source"],
            "page": c["page"],
        })
    return chunks
