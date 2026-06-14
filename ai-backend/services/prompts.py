"""
Educom AI Backend — Prompt Templates
All AI prompts for lesson plan generation, assessments, and more.
Designed for Zambian CBC curriculum alignment with Google Gemini (gemini-2.0-flash).

Responsible AI Policy:
  - ECZ past papers and marking schemes are used ONLY for:
    curriculum alignment, pattern analysis, difficulty calibration, retrieval context.
  - The system MUST generate original questions and never reproduce past exam content verbatim.
  - All generated assessments must be uniquely authored, ECZ-standards-aligned, and original.
"""

from typing import Optional


# ── System Prompts ───────────────────────────────────────────────────────────

LESSON_PLAN_SYSTEM_PROMPT = """You are a Zambian CBC curriculum expert and master teacher trainer.
Generate detailed, professional lesson plans strictly aligned with the Zambia Competency-Based Curriculum (CBC) framework.
Output valid JSON only. No text, explanation, or markdown outside the JSON object."""


SCHEME_OF_WORK_SYSTEM_PROMPT = """You are an expert Zambian curriculum planner with deep knowledge of the CBC framework.
Generate detailed schemes of work aligned with the Zambia CBC framework.
Include realistic topic sequences, teaching methods, and assessment strategies suitable for Zambian schools.
Always respond with valid JSON only."""


ASSESSMENT_SYSTEM_PROMPT = """You are an expert Zambian examinations specialist familiar with ECZ standards.
Generate professional, ORIGINAL assessments aligned with ECZ examination formats.
IMPORTANT: You must generate entirely new, original questions. 
Do not reproduce or copy questions from past examination papers verbatim.
Use past paper patterns only for style, structure, and difficulty calibration.
Always respond with valid JSON only."""


# ── RESPONSIBLE AI POLICY HEADER ─────────────────────────────────────────────
# Prepended to all assessment prompts to enforce originality requirements.

RESPONSIBLE_AI_POLICY = """RESPONSIBLE AI ASSESSMENT POLICY (MANDATORY):
- Generate COMPLETELY ORIGINAL questions. Do NOT reproduce any past examination questions verbatim.
- Use ECZ past papers ONLY as a reference for: question style, difficulty level, mark allocation format, and topic coverage.
- Every question must be newly authored and original to this generation request.
- Align all questions with the stated syllabus objectives and CBC competencies.
- Produce unique assessments that have never appeared in any published examination paper.

"""


# ── Lesson Plan Prompt ───────────────────────────────────────────────────────

