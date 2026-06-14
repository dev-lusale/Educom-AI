"""
Educom AI Backend — PDF Generation Service
Generates professional, print-ready PDF documents for:
  - Quiz papers
  - ECZ-style examination papers
  - Marking schemes

Uses ReportLab for server-side PDF generation.
Output is a bytes object that can be streamed as a download response.

Design standards:
  - ECZ-aligned header with school branding placeholder
  - Professional typography (Times New Roman body, Helvetica headings)
  - A4 page size (210 × 297 mm)
  - Section and question numbering matching ECZ conventions
"""

import io
import logging
from datetime import datetime
from typing import Optional, Union

logger = logging.getLogger(__name__)


# ── Colour palette ────────────────────────────────────────────────────────────

NAVY   = (0.071, 0.141, 0.302)   # #122670 — ECZ dark blue
GOLD   = (0.722, 0.573, 0.137)   # #B8921F — ECZ gold accent
BLACK  = (0, 0, 0)
WHITE  = (1, 1, 1)
LGRAY  = (0.92, 0.92, 0.92)      # light grey for alternating rows
DGRAY  = (0.45, 0.45, 0.45)      # dark grey for sub-labels


def _get_rl():
    """Lazy-import ReportLab to avoid import errors at startup if not installed."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, PageBreak, KeepTogether,
        )
        from reportlab.lib import colors
        return {
            "A4": A4, "cm": cm, "mm": mm,
            "getSampleStyleSheet": getSampleStyleSheet,
            "ParagraphStyle": ParagraphStyle,
            "TA_LEFT": TA_LEFT, "TA_CENTER": TA_CENTER,
            "TA_RIGHT": TA_RIGHT, "TA_JUSTIFY": TA_JUSTIFY,
            "SimpleDocTemplate": SimpleDocTemplate,
            "Paragraph": Paragraph, "Spacer": Spacer,
            "Table": Table, "TableStyle": TableStyle,
            "HRFlowable": HRFlowable, "PageBreak": PageBreak,
            "KeepTogether": KeepTogether,
            "colors": colors,
        }
    except ImportError as e:
        raise ImportError(
            "ReportLab is not installed. Run: pip install reportlab"
        ) from e


def _rl_color(rgb: tuple):
    """Convert (r, g, b) float tuple to a ReportLab Color."""
    rl = _get_rl()
    return rl["colors"].Color(*rgb)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _make_styles():
    """Build a reusable style dictionary."""
    rl = _get_rl()
    ss = rl["getSampleStyleSheet"]()
    PS = rl["ParagraphStyle"]

    styles = {
        "header_title": PS("HeaderTitle",
            fontName="Helvetica-Bold", fontSize=16,
            textColor=_rl_color(NAVY),
            alignment=rl["TA_CENTER"], spaceAfter=2),
        "header_sub": PS("HeaderSub",
            fontName="Helvetica", fontSize=10,
            textColor=_rl_color(NAVY),
            alignment=rl["TA_CENTER"], spaceAfter=2),
        "header_meta": PS("HeaderMeta",
            fontName="Helvetica", fontSize=9,
            textColor=_rl_color(DGRAY),
            alignment=rl["TA_CENTER"], spaceAfter=4),
        "section_label": PS("SectionLabel",
            fontName="Helvetica-Bold", fontSize=11,
            textColor=_rl_color(NAVY),
            spaceBefore=12, spaceAfter=4),
        "instructions": PS("Instructions",
            fontName="Helvetica-Oblique", fontSize=9,
            textColor=_rl_color(DGRAY),
            spaceAfter=6, leading=13),
        "q_number": PS("QNumber",
            fontName="Helvetica-Bold", fontSize=10,
            textColor=_rl_color(BLACK), spaceAfter=2),
        "q_body": PS("QBody",
            fontName="Times-Roman", fontSize=10,
            leading=15, spaceAfter=4,
            alignment=rl["TA_JUSTIFY"]),
        "option": PS("Option",
            fontName="Times-Roman", fontSize=10,
            leading=14, leftIndent=18, spaceAfter=2),
        "answer_key": PS("AnswerKey",
            fontName="Courier", fontSize=9,
            textColor=_rl_color(NAVY), spaceAfter=2),
        "marking_expected": PS("MarkingExpected",
            fontName="Times-Roman", fontSize=10,
            leading=14, spaceAfter=4,
            alignment=rl["TA_JUSTIFY"]),
        "marking_alt": PS("MarkingAlt",
            fontName="Times-Italic", fontSize=9,
            textColor=_rl_color(DGRAY),
            leading=13, leftIndent=12, spaceAfter=2),
        "examiner_note": PS("ExaminerNote",
            fontName="Helvetica-Oblique", fontSize=9,
            textColor=_rl_color(DGRAY), spaceAfter=2),
        "footer": PS("Footer",
            fontName="Helvetica", fontSize=8,
            textColor=_rl_color(DGRAY),
            alignment=rl["TA_CENTER"]),
        "normal": ss["Normal"],
    }
    return styles


def _make_doc(buffer: io.BytesIO, title: str):
    """Create a SimpleDocTemplate with standard A4 margins."""
    rl = _get_rl()
    cm = rl["cm"]
    return rl["SimpleDocTemplate"](
        buffer,
        pagesize=rl["A4"],
        leftMargin=2.5 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title=title,
        author="EduCom AI — Assessment Intelligence Platform",
    )


def _header_block(data: dict, doc_type: str, styles: dict) -> list:
    """Build the standard ECZ-style document header."""
    rl = _get_rl()
    Paragraph = rl["Paragraph"]
    Spacer    = rl["Spacer"]
    HRFlowable = rl["HRFlowable"]
    Table     = rl["Table"]
    TableStyle = rl["TableStyle"]
    colors    = rl["colors"]
    cm        = rl["cm"]

    grade    = data.get("grade", "")
    subject  = data.get("subject", "")
    topic    = data.get("topic", "")
    term     = data.get("term", "")
    year     = data.get("year", str(datetime.now().year))
    duration = data.get("duration", "")
    marks    = data.get("total_marks", "")
    exam_type = data.get("exam_type", doc_type)

    items = []

    # Coloured header band
    header_data = [[
        Paragraph("EduCom AI — Assessment Intelligence Platform", styles["header_sub"]),
    ]]
    t = Table(header_data, colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _rl_color(NAVY)),
        ("TEXTCOLOR",  (0, 0), (-1, -1), colors.white),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    items.append(t)
    items.append(Spacer(1, 0.3 * cm))

    items.append(Paragraph(f"{grade} {subject}".upper(), styles["header_title"]))
    items.append(Paragraph(exam_type.upper(), styles["header_sub"]))

    if topic:
        items.append(Paragraph(f"Topic: {topic}", styles["header_meta"]))

    meta_parts = []
    if term or year:
        meta_parts.append(f"{term} {year}".strip())
    if duration:
        meta_parts.append(f"Time Allowed: {duration}")
    if marks:
        meta_parts.append(f"Total Marks: {marks}")

    if meta_parts:
        items.append(Paragraph("  |  ".join(meta_parts), styles["header_meta"]))

    items.append(Spacer(1, 0.2 * cm))
    items.append(HRFlowable(width="100%", thickness=2, color=_rl_color(GOLD)))
    items.append(Spacer(1, 0.3 * cm))

    return items


# ── Quiz PDF ──────────────────────────────────────────────────────────────────

def generate_quiz_pdf(quiz_data: dict) -> bytes:
    """
    Generate a professional quiz PDF from a QuizData dict.

    Args:
        quiz_data: Dict matching the QuizData Pydantic model.

    Returns:
        PDF as bytes.
    """
    rl     = _get_rl()
    buffer = io.BytesIO()
    styles = _make_styles()
    Paragraph  = rl["Paragraph"]
    Spacer     = rl["Spacer"]
    Table      = rl["Table"]
    TableStyle = rl["TableStyle"]
    KeepTogether = rl["KeepTogether"]
    HRFlowable = rl["HRFlowable"]
    cm         = rl["cm"]
    colors     = rl["colors"]

    subject = quiz_data.get("subject", "Subject")
    grade   = quiz_data.get("grade", "Grade")
    topic   = quiz_data.get("topic", "Topic")
    doc     = _make_doc(buffer, f"{grade} {subject} Quiz — {topic}")

    story = []

    # Header
    story.extend(_header_block(quiz_data, "Quiz", styles))

    # Instructions
    instructions = quiz_data.get("instructions", "Answer ALL questions.")
    story.append(Paragraph("INSTRUCTIONS TO CANDIDATES:", styles["section_label"]))
    story.append(Paragraph(instructions, styles["instructions"]))
    story.append(Spacer(1, 0.3 * cm))

    # Sections & Questions
    sections = quiz_data.get("sections", [])
    for section in sections:
        section_name = section.get("name", "Section")
        section_desc = section.get("description", "")
        section_marks = section.get("section_marks", 0)
        questions    = section.get("questions", [])

        story.append(HRFlowable(width="100%", thickness=0.5, color=_rl_color(LGRAY)))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(section_name.upper(), styles["section_label"]))
        if section_desc:
            story.append(Paragraph(section_desc, styles["instructions"]))

        for q in questions:
            q_num   = q.get("number", "")
            q_type  = q.get("type", "")
            q_text  = q.get("question", "")
            q_marks = q.get("marks", 1)

            # Question block
            q_block = []
            q_block.append(Paragraph(
                f"<b>Question {q_num}</b>  <font size='9' color='grey'>[{q_marks} mark{'s' if q_marks != 1 else ''}]</font>",
                styles["q_number"]
            ))
            q_block.append(Paragraph(q_text, styles["q_body"]))

            # MCQ options
            if q_type == "mcq" and q.get("options"):
                for opt in q["options"]:
                    letter = opt.get("letter", "")
                    text   = opt.get("text", "")
                    q_block.append(Paragraph(f"({letter})  {text}", styles["option"]))

            # Answer space for non-MCQ
            if q_type in ("short_answer", "structured"):
                lines = 3 if q_type == "short_answer" else 8
                q_block.append(Spacer(1, 0.15 * cm))
                for _ in range(lines):
                    q_block.append(HRFlowable(
                        width="100%", thickness=0.3,
                        color=_rl_color(LGRAY), spaceAfter=10
                    ))

            q_block.append(Spacer(1, 0.25 * cm))
            story.append(KeepTogether(q_block))

    # Answer Key (separate section at the end)
    answer_key = quiz_data.get("answer_key", [])
    if answer_key:
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=1.5, color=_rl_color(GOLD)))
        story.append(Paragraph("ANSWER KEY — FOR TEACHER USE ONLY", styles["section_label"]))

        # Arrange in a compact grid
        row_size = 5
        rows = []
        current_row = []
        for entry in answer_key:
            q_n = entry.get("question_number", "")
            ans = entry.get("answer", "")
            current_row.append(f"Q{q_n}: {ans}")
            if len(current_row) == row_size:
                rows.append(current_row)
                current_row = []
        if current_row:
            current_row += [""] * (row_size - len(current_row))
            rows.append(current_row)

        if rows:
            ak_table = Table(rows)
            ak_table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN",    (0, 0), (-1, -1), "CENTER"),
                ("BACKGROUND", (0, 0), (-1, -1), _rl_color(LGRAY)),
                ("GRID",     (0, 0), (-1, -1), 0.3, _rl_color(DGRAY)),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(ak_table)

    doc.build(story)
    return buffer.getvalue()


# ── Exam PDF ──────────────────────────────────────────────────────────────────

def generate_exam_pdf(exam_data: dict) -> bytes:
    """
    Generate a professional ECZ-style examination paper PDF.

    Args:
        exam_data: Dict matching the ExamData Pydantic model.

    Returns:
        PDF as bytes.
    """
    rl     = _get_rl()
    buffer = io.BytesIO()
    styles = _make_styles()
    Paragraph  = rl["Paragraph"]
    Spacer     = rl["Spacer"]
    HRFlowable = rl["HRFlowable"]
    KeepTogether = rl["KeepTogether"]
    cm         = rl["cm"]

    subject = exam_data.get("subject", "Subject")
    grade   = exam_data.get("grade", "Grade")
    topic   = exam_data.get("topic", "")
    doc     = _make_doc(buffer, f"{grade} {subject} Examination")

    story = []

    # Header
    story.extend(_header_block(exam_data, "Examination", styles))

    # Instructions to candidates
    instructions = exam_data.get("instructions_to_candidates", [])
    if instructions:
        story.append(Paragraph("INSTRUCTIONS TO CANDIDATES:", styles["section_label"]))
        for idx, instr in enumerate(instructions, 1):
            story.append(Paragraph(f"{idx}.  {instr}", styles["instructions"]))
        story.append(Spacer(1, 0.4 * cm))

    # Sections & Questions
    sections = exam_data.get("sections", [])
    for section in sections:
        label        = section.get("label", "SECTION")
        title        = section.get("title", "")
        sec_instr    = section.get("instructions", "")
        questions    = section.get("questions", [])

        story.append(HRFlowable(width="100%", thickness=1.5, color=_rl_color(NAVY)))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(f"{label}: {title}".upper(), styles["section_label"]))
        if sec_instr:
            story.append(Paragraph(sec_instr, styles["instructions"]))
        story.append(Spacer(1, 0.2 * cm))

        for q in questions:
            q_num   = q.get("number", "")
            q_type  = q.get("type", "")
            q_text  = q.get("question", "")
            q_marks = q.get("marks", 1)

            q_block = []
            q_block.append(Paragraph(
                f"<b>{q_num}.</b>  <font size='9' color='grey'>({q_marks} marks)</font>",
                styles["q_number"]
            ))

            # Split multi-part questions on \n
            for line in q_text.replace("\\n", "\n").split("\n"):
                line = line.strip()
                if line:
                    q_block.append(Paragraph(line, styles["q_body"]))

            # MCQ options
            if q_type == "mcq" and q.get("options"):
                for opt in q["options"]:
                    letter = opt.get("letter", "")
                    text   = opt.get("text", "")
                    q_block.append(Paragraph(f"({letter})  {text}", styles["option"]))

            # Answer space
            if q_type == "short_answer":
                q_block.append(Spacer(1, 0.15 * cm))
                for _ in range(6):
                    q_block.append(HRFlowable(
                        width="100%", thickness=0.3,
                        color=_rl_color(LGRAY), spaceAfter=10
                    ))
            elif q_type == "structured":
                q_block.append(Spacer(1, 0.15 * cm))
                for _ in range(14):
                    q_block.append(HRFlowable(
                        width="100%", thickness=0.3,
                        color=_rl_color(LGRAY), spaceAfter=10
                    ))

            q_block.append(Spacer(1, 0.3 * cm))
            story.append(KeepTogether(q_block))

    # Examiner notes (small print footer)
    examiner_notes = exam_data.get("examiner_notes", "")
    if examiner_notes:
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=_rl_color(LGRAY)))
        story.append(Paragraph(examiner_notes, styles["footer"]))

    doc.build(story)
    return buffer.getvalue()


# ── Marking Scheme PDF ────────────────────────────────────────────────────────

def generate_marking_scheme_pdf(ms_data: dict) -> bytes:
    """
    Generate a professional marking scheme PDF.

    Args:
        ms_data: Dict matching the MarkingSchemeData Pydantic model.

    Returns:
        PDF as bytes.
    """
    rl     = _get_rl()
    buffer = io.BytesIO()
    styles = _make_styles()
    Paragraph  = rl["Paragraph"]
    Spacer     = rl["Spacer"]
    Table      = rl["Table"]
    TableStyle = rl["TableStyle"]
    HRFlowable = rl["HRFlowable"]
    KeepTogether = rl["KeepTogether"]
    cm         = rl["cm"]
    colors     = rl["colors"]
    mm         = rl["mm"]

    subject = ms_data.get("subject", "Subject")
    grade   = ms_data.get("grade", "Grade")
    doc     = _make_doc(buffer, f"{grade} {subject} Marking Scheme")

    # Override doc_type label in header
    ms_display = dict(ms_data)
    ms_display["exam_type"] = f"Marking Scheme — {ms_data.get('exam_type', 'Examination')}"

    story = []
    story.extend(_header_block(ms_display, "Marking Scheme", styles))

    # CONFIDENTIAL banner
    story.append(Paragraph(
        "⚠  CONFIDENTIAL — FOR EXAMINER USE ONLY  ⚠",
        styles["section_label"]
    ))
    story.append(Spacer(1, 0.3 * cm))

    # General examiner notes
    general_notes = ms_data.get("general_examiner_notes", [])
    if general_notes:
        story.append(Paragraph("GENERAL MARKING INSTRUCTIONS:", styles["section_label"]))
        for note in general_notes:
            story.append(Paragraph(f"• {note}", styles["examiner_note"]))
        story.append(Spacer(1, 0.3 * cm))

    # Marking rubric
    rubric = ms_data.get("marking_rubric", "")
    if rubric:
        story.append(Paragraph(f"<b>Marking Rubric:</b>  {rubric}", styles["instructions"]))
        story.append(Spacer(1, 0.3 * cm))

    # Sections
    sections = ms_data.get("sections", [])
    for section in sections:
        label     = section.get("label", "SECTION")
        questions = section.get("questions", [])

        story.append(HRFlowable(width="100%", thickness=1.5, color=_rl_color(NAVY)))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Paragraph(label.upper(), styles["section_label"]))
        story.append(Spacer(1, 0.1 * cm))

        for q in questions:
            q_num   = q.get("number", "")
            q_text  = q.get("question", "")
            q_marks = q.get("marks", 0)
            expected = q.get("expected_response", "")
            alts     = q.get("alternative_responses", [])
            ex_notes = q.get("examiner_notes", "")
            mark_alloc = q.get("mark_allocation", "")

            q_block = []

            # Question header row
            header_row = [[
                Paragraph(f"<b>Q{q_num}</b>", styles["q_number"]),
                Paragraph(q_text[:200] + ("…" if len(q_text) > 200 else ""), styles["q_body"]),
                Paragraph(f"<b>[{q_marks} marks]</b>", styles["q_number"]),
            ]]
            ht = Table(header_row, colWidths=[1.0 * cm, None, 2.0 * cm])
            ht.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, -1), _rl_color(LGRAY)),
                ("ALIGN",        (2, 0), (2, 0),   "RIGHT"),
                ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING",   (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                ("LEFTPADDING",  (0, 0), (-1, -1), 4),
            ]))
            q_block.append(ht)

            # Expected response
            if expected:
                q_block.append(Paragraph(
                    f"<b>Expected Response:</b>  {expected}", styles["marking_expected"]
                ))

            # Alternatives
            for alt in alts:
                if alt:
                    q_block.append(Paragraph(f"✓ Also accept:  {alt}", styles["marking_alt"]))

            # Mark allocation
            if mark_alloc:
                q_block.append(Paragraph(
                    f"<b>Mark Allocation:</b>  {mark_alloc}", styles["examiner_note"]
                ))

            # Examiner notes
            if ex_notes:
                q_block.append(Paragraph(
                    f"<i>Examiner Note:</i>  {ex_notes}", styles["examiner_note"]
                ))

            q_block.append(Spacer(1, 0.35 * cm))
            story.append(KeepTogether(q_block))

    doc.build(story)
    return buffer.getvalue()


# ── Lesson Plan PDF ───────────────────────────────────────────────────────────

def generate_lesson_plan_pdf(plan_data: dict) -> bytes:
    """
    Generate a professional lesson plan PDF matching the CBC format.

    Args:
        plan_data: Dict matching the LessonPlanData Pydantic model.

    Returns:
        PDF as bytes.
    """
    rl     = _get_rl()
    buffer = io.BytesIO()
    styles = _make_styles()
    Paragraph  = rl["Paragraph"]
    Spacer     = rl["Spacer"]
    Table      = rl["Table"]
    TableStyle = rl["TableStyle"]
    HRFlowable = rl["HRFlowable"]
    KeepTogether = rl["KeepTogether"]
    cm         = rl["cm"]
    colors     = rl["colors"]

    subject = plan_data.get("subject", "Subject")
    grade   = plan_data.get("grade", "Grade")
    topic   = plan_data.get("topic", "Topic")
    doc     = _make_doc(buffer, f"{grade} {subject} — {topic} Lesson Plan")

    story = []

    # ── Header band ─────────────────────────────────────────────────────────
    header_data = [[Paragraph("EduCom AI — Lesson Plan", styles["header_sub"])]]
    t = Table(header_data, colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _rl_color(NAVY)),
        ("TEXTCOLOR",  (0, 0), (-1, -1), colors.white),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("ZAMBIA COMPETENCY-BASED CURRICULUM", styles["header_title"]))
    story.append(Paragraph("LESSON PLAN", styles["header_sub"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=_rl_color(GOLD)))
    story.append(Spacer(1, 0.3 * cm))

    # ── Administrative info table ────────────────────────────────────────────
    info = [
        ["School:", plan_data.get("school", ""), "Date:", plan_data.get("date", "")],
        ["Teacher:", plan_data.get("teacherName", ""), "Department:", plan_data.get("department", "")],
        ["Grade:", plan_data.get("grade", ""), "Subject:", plan_data.get("subject", "")],
        ["Topic:", plan_data.get("topic", ""), "Duration:", plan_data.get("duration", "")],
        ["Enrollment:", plan_data.get("enrollment", ""), "References:", plan_data.get("references", "")],
    ]
    info_table = Table(info, colWidths=[2.5 * cm, None, 2.5 * cm, None])
    info_table.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",  (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME",  (1, 0), (1, -1), "Times-Roman"),
        ("FONTNAME",  (3, 0), (3, -1), "Times-Roman"),
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("BACKGROUND",(0, 0), (0, -1), _rl_color(LGRAY)),
        ("BACKGROUND",(2, 0), (2, -1), _rl_color(LGRAY)),
        ("VALIGN",    (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",(0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("GRID",      (0, 0), (-1, -1), 0.3, _rl_color(DGRAY)),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Objectives ───────────────────────────────────────────────────────────
    story.append(Paragraph("LEARNING OBJECTIVES", styles["section_label"]))
    story.append(Paragraph(plan_data.get("objectives", ""), styles["q_body"]))
    story.append(Spacer(1, 0.3 * cm))

    # ── Teaching aids ────────────────────────────────────────────────────────
    aids = plan_data.get("teachingAids", [])
    if aids:
        story.append(Paragraph("TEACHING AND LEARNING MATERIALS", styles["section_label"]))
        story.append(Paragraph("  •  ".join(aids), styles["q_body"]))
        story.append(Spacer(1, 0.3 * cm))

    # ── 3-Step lesson table ──────────────────────────────────────────────────
    story.append(Paragraph("LESSON STEPS", styles["section_label"]))

    col_widths = [2.2 * cm, None, None]
    step_header = [["Step / Time", "Teacher Activities", "Learner Activities"]]
    step_rows = [step_header[0]]

    steps = plan_data.get("steps", [])
    for step in steps:
        step_num   = step.get("stepNumber", "")
        step_title = step.get("title", "")
        step_dur   = step.get("duration", "")
        t_acts     = step.get("teacherActivities", [])
        l_acts     = step.get("learnerActivities", [])

        max_rows = max(len(t_acts), len(l_acts))
        for i in range(max_rows):
            ta_text = f"• {t_acts[i]}" if i < len(t_acts) else ""
            la_text = f"• {l_acts[i]}" if i < len(l_acts) else ""
            if i == 0:
                step_cell = Paragraph(
                    f"<b>Step {step_num}</b><br/>{step_title}<br/><font size='8'>{step_dur}</font>",
                    styles["q_number"]
                )
                step_rows.append([step_cell, Paragraph(ta_text, styles["q_body"]), Paragraph(la_text, styles["q_body"])])
            else:
                step_rows.append(["", Paragraph(ta_text, styles["q_body"]), Paragraph(la_text, styles["q_body"])])

    steps_table = Table(step_rows, colWidths=col_widths)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), _rl_color(NAVY)),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("GRID",       (0, 0), (-1, -1), 0.3, _rl_color(DGRAY)),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    # Shade step header cells (first column per step)
    row_cursor = 1
    for step in steps:
        t_acts = step.get("teacherActivities", [])
        l_acts = step.get("learnerActivities", [])
        step_height = max(len(t_acts), len(l_acts))
        if step_height > 0:
            style_cmds.append(("BACKGROUND", (0, row_cursor), (0, row_cursor + step_height - 1), _rl_color(LGRAY)))
            if step_height > 1:
                style_cmds.append(("SPAN", (0, row_cursor), (0, row_cursor + step_height - 1)))
        row_cursor += step_height

    steps_table.setStyle(TableStyle(style_cmds))
    story.append(steps_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Homework ─────────────────────────────────────────────────────────────
    hw = plan_data.get("homework", {})
    if hw:
        story.append(Paragraph("HOMEWORK / ASSIGNMENT", styles["section_label"]))
        story.append(Paragraph(hw.get("description", ""), styles["q_body"]))
        ecz_align = hw.get("eczAlignment", "")
        if ecz_align:
            story.append(Paragraph(f"<i>ECZ Alignment:</i>  {ecz_align}", styles["examiner_note"]))
        story.append(Spacer(1, 0.3 * cm))

    # ── Teacher signature block ───────────────────────────────────────────────
    sig_data = [
        ["Teacher's Signature: _______________________", "Head of Department: _______________________"],
        ["Date: ___________________", "Date: ___________________"],
    ]
    sig_table = Table(sig_data, colWidths=["50%", "50%"])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(sig_table)

    doc.build(story)
    return buffer.getvalue()
