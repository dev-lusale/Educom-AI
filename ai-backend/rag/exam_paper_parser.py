"""
Educom AI Backend — ECZ Exam Paper Filename Metadata Parser

Extracts structured metadata from ECZ exam paper filenames so the AI
can filter and retrieve papers by grade, subject, year, and paper type.

Supports all naming conventions found in curriculum_docs/exam_papers/:
  - "mathermatics G7 2024 (1).pdf"
  - "g9_mathematics_p2_2019.pdf"
  - "watermarked_Science paper 1 2024 GCE G12.pdf"
  - "2021 G9 Internal P2 Math.pdf"
  - "g12_chemistry_p2_2020_internal.pdf"
  - "biology 2024 grade 12 G.C.E.pdf"
  - "english paper 1 grade 9 2024 G.C.E.pdf"
"""

import re
from pathlib import Path
from typing import Optional


# ── Grade patterns ────────────────────────────────────────────────────────────

_GRADE_PATTERNS = [
    # "G7", "G9", "G12", "grade 7", "grade 9", "grade 12"
    (r"\bG(?:rade\s*)?(\d{1,2})\b",   lambda m: f"Grade {m.group(1)}"),
    (r"\bgrade\s+(\d{1,2})\b",         lambda m: f"Grade {m.group(1)}"),
]

# ── Subject keyword map ───────────────────────────────────────────────────────
# Maps regex patterns → canonical subject name

_SUBJECT_MAP: list[tuple[str, str]] = [
    (r"\bmath(?:s|ematics|ermatics)?\b",     "Mathematics"),
    (r"\bscience\b",                          "Science"),
    (r"\bbiology\b",                          "Biology"),
    (r"\bchemistry\b",                        "Chemistry"),
    (r"\bphysics\b",                          "Physics"),
    (r"\bintegr?ated\s*science\b",            "Integrated Science"),
    (r"\benglish\b",                          "English Language"),
    (r"\bsocial\s+studies\b",                 "Social Studies"),
    (r"\bcivic(?:s)?\b",                      "Civic Education"),
    (r"\bhistory\b",                          "History"),
    (r"\bgeography\b",                        "Geography"),
    (r"\breligious\s+education\b",            "Religious Education"),
    (r"\br\.?e\.?\b",                         "Religious Education"),
    (r"\bcomputer\s+studies\b",               "Computer Studies"),
    (r"\bbusiness\s+studies\b",               "Business Studies"),
    (r"\bcts\b|creative.*technology\b",       "Creative and Technology Studies"),
    (r"\bnyanja\b|cinyanja\b",                "Zambian Languages"),
    (r"\btonga\b|chitonga\b",                 "Zambian Languages"),
    (r"\bspecial\s+paper\b",                  "Special Paper"),
    (r"\bs\.?s\b",                            "Social Studies"),    # g9_ss_2023
    (r"\bb\.?s\b",                            "Business Studies"),  # g9_bs_2020
]

# ── Year patterns ─────────────────────────────────────────────────────────────

_YEAR_RE = re.compile(r"\b(20\d{2}|19\d{2})\b")

# ── Paper number patterns ─────────────────────────────────────────────────────

_PAPER_RE = re.compile(r"\bp(?:aper)?\s*([12])\b", re.IGNORECASE)

# ── Exam type patterns ────────────────────────────────────────────────────────

_EXAM_TYPE_MAP: list[tuple[str, str]] = [
    (r"\bgce\b|g\.c\.e\b",         "GCE"),
    (r"\bexternal\b",               "External"),
    (r"\binternal\b",               "Internal"),
    (r"\bspecimen\b",               "Specimen"),
    (r"\bmock\b",                   "Mock"),
    (r"\bmid.?term\b",              "Mid-Term"),
    (r"\bend.of.term\b",            "End of Term"),
    (r"\bwatermarked\b",            "Official"),
]


def parse_exam_filename(filename: str) -> dict:
    """
    Parse an ECZ exam paper filename into structured metadata.

    Args:
        filename: The PDF filename (with or without path).

    Returns:
        Dict with keys:
            grade       — e.g. "Grade 7", "Grade 9", "Grade 12"  (or "")
            subject     — e.g. "Mathematics", "Biology"           (or "")
            year        — e.g. "2024"                             (or "")
            paper       — e.g. "Paper 1", "Paper 2"               (or "")
            exam_type   — e.g. "GCE", "Internal", "Specimen"      (or "ECZ")
            category    — always "exam_paper"
            description — human-readable summary
    """
    stem = Path(filename).stem
    # Normalise: remove underscores, extra brackets, "watermarked" prefix
    text = re.sub(r"watermarked_?", "", stem, flags=re.IGNORECASE)
    text = re.sub(r"[_]", " ", text)
    text = re.sub(r"\(\s*\d+\s*\)", "", text)   # remove "(1)" disambiguation suffixes
    text = text.strip()
    lower = text.lower()

    # ── Grade ─────────────────────────────────────────────────────────────────
    grade = ""
    for pattern, formatter in _GRADE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            grade = formatter(m)
            break

    # ── Subject ───────────────────────────────────────────────────────────────
    subject = ""
    for pattern, canonical in _SUBJECT_MAP:
        if re.search(pattern, lower):
            subject = canonical
            break

    # ── Year ──────────────────────────────────────────────────────────────────
    year_match = _YEAR_RE.search(text)
    year = year_match.group(1) if year_match else ""

    # ── Paper number ──────────────────────────────────────────────────────────
    paper_match = _PAPER_RE.search(text)
    paper = f"Paper {paper_match.group(1)}" if paper_match else ""

    # ── Exam type ─────────────────────────────────────────────────────────────
    exam_type = "ECZ"   # default
    for pattern, label in _EXAM_TYPE_MAP:
        if re.search(pattern, lower):
            exam_type = label
            break

    # ── Human-readable description ────────────────────────────────────────────
    parts = [p for p in [grade, subject, paper, year, exam_type] if p]
    description = " — ".join(parts) if parts else stem

    return {
        "grade":       grade,
        "subject":     subject,
        "year":        year,
        "paper":       paper,
        "exam_type":   exam_type,
        "category":    "exam_paper",
        "description": description,
    }


def build_exam_paper_metadata(file_path: str) -> dict:
    """
    Build a complete ChromaDB metadata dict for an exam paper file.
    Merges filename-parsed fields with the source field expected by the retriever.

    Args:
        file_path: Absolute or relative path to the PDF.

    Returns:
        Metadata dict suitable for passing to DocumentProcessor.ingest_document().
    """
    filename = Path(file_path).name
    parsed   = parse_exam_filename(filename)

    # Keep only non-empty fields to avoid cluttering ChromaDB metadata
    meta = {
        "source":   filename,
        "category": "exam_paper",
    }
    for key in ("grade", "subject", "year", "paper", "exam_type", "description"):
        value = parsed.get(key, "")
        if value:
            meta[key] = value

    return meta