def build_lesson_plan_prompt(
    grade: str,
    subject: str,
    topic: str,
    duration: str,
    school: str,
    department: str,
    teacher_name: str,
    enrollment: str,
    date: str,
    curriculum_context: str = "",
    example_context: str = "",
    user_context: str = "",
) -> str:
    """
    Build a detailed lesson plan prompt optimised for Gemini's large context window.
    Gemini can handle rich context — we use up to 1200 chars of RAG content.
    """
    total_mins = int(duration) if duration.isdigit() else 40
    intro_mins = round(total_mins * 0.2)
    dev_mins   = round(total_mins * 0.6)
    close_mins = total_mins - intro_mins - dev_mins

    # Build RAG context section
    rag_section = ""
    if curriculum_context:
        rag_section += f"\n--- CURRICULUM CONTEXT (use to inform learning objectives and content) ---\n{curriculum_context[:1000]}\n"
    if example_context:
        rag_section += f"\n--- EXAMPLE LESSON STRUCTURES (use for activity ideas) ---\n{example_context[:400]}\n"
    if user_context:
        rag_section += f"\n--- TEACHER'S PERSONAL RESOURCES (incorporate where relevant) ---\n{user_context[:400]}\n"
    if rag_section:
        rag_section = rag_section + "---\n"

    return f"""{rag_section}Generate a complete, professional Zambia CBC lesson plan as a JSON object.

Details:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}
- Duration: {total_mins} minutes
- School: {school or "School"}
- Department: {department or subject + " Department"}
- Teacher: {teacher_name or "Class Teacher"}
- Enrollment: {enrollment or "40 learners"}
- Date: {date or "Today"}

Lesson structure (3 steps):
  Step 1 — Introduction ({intro_mins} min): Prior knowledge activation, motivational activity, lesson objectives statement
  Step 2 — Development ({dev_mins} min): Core content delivery, learner-centred activities, group work, practical demonstrations
  Step 3 — Conclusion ({close_mins} min): Summary, formative assessment, preview of next lesson

Requirements:
- Objectives in PSBAT format: "Having been introduced to {topic}, learners should be able to (PSBAT): 1) [verb] ... 2) [verb] ... 3) [verb] ..."
- Use Bloom's Taxonomy verbs: define, explain, calculate, analyse, demonstrate, evaluate, create
- Each step must have at least 4 teacherActivities and 4 learnerActivities specific to {topic} in a Zambian classroom
- CBC competencies: criticalThinking, communication, cooperation (2+ items each)
- Teaching aids must include locally available Zambian classroom resources
- Homework must be ECZ-style and achievable without internet access
- Use Zambian contexts, examples, and terminology throughout

Return ONLY this JSON (no text outside the braces):
{{
  "school": "{school or 'School'}",
  "department": "{department or subject + ' Department'}",
  "teacherName": "{teacher_name or 'Class Teacher'}",
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "lesson": "{topic}",
  "duration": "{total_mins} minutes",
  "enrollment": "{enrollment or '40 learners'}",
  "date": "{date or 'Today'}",
  "references": "{subject} Textbook — {grade}, Zambia CBC Syllabus",
  "objectives": "Having been introduced to {topic}, learners should be able to (PSBAT): 1) [specific measurable objective]; 2) [specific measurable objective]; 3) [specific measurable objective].",
  "competencies": {{
    "criticalThinking": ["[specific critical thinking activity for {topic}]", "[another critical thinking activity]"],
    "communication": ["[specific communication activity for {topic}]", "[another communication activity]"],
    "cooperation": ["[specific cooperation activity for {topic}]", "[another cooperation activity]"]
  }},
  "teachingAids": ["chalkboard and chalk", "exercise books", "{subject} textbook", "[locally available teaching aid for {topic}]", "[another relevant aid]"],
  "steps": [
    {{
      "stepNumber": 1,
      "title": "Introduction",
      "duration": "{intro_mins} minutes",
      "competencies": ["Prior Knowledge Activation", "Communication"],
      "teacherActivities": [
        "[Teacher activity 1 — introduction to {topic}]",
        "[Teacher activity 2 — motivational context using Zambian example]",
        "[Teacher activity 3 — stating lesson objectives]",
        "[Teacher activity 4 — connecting to prior knowledge]"
      ],
      "learnerActivities": [
        "[Learner activity 1 — responding to prior knowledge questions about {topic}]",
        "[Learner activity 2 — sharing experiences related to {topic}]",
        "[Learner activity 3 — writing objectives in exercise books]",
        "[Learner activity 4 — brainstorming what they know]"
      ]
    }},
    {{
      "stepNumber": 2,
      "title": "Development",
      "duration": "{dev_mins} minutes",
      "competencies": ["Critical Thinking", "Cooperation", "Creativity"],
      "teacherActivities": [
        "[Teacher activity 1 — explaining core concept of {topic} with clear demonstration]",
        "[Teacher activity 2 — worked example using Zambian context]",
        "[Teacher activity 3 — organising group activity related to {topic}]",
        "[Teacher activity 4 — facilitating discovery learning]",
        "[Teacher activity 5 — checking understanding, posing higher-order questions]"
      ],
      "learnerActivities": [
        "[Learner activity 1 — engaging with new content about {topic}]",
        "[Learner activity 2 — completing guided practice exercise]",
        "[Learner activity 3 — group/pair work activity on {topic}]",
        "[Learner activity 4 — presenting findings to class]",
        "[Learner activity 5 — answering teacher's probing questions]"
      ]
    }},
    {{
      "stepNumber": 3,
      "title": "Conclusion",
      "duration": "{close_mins} minutes",
      "competencies": ["Reflection", "Self-Management"],
      "teacherActivities": [
        "[Teacher activity 1 — summarising key concepts of {topic}]",
        "[Teacher activity 2 — administering formative assessment (oral/written questions)]",
        "[Teacher activity 3 — giving homework instructions]",
        "[Teacher activity 4 — previewing next lesson]"
      ],
      "learnerActivities": [
        "[Learner activity 1 — summarising what they learned about {topic}]",
        "[Learner activity 2 — completing formative assessment questions]",
        "[Learner activity 3 — writing down homework assignment]",
        "[Learner activity 4 — asking clarifying questions]"
      ]
    }}
  ],
  "homework": {{
    "description": "[ECZ-style homework assignment on {topic} with 3-5 questions, achievable without internet]",
    "eczAlignment": "Aligned with ECZ {subject} {grade} examination format and CBC learning outcomes for {topic}."
  }}
}}

Fill in ALL placeholder brackets with specific, detailed, subject-appropriate content for {grade} {subject} — {topic}.
"""


