"""
Educom AI Backend — Fallback Template Builder
Generates lesson plans using templates when Ollama is unavailable.
This ensures the API always returns a valid response, even offline.
Mirrors the logic from the frontend's lesson-plan-builder.ts.
"""

from models.lesson_plan import (
    LessonPlanData,
    LessonStep,
    HomeworkData,
    CompetenciesData,
)


def build_fallback_lesson_plan(
    grade: str,
    subject: str,
    topic: str,
    duration: str = "40",
    school: str = "",
    department: str = "",
    teacher_name: str = "",
    enrollment: str = "",
    date: str = "",
) -> LessonPlanData:
    """
    Template-based lesson plan builder.
    Used as fallback when Ollama is unavailable.
    Produces a TCZ-compliant, CBC-aligned lesson plan.
    """
    total_mins = int(duration) if str(duration).isdigit() else 40
    intro_mins = round(total_mins * 0.2)
    dev_mins = round(total_mins * 0.6)
    close_mins = total_mins - intro_mins - dev_mins

    steps = [
        LessonStep(
            stepNumber=1,
            title="Introduction — Connection to Prior Knowledge",
            duration=f"{intro_mins} minutes",
            competencies=["Recall", "Observation", "Questioning"],
            teacherActivities=[
                "Greet learners and settle the class.",
                f'Ask 2–3 review questions linking previous lessons to "{topic}".',
                f'Write the lesson topic on the chalkboard: "{topic}".',
                "State the lesson objectives clearly in learner-friendly language.",
                f"Use a real-life Zambian example to spark curiosity about {topic}.",
            ],
            learnerActivities=[
                "Respond to teacher's review questions individually or in pairs.",
                "Copy the lesson topic and objectives into their exercise books.",
                f"Share what they already know about {topic} (think-pair-share).",
                "Ask clarifying questions about the lesson objectives.",
            ],
        ),
        LessonStep(
            stepNumber=2,
            title="Development — Specific Competencies & Activities",
            duration=f"{dev_mins} minutes",
            competencies=[
                "Critical Thinking",
                "Problem Solving",
                "Communication",
                "Cooperation",
                "Creativity",
            ],
            teacherActivities=[
                f"Introduce key concepts of {topic} using the chalkboard and teaching aids.",
                f"Demonstrate or model the concept with a worked example relevant to {grade} {subject}.",
                f"Divide learners into groups of 4–5 for a cooperative learning activity on {topic}.",
                "Circulate the classroom, asking probing questions and providing guided support.",
                "Select groups to present their findings; facilitate peer feedback.",
                f"Consolidate key points on the chalkboard, correcting misconceptions about {topic}.",
                f"Relate {topic} to real-life Zambian contexts (local environment, community, economy).",
            ],
            learnerActivities=[
                f"Listen attentively and take notes on key concepts of {topic}.",
                f"Work in groups to complete the assigned activity on {topic}.",
                "Discuss findings within the group, ensuring every member contributes.",
                "Present group work to the class and respond to peer questions.",
                "Copy corrected notes and worked examples from the chalkboard.",
                "Ask questions where understanding is unclear.",
            ],
        ),
        LessonStep(
            stepNumber=3,
            title="Conclusion & Evaluation — Check for Understanding + Social Closure",
            duration=f"{close_mins} minutes",
            competencies=["Reflection", "Self-Assessment", "Communication"],
            teacherActivities=[
                f"Pose 3–5 oral or written questions to assess understanding of {topic}.",
                "Call on individual learners to summarise what was learned today.",
                "Provide corrective feedback and reinforce key takeaways.",
                "Assign homework aligned with ECZ examination styles.",
                "Remind learners of the next lesson topic and what to prepare.",
                "Close the lesson with a positive social message (e.g., teamwork, respect).",
            ],
            learnerActivities=[
                "Answer the teacher's evaluation questions individually.",
                "Summarise the lesson in 2–3 sentences in their own words.",
                "Write down the homework assignment in their exercise books.",
                "Participate in the social closure activity.",
            ],
        ),
    ]

    competencies = CompetenciesData(
        criticalThinking=[
            f"Analyse and evaluate information related to {topic}.",
            f"Identify patterns, relationships, and cause-effect in {topic}.",
            f"Apply knowledge of {topic} to solve unfamiliar problems.",
        ],
        communication=[
            f"Clearly explain concepts of {topic} using appropriate {subject} vocabulary.",
            "Present group findings confidently to the class.",
            f"Write structured responses in {subject} exercise books.",
        ],
        cooperation=[
            "Work respectfully in mixed-ability groups during activities.",
            "Share resources (textbooks, materials) equitably among peers.",
            f"Support classmates who need help understanding {topic}.",
        ],
    )

    homework = HomeworkData(
        description=_get_homework(grade, subject, topic),
        eczAlignment=_get_ecz_alignment(subject),
    )

    return LessonPlanData(
        school=school or "—",
        department=department or "—",
        teacherName=teacher_name or "—",
        grade=grade,
        subject=subject,
        topic=topic,
        lesson=topic,
        duration=f"{total_mins} minutes",
        enrollment=enrollment or "—",
        date=date or "—",
        references=f"{subject} Syllabus & Textbook — {grade} · Zambia CBC 2022–2026",
        objectives=(
            f"Having been introduced to {topic}, learners should be able to (PSBAT) "
            f"explain key concepts, apply knowledge to real-life situations, and "
            f"demonstrate understanding through activities."
        ),
        competencies=competencies,
        teachingAids=_get_teaching_aids(subject),
        steps=steps,
        homework=homework,
        ai_generated=False,
        rag_context_used=False,
    )