# ── Scheme of Work Prompt ────────────────────────────────────────────────────

def build_scheme_of_work_prompt(
    grade: str,
    subject: str,
    term: str,
    weeks: int,
    school: str,
    teacher_name: str,
) -> str:
    """Build the scheme of work generation prompt for Gemini."""
    return f"""Generate a complete {term} scheme of work for:
- Grade: {grade}
- Subject: {subject}
- Term: {term}
- Total Weeks: {weeks}
- School: {school or "Zambian School"}
- Teacher: {teacher_name or "Class Teacher"}

Requirements:
- Align with the Zambia CBC framework and ECZ syllabus for {grade} {subject}
- Sequence topics logically from simple to complex (scaffolded learning)
- Include practical, hands-on activities suitable for Zambian classrooms
- Reference ECZ examination topics for senior grades (Forms 1–4)
- Use Zambian-localised examples, contexts, and resources
- Include formative and summative assessment strategies
- Teaching methods must be learner-centred

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "term": "{term}",
  "school": "{school or 'Zambian School'}",
  "teacher_name": "{teacher_name or 'Class Teacher'}",
  "total_weeks": {weeks},
  "weeks": [
    {{
      "week": 1,
      "topic": "Topic name aligned with {subject} {grade} CBC syllabus",
      "subtopics": ["specific subtopic 1", "specific subtopic 2", "specific subtopic 3"],
      "competencies": ["CBC competency 1", "CBC competency 2"],
      "teaching_methods": ["learner-centred method 1", "practical method 2"],
      "resources": ["resource 1 available in Zambian schools", "resource 2"],
      "assessment": "Specific formative/summative assessment method for this week's topic"
    }}
  ]
}}

Generate all {weeks} weeks with realistic, curriculum-aligned topics for {grade} {subject} {term}.
"""


# ── Assessment Prompt ────────────────────────────────────────────────────────

def build_assessment_prompt(
    grade: str,
    subject: str,
    topic: str,
    assessment_type: str,
    num_questions: int,
    marks_per_question: int,
    duration_minutes: int,
) -> str:
    """Build the assessment generation prompt with originality requirements."""
    total_marks = num_questions * marks_per_question
    type_labels = {
        "class_test": "Class Test",
        "homework": "Homework Assignment",
        "exam": "End of Term Examination",
        "quiz": "Quick Quiz",
    }
    type_label = type_labels.get(assessment_type, "Assessment")

    return f"""{RESPONSIBLE_AI_POLICY}Generate a professional, ORIGINAL {type_label} for:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}
- Number of Questions: {num_questions}
- Marks per Question: {marks_per_question}
- Total Marks: {total_marks}
- Duration: {duration_minutes} minutes

Requirements:
- All questions must be ORIGINAL — not reproduced from any past ECZ paper
- Align with ECZ {grade} {subject} examination standards and CBC objectives for {topic}
- Include a mix of question types (definitions, short answer, structured problems)
- Use Zambian contexts, names, and real-world scenarios
- Include a detailed marking guide with mark allocation per point
- Questions should progress from lower to higher order thinking (Bloom's Taxonomy)
- Difficulty should be appropriate for {grade} learners

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "assessment_type": "{type_label}",
  "total_marks": {total_marks},
  "duration": "{duration_minutes} minutes",
  "instructions": "Clear, specific instructions for learners appropriate for {grade}",
  "questions": [
    {{
      "number": 1,
      "question": "Original question text specific to {topic} using Zambian context",
      "marks": {marks_per_question},
      "answer_guide": "Detailed expected answer with specific marking points ({marks_per_question} marks breakdown)"
    }}
  ],
  "marking_guide": "General marking guidelines, rubric, and examiner notes for {type_label}"
}}

Generate all {num_questions} ORIGINAL questions. Each question must be unique, specific, and newly authored.
"""


# ── Homework Prompt ──────────────────────────────────────────────────────────

def build_homework_prompt(
    grade: str,
    subject: str,
    topic: str,
    difficulty: str,
) -> str:
    """Build the homework generation prompt."""
    return f"""Generate a homework assignment for:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}
- Difficulty: {difficulty}

Requirements:
- All tasks must be ORIGINAL — not copied from any past examination
- Align with ECZ examination style and CBC objectives for {grade} {subject}
- Include 3–5 tasks of varying types (definition, calculation, diagram, short essay)
- Use Zambian names, places, and real-world contexts
- Be achievable without internet access (suitable for rural Zambian learners)
- Include clear instructions and mark allocation

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "title": "Descriptive homework title for {topic}",
  "instructions": "General instructions for learners (2-3 sentences)",
  "tasks": [
    {{
      "number": 1,
      "type": "definition / calculation / short_answer / diagram / essay",
      "task": "Original task description using Zambian context",
      "marks": 5
    }}
  ],
  "total_marks": 20,
  "ecz_alignment": "How this homework aligns with ECZ {subject} {grade} examination objectives for {topic}"
}}
"""


# ── Learning Outcomes Prompt ─────────────────────────────────────────────────

def build_learning_outcomes_prompt(
    grade: str,
    subject: str,
    topic: str,
    num_outcomes: int,
) -> str:
    """Build the learning outcomes generation prompt."""
    return f"""Generate {num_outcomes} specific, measurable learning outcomes for:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}

Requirements:
- Use Bloom's Taxonomy action verbs (define, explain, calculate, analyse, evaluate, create, demonstrate)
- Align with Zambia CBC competency-based framework
- Be specific, measurable, and achievable in a single lesson
- Progress from lower to higher order thinking skills
- Reflect the CBC competencies: Critical Thinking, Communication, Cooperation, Creativity, Self-Management

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "outcomes": [
    {{
      "number": 1,
      "outcome": "By the end of this lesson, learners should be able to [Bloom's verb] [specific measurable outcome for {topic}].",
      "bloom_level": "Knowledge / Comprehension / Application / Analysis / Synthesis / Evaluation",
      "competency": "Critical Thinking / Communication / Cooperation / Creativity / Self-Management"
    }}
  ]
}}

Generate all {num_outcomes} outcomes, progressing from lower to higher order thinking.
"""


# ── Assessment Intelligence System Prompts ────────────────────────────────────

QUIZ_SYSTEM_PROMPT = """You are a Zambian CBC curriculum expert and ECZ examinations specialist.
Generate professional, ORIGINAL quiz assessments aligned with ECZ standards and CBC learning objectives.
CRITICAL: All questions must be uniquely authored. Never reproduce past examination questions verbatim.
Use Zambian contexts, names, and examples. Output valid JSON only. No text outside the JSON object."""

EXAM_SYSTEM_PROMPT = """You are a senior Zambian ECZ examinations officer and curriculum expert.
Generate complete, professional, ORIGINAL examination papers following ECZ structure and standards.
CRITICAL: All questions must be uniquely authored original content — not reproduced from any past paper.
ECZ past papers are used only as a reference for formatting, structure, and difficulty calibration.
Include proper instructions, section formatting, and mark allocations.
Output valid JSON only. No text outside the JSON object."""

MARKING_SCHEME_SYSTEM_PROMPT = """You are a senior ECZ examiner creating official marking schemes.
Generate detailed, examiner-quality marking guides with alternative acceptable responses.
Include specific mark allocations per point and clear examiner guidance notes.
Output valid JSON only. No text outside the JSON object."""


# ── Quiz Prompt ───────────────────────────────────────────────────────────────