def _get_teaching_aids(subject: str) -> list[str]:
    """Return subject-specific teaching aids for Zambian schools."""
    common = ["Chalkboard & chalk", "Exercise books", "Textbooks", "Ruler"]

    subject_aids: dict[str, list[str]] = {
        "Mathematics": ["Graph paper", "Geometric set", "Locally made number cards", "Abacus"],
        "English Language": ["Newspaper clippings", "Flashcards", "Story books", "Word wall"],
        "Science": ["Local flora/fauna specimens", "Recycled plastic bottles", "Soil samples", "Magnifying glass"],
        "Social Studies": ["Map of Zambia", "Community photographs", "Local artefacts"],
        "Biology": ["Leaf specimens", "Diagrams", "Local plant samples", "Dissection kit"],
        "Chemistry": ["Test tubes", "Beakers", "Litmus paper", "Safety goggles"],
        "Physics": ["Magnets", "String and weights", "Batteries and bulbs", "Meter rule"],
        "History": ["Timeline chart", "Historical photographs", "Local newspaper clippings", "Maps"],
        "Geography": ["Local map of Zambia", "Compass", "Soil/rock samples", "Cardboard models"],
        "Agriculture": ["Soil samples", "Local seeds", "Garden tools", "Compost materials"],
        "Computer Studies": ["Computer/laptop", "Printed diagrams", "Recycled keyboard", "Projector"],
        "Civic Education": ["Constitution booklet", "Charts on rights/responsibilities", "Newspaper articles"],
        "Religious Education": ["Holy Bible", "Religious charts", "Moral storybooks"],
        "Physical Education": ["Balls", "Cones", "Skipping ropes", "Whistles"],
        "Commerce": ["Business charts", "Receipts/invoices", "Calculator", "Case studies"],
        "Accounting": ["Ledger books", "Calculator", "Receipt books", "Accounting worksheets"],
        "Home Economics": ["Local food items", "Cooking utensils", "Fabric samples"],
        "Music": ["Traditional instruments", "Audio player", "Song books", "Drums"],
        "Art and Design": ["Paint", "Brushes", "Drawing paper", "Clay or recycled materials"],
        "French": ["French dictionary", "Flashcards", "Audio recordings", "Picture charts"],
    }

    extra = subject_aids.get(subject, ["Printed diagrams", "Locally sourced materials", "Flashcards"])
    return [*common, *extra]