def build_quiz_prompt(
    grade: str,
    subject: str,
    topic: str,
    difficulty: str = "mixed",
    num_mcq: int = 10,
    num_short_answer: int = 5,
    num_structured: int = 2,
    learning_objectives: str = "",
    curriculum_context: str = "",
) -> str:
    """Build a quiz generation prompt for ECZ-aligned, original quizzes."""
    total_marks = (num_mcq * 1) + (num_short_answer * 2) + (num_structured * 5)

    rag_block = ""
    if curriculum_context:
        rag_block = f"""--- CURRICULUM CONTEXT (use to align questions with syllabus objectives) ---
{curriculum_context[:600]}
---

"""

    objectives_block = f"Learning objectives to assess: {learning_objectives}\n" if learning_objectives else ""

    return f"""{RESPONSIBLE_AI_POLICY}{rag_block}Generate a {difficulty} difficulty, ORIGINAL quiz for:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}
{objectives_block}
Structure:
- Section A: {num_mcq} MCQ questions (1 mark each) = {num_mcq} marks
- Section B: {num_short_answer} short answer questions (2 marks each) = {num_short_answer * 2} marks
- Section C: {num_structured} structured questions (5 marks each) = {num_structured * 5} marks
- Total: {total_marks} marks

Requirements:
- ALL questions must be ORIGINAL — not taken from any past ECZ paper
- MCQ distractors must be plausible but clearly wrong on careful reading
- Short answer questions test understanding and application
- Structured questions require multi-step reasoning or extended answers
- Use Zambian names (e.g. Chanda, Mulenga, Mutale), places (Lusaka, Kitwe, Ndola), and real-world scenarios
- Difficulty: {difficulty} — calibrate accordingly
- Align every question to a CBC learning objective for {grade} {subject}

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "duration": "{max(30, (num_mcq * 1) + (num_short_answer * 3) + (num_structured * 8))} minutes",
  "total_marks": {total_marks},
  "instructions": "Answer ALL questions. Write clearly. Each question carries marks as indicated. Time allowed: [duration].",
  "difficulty": "{difficulty}",
  "sections": [
    {{
      "name": "Section A — Multiple Choice Questions",
      "description": "Circle the letter of the best answer. Each question carries 1 mark. ({num_mcq} marks)",
      "section_marks": {num_mcq},
      "questions": [
        {{
          "number": 1,
          "type": "mcq",
          "question": "Original MCQ about {topic} using Zambian context",
          "marks": 1,
          "options": [
            {{"letter": "A", "text": "plausible but incorrect option"}},
            {{"letter": "B", "text": "correct answer clearly supported by syllabus"}},
            {{"letter": "C", "text": "plausible but incorrect option"}},
            {{"letter": "D", "text": "plausible but incorrect option"}}
          ],
          "answer": "B",
          "section": "A"
        }}
      ]
    }},
    {{
      "name": "Section B — Short Answer Questions",
      "description": "Answer each question in 1–3 sentences. Each question carries 2 marks. ({num_short_answer * 2} marks)",
      "section_marks": {num_short_answer * 2},
      "questions": [
        {{
          "number": {num_mcq + 1},
          "type": "short_answer",
          "question": "Original short answer question about {topic} requiring understanding and application",
          "marks": 2,
          "answer_guide": "Expected response: [key point 1 — 1 mark] + [key point 2 — 1 mark]",
          "section": "B"
        }}
      ]
    }},
    {{
      "name": "Section C — Structured Questions",
      "description": "Answer all parts of each question. Show all working where applicable. ({num_structured * 5} marks)",
      "section_marks": {num_structured * 5},
      "questions": [
        {{
          "number": {num_mcq + num_short_answer + 1},
          "type": "structured",
          "question": "(a) [Part a — lower order, 2 marks]\\n(b) [Part b — application, 3 marks]",
          "marks": 5,
          "answer_guide": "(a) [marking points — 2 marks] (b) [marking points — 3 marks]",
          "section": "C"
        }}
      ]
    }}
  ],
  "answer_key": [
    {{"question_number": 1, "answer": "B", "marks": 1}}
  ],
  "learning_objectives": [
    "Specific CBC learning objective for {topic} assessed by this quiz",
    "Second learning objective for {topic}"
  ]
}}

Generate ALL {num_mcq} MCQ questions in Section A, ALL {num_short_answer} short answer in Section B, and ALL {num_structured} structured in Section C.
Every question must be original, specific, and directly assess {topic} for {grade} {subject}.
"""


# ── Exam Prompt ───────────────────────────────────────────────────────────────