def _get_homework(grade: str, subject: str, topic: str) -> str:
    """Return grade-appropriate homework aligned with ECZ standards."""
    # Canonical CBC level map — avoids broken digit-stripping for Form labels
    level_map: dict[str, int] = {
        "ECE Level 1": 0, "ECE Level 2": 0, "ECE Level 3": 0, "ECE Level 4": 0,
        "Grade 1": 1, "Grade 2": 2, "Grade 3": 3, "Grade 4": 4,
        "Grade 5": 5, "Grade 6": 6, "Grade 7": 7,
        "Form 1": 8,  "Form 2": 9,
        "Form 3": 10, "Form 4": 11,
        "Form 5": 12, "Form 6": 13,
        # Legacy labels — backward compat
        "Grade 8": 8, "Grade 9": 9,
        "Grade 10": 10, "Grade 11": 11, "Grade 12": 12,
    }
    level = level_map.get(grade, 7)

    # ECE / Lower Primary (ECE Levels + Grades 1–4)
    if level <= 4:
        return (
            f'Draw and label a picture related to "{topic}". '
            "Write 3 sentences describing what you drew. "
            "Share with a family member and explain what you learned today."
        )
    # Upper Primary (Grades 5–7)
    if level <= 7:
        return (
            f'Answer the following questions in your exercise book:\n'
            f'1. Define the key terms from today\'s lesson on "{topic}".\n'
            f'2. Give TWO examples of "{topic}" from your daily life in Zambia.\n'
            f'3. Write a short paragraph (5–7 sentences) explaining what you learned about "{topic}" today.'
        )
    # Junior Secondary (Form 1–2)
    if level <= 9:
        return (
            f"Complete the following in your {subject} exercise book:\n"
            f'1. State and explain THREE key concepts from "{topic}".\n'
            f'2. Solve the practice questions on "{topic}" from your textbook.\n'
            f'3. Research ONE real-life application of "{topic}" in Zambia and write a half-page report.'
        )
    # Senior Secondary & Sixth Form (Form 3–6)
    return (
        f"In your {subject} exercise book:\n"
        f'1. Answer the structured question: "With reference to "{topic}", discuss key concepts and significance." (8 marks)\n'
        f'2. Attempt ONE past ECZ examination question related to "{topic}" (attach working/reasoning).\n'
        f'3. Prepare a 3-minute oral presentation on "{topic}" for the next lesson.'
    )


def _get_ecz_alignment(subject: str) -> str:
    """Return ECZ examination alignment description for a subject."""
    alignments: dict[str, str] = {
        "Mathematics": "Structured questions requiring working shown; multiple-choice on concepts; problem-solving in context (ECZ Grade 9 & 12 format).",
        "Science": "Short-answer and structured questions; diagram labelling; practical-based questions (ECZ Grade 7 & 9 format).",
        "Biology": "Essay and structured questions; diagram labelling; data interpretation (ECZ Grade 12 Biology).",
        "Chemistry": "Calculation questions; equation balancing; structured responses (ECZ Grade 12 Chemistry).",
        "Physics": "Numerical problems with working; definition questions; diagram-based questions (ECZ Grade 12 Physics).",
        "English Language": "Comprehension passages; composition writing; grammar exercises (ECZ Grade 9 & 12 English).",
        "History": "Source-based questions; essay questions with argument and evidence (ECZ Grade 12 History).",
        "Geography": "Map work; data analysis; structured essay questions (ECZ Grade 12 Geography).",
        "Agriculture": "Practical-based questions; short-answer; farm management scenarios (ECZ Grade 12 Agriculture).",
        "Computer Studies": "Theory questions; practical application scenarios; diagram-based questions (ECZ Grade 12 Computer Studies).",
    }
    return alignments.get(
        subject,
        "Structured short-answer questions; definition and explanation tasks; application to real-life Zambian contexts (ECZ examination format).",
    )