def build_exam_prompt(
    grade: str,
    subject: str,
    topic: str,
    exam_type: str = "End of Term Examination",
    term: str = "Term 1",
    total_marks: int = 100,
    duration_minutes: int = 120,
    include_marking_scheme: bool = True,
    learning_objectives: str = "",
    curriculum_context: str = "",
) -> str:
    """Build a full ECZ-style, original examination paper prompt."""
    import datetime
    year = str(datetime.datetime.now().year)
    hours = duration_minutes // 60
    mins  = duration_minutes % 60
    duration_str = f"{hours} hour{'s' if hours != 1 else ''}{' ' + str(mins) + ' minutes' if mins else ''}"

    rag_block = ""
    if curriculum_context:
        rag_block = f"""--- CURRICULUM CONTEXT (use to align questions with syllabus coverage) ---
{curriculum_context[:600]}
---

"""
    objectives_block = f"Learning objectives to cover: {learning_objectives}\n" if learning_objectives else ""

    # Calculate section marks
    sec_a = 20
    sec_b = min(40, total_marks - sec_a - 40)
    sec_c = total_marks - sec_a - sec_b

    return f"""{RESPONSIBLE_AI_POLICY}{rag_block}Generate a complete, ORIGINAL {exam_type} paper for:
- Grade: {grade}
- Subject: {subject}
- Topic/Coverage: {topic}
- Term: {term} {year}
- Total Marks: {total_marks}
- Duration: {duration_str}
{objectives_block}
ECZ Paper Structure:
- Section A: Multiple Choice — {sec_a} marks (20 questions × 1 mark each)
- Section B: Short Answer — {sec_b} marks (answer 3 of 5 questions × ~{sec_b // 3} marks each)
- Section C: Structured/Essay — {sec_c} marks (answer 2 of 4 questions × ~{sec_c // 2} marks each)

Requirements:
- ALL questions must be ORIGINAL — not reproduced from any published ECZ examination
- ECZ past papers referenced ONLY for: question style, difficulty level, mark allocation format
- Questions must assess higher-order thinking (analysis, synthesis, evaluation)
- Include authentic Zambian contexts: local geography, culture, industry, agriculture
- Include a complete examiner instructions header exactly as in ECZ papers
- Section C questions must include multi-part sub-questions (a), (b), (c)

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "exam_type": "{exam_type}",
  "duration": "{duration_str}",
  "total_marks": {total_marks},
  "year": "{year}",
  "term": "{term}",
  "instructions_to_candidates": [
    "Answer ALL questions in Section A.",
    "Answer THREE questions from Section B.",
    "Answer TWO questions from Section C.",
    "Write your name and centre number clearly on the answer booklet.",
    "Begin each answer on a new page.",
    "Silent, non-programmable calculators may be used where applicable.",
    "Cell phones and any electronic communication devices are NOT allowed."
  ],
  "sections": [
    {{
      "label": "SECTION A",
      "title": "Multiple Choice Questions",
      "instructions": "Choose the ONE best answer for each question. Circle the letter of your answer. Each question carries 1 mark. ({sec_a} marks)",
      "marks": {sec_a},
      "questions": [
        {{
          "number": 1,
          "type": "mcq",
          "question": "Original ECZ-style MCQ about {topic} with Zambian context",
          "marks": 1,
          "options": [
            {{"letter": "A", "text": "plausible but incorrect"}},
            {{"letter": "B", "text": "correct answer"}},
            {{"letter": "C", "text": "plausible but incorrect"}},
            {{"letter": "D", "text": "plausible but incorrect"}}
          ],
          "section": "A"
        }}
      ]
    }},
    {{
      "label": "SECTION B",
      "title": "Short Answer Questions",
      "instructions": "Answer ANY THREE questions from this section. Each question carries {sec_b // 3 if (sec_b // 3) > 0 else 10} marks. ({sec_b} marks)",
      "marks": {sec_b},
      "questions": [
        {{
          "number": 21,
          "type": "short_answer",
          "question": "Original short answer question on {topic} requiring explanation and application. [{sec_b // 3 if (sec_b // 3) > 0 else 10} marks]",
          "marks": {sec_b // 3 if (sec_b // 3) > 0 else 10},
          "section": "B"
        }}
      ]
    }},
    {{
      "label": "SECTION C",
      "title": "Structured Questions",
      "instructions": "Answer ANY TWO questions from this section. Each question carries {sec_c // 2} marks. ({sec_c} marks)",
      "marks": {sec_c},
      "questions": [
        {{
          "number": 26,
          "type": "structured",
          "question": "(a) Define [key concept from {topic}]. [3 marks]\\n(b) Explain the significance of [concept] in the Zambian context. [7 marks]\\n(c) Analyse and evaluate [higher-order aspect of {topic}], using specific examples from Zambia. [15 marks]",
          "marks": {sec_c // 2},
          "section": "C"
        }}
      ]
    }}
  ],
  "examiner_notes": "This examination is set in accordance with the {grade} {subject} ECZ syllabus and CBC framework for {term} {year}. All questions are original and uniquely authored."
}}

Generate a COMPLETE paper: 20 unique MCQs in Section A, 5 questions in Section B, 4 questions in Section C.
ALL questions must be ORIGINAL and specific to {grade} {subject} — {topic}.
"""


# ── Marking Scheme Prompt ─────────────────────────────────────────────────────

def build_marking_scheme_prompt(
    grade: str,
    subject: str,
    topic: str,
    exam_type: str = "End of Term Examination",
    term: str = "Term 1",
    total_marks: int = 100,
    duration_minutes: int = 120,
    learning_objectives: str = "",
    curriculum_context: str = "",
) -> str:
    """Build a marking scheme generation prompt with full examiner guidance."""
    rag_block = ""
    if curriculum_context:
        rag_block = f"""--- CURRICULUM CONTEXT (use to ensure answers align with syllabus) ---
{curriculum_context[:500]}
---

"""
    objectives_block = f"Learning objectives assessed: {learning_objectives}\n" if learning_objectives else ""

    return f"""{RESPONSIBLE_AI_POLICY}{rag_block}Generate a detailed, examiner-quality marking scheme for:
- Grade: {grade}
- Subject: {subject}
- Topic: {topic}
- Exam type: {exam_type}
- Term: {term}
- Total Marks: {total_marks}
{objectives_block}
Requirements:
- Marking scheme must correspond to an ORIGINAL examination — not a past ECZ paper
- Provide detailed expected responses with mark allocation per sub-point
- Include alternative acceptable responses (award marks for correct knowledge regardless of phrasing)
- Include examiner guidance notes for borderline or ambiguous answers
- Follow ECZ examiner marking conventions exactly
- General notes must include: no penalty for poor spelling if meaning is clear, award mark for first correct response in MCQ

Return ONLY this JSON:
{{
  "grade": "{grade}",
  "subject": "{subject}",
  "topic": "{topic}",
  "exam_type": "{exam_type}",
  "total_marks": {total_marks},
  "sections": [
    {{
      "label": "SECTION A — Multiple Choice",
      "questions": [
        {{
          "number": 1,
          "question": "The question text being marked",
          "marks": 1,
          "expected_response": "B",
          "alternative_responses": [],
          "examiner_notes": "Award 1 mark for B only. Do not accept other letters.",
          "mark_allocation": "1 mark — correct letter"
        }}
      ]
    }},
    {{
      "label": "SECTION B — Short Answer",
      "questions": [
        {{
          "number": 21,
          "question": "The short answer question text",
          "marks": 10,
          "expected_response": "Full model answer with each marking point clearly identified",
          "alternative_responses": [
            "Alternative phrasing that should receive full credit",
            "Another acceptable response demonstrating same understanding"
          ],
          "examiner_notes": "Accept any response that demonstrates accurate knowledge. Do not penalise for different but correct terminology.",
          "mark_allocation": "2 marks × 5 points = 10 marks. Award marks for each identifiable correct point."
        }}
      ]
    }},
    {{
      "label": "SECTION C — Structured Questions",
      "questions": [
        {{
          "number": 26,
          "question": "The full structured question text",
          "marks": {total_marks // 2},
          "expected_response": "(a) [detailed answer — 3 marks] (b) [detailed answer — 7 marks] (c) [detailed analytical answer — 15 marks]",
          "alternative_responses": ["Alternative approach that demonstrates equivalent understanding"],
          "examiner_notes": "Award marks for each sub-part separately. Part (c) requires higher-order thinking — award marks for reasoned arguments supported by evidence.",
          "mark_allocation": "(a) 3 marks, (b) 7 marks, (c) 15 marks = {total_marks // 2} marks total"
        }}
      ]
    }}
  ],
  "general_examiner_notes": [
    "Award marks for any response that demonstrates accurate knowledge, even if phrasing differs from the marking scheme.",
    "Do not penalise candidates for poor spelling or grammar unless it materially changes the meaning.",
    "Where a candidate contradicts themselves, award marks for the correct statement only.",
    "Award full marks only where the answer is complete, accurate, and demonstrates understanding.",
    "Consult the chief examiner before awarding marks outside the marking scheme.",
    "Responses to Section C part (c) must show analysis, not just description, to receive full marks."
  ],
  "marking_rubric": "Use the mark points as a minimum guide. For extended questions, award marks holistically for responses that demonstrate genuine understanding of {topic}, even where specific points differ from the model answer. Examiners should be generous with credit while maintaining standards."
}}

Generate a COMPLETE marking scheme covering ALL sections and ALL questions for the {exam_type}.
"""
