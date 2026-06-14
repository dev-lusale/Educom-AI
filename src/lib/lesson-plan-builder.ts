import type { LessonPlanData, LessonStep } from "@/types/lesson-plan";

interface BuildInput {
  school: string;
  department: string;
  teacherName: string;
  grade: string;
  subject: string;
  lessonTitle: string;
  topic: string;
  duration: string;
  enrollment: string;
  date: string;
}

/**
 * Builds a TCZ-compliant, CBC-aligned lesson plan.
 * Structured around the 2022–2026 Strategic Plan with the 3-step model.
 */
export function buildLessonPlan(input: BuildInput): LessonPlanData {
  const { school, department, teacherName, grade, subject, lessonTitle, topic, duration, enrollment, date } = input;
  const totalMins = parseInt(duration) || 40;

  // Distribute time: 20% intro, 60% development, 20% conclusion
  const introMins = Math.round(totalMins * 0.2);
  const devMins = Math.round(totalMins * 0.6);
  const closeMins = totalMins - introMins - devMins;

  const steps: LessonStep[] = [
    {
      stepNumber: 1,
      title: "Introduction — Connection to Prior Knowledge",
      duration: `${introMins} minutes`,
      competencies: ["Recall", "Observation", "Questioning"],
      teacherActivities: [
        `Greet learners and settle the class.`,
        `Ask 2–3 review questions linking previous lessons to "${topic}".`,
        `Write the lesson topic on the chalkboard: "${topic}".`,
        `State the lesson objectives clearly in learner-friendly language.`,
        `Use a real-life example or local context to spark curiosity about ${topic}.`,
      ],
      learnerActivities: [
        `Respond to teacher's review questions individually or in pairs.`,
        `Copy the lesson topic and objectives into their exercise books.`,
        `Share what they already know about ${topic} (think-pair-share).`,
        `Ask clarifying questions about the lesson objectives.`,
      ],
    },
    {
      stepNumber: 2,
      title: "Development — Specific Competencies & Activities",
      duration: `${devMins} minutes`,
      competencies: [
        "Critical Thinking",
        "Problem Solving",
        "Communication",
        "Cooperation",
        "Creativity",
      ],
      teacherActivities: [
        `Introduce key concepts of ${topic} using the chalkboard and teaching aids.`,
        `Demonstrate or model the concept with a worked example relevant to ${grade} ${subject}.`,
        `Divide learners into groups of 4–5 for a cooperative learning activity on ${topic}.`,
        `Circulate the classroom, asking probing questions and providing guided support.`,
        `Select groups to present their findings; facilitate peer feedback.`,
        `Consolidate key points on the chalkboard, correcting misconceptions.`,
        `Relate ${topic} to real-life Zambian contexts (local environment, community, economy).`,
      ],
      learnerActivities: [
        `Listen attentively and take notes on key concepts of ${topic}.`,
        `Work in groups to complete the assigned activity or problem on ${topic}.`,
        `Discuss findings within the group, ensuring every member contributes.`,
        `Present group work to the class and respond to peer questions.`,
        `Copy corrected notes and worked examples from the chalkboard.`,
        `Ask questions where understanding is unclear.`,
      ],
    },
    {
      stepNumber: 3,
      title: "Conclusion & Evaluation — Check for Understanding + Social Closure",
      duration: `${closeMins} minutes`,
      competencies: ["Reflection", "Self-Assessment", "Communication"],
      teacherActivities: [
        `Pose 3–5 oral or written questions to assess understanding of ${topic}.`,
        `Call on individual learners to summarise what was learned today.`,
        `Provide corrective feedback and reinforce key takeaways.`,
        `Assign homework aligned with ECZ examination styles.`,
        `Remind learners of the next lesson topic and what to prepare.`,
        `Close the lesson with a positive social message (e.g., teamwork, respect).`,
      ],
      learnerActivities: [
        `Answer the teacher's evaluation questions individually.`,
        `Summarise the lesson in 2–3 sentences in their own words.`,
        `Write down the homework assignment in their exercise books.`,
        `Participate in the social closure activity (e.g., clap, affirmation).`,
      ],
    },
  ];

  return {
    school: school || "—",
    department: department || "—",
    teacherName: teacherName || "—",
    grade,
    subject,
    lessonTitle: lessonTitle || topic,
    topic,
    lesson: lessonTitle || topic,
    duration: `${totalMins} minutes`,
    enrollment: enrollment || "—",
    date: formatDate(date),
    references: `${subject} Syllabus & Textbook — ${grade} · Zambia CBC 2022–2026`,
    objectives: `Having been introduced to ${topic}, learners should be able to (PSBAT) explain key concepts, apply knowledge to real-life situations, and demonstrate understanding through activities.`,

    competencies: {
      criticalThinking: [
        `Analyse and evaluate information related to ${topic}.`,
        `Identify patterns, relationships, and cause-effect in ${topic}.`,
        `Apply knowledge of ${topic} to solve unfamiliar problems.`,
      ],
      communication: [
        `Clearly explain concepts of ${topic} using appropriate ${subject} vocabulary.`,
        `Present group findings confidently to the class.`,
        `Write structured responses in ${subject} exercise books.`,
      ],
      cooperation: [
        `Work respectfully in mixed-ability groups during activities.`,
        `Share resources (textbooks, materials) equitably among peers.`,
        `Support classmates who need help understanding ${topic}.`,
      ],
    },

    teachingAids: getTeachingAids(subject),

    steps,

    homework: {
      description: getHomework(grade, subject, topic),
      eczAlignment: getEczAlignment(subject),
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-ZM", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getTeachingAids(subject: string): string[] {
  const common = ["Chalkboard & chalk", "Exercise books", "Textbooks", "Ruler"];

  const subjectAids: Record<string, string[]> = {
    Mathematics: [
      "Graph paper",
      "Geometric set",
      "Locally made number cards",
      "Abacus (recycled materials)"
    ],

    "English Language": [
      "Newspaper/magazine clippings",
      "Flashcards",
      "Story books",
      "Word wall"
    ],

    Science: [
      "Local flora/fauna specimens",
      "Recycled plastic bottles",
      "Soil samples",
      "Magnifying glass"
    ],

    "Social Studies": [
      "Map of Zambia",
      "Community photographs",
      "Local artefacts"
    ],

    "Additional Mathematics": [
      "Scientific calculator",
      "Graph paper",
      "Mathematical tables",
      "Geometry instruments"
    ],

    "Literature in English": [
      "Set books",
      "Poetry guides",
      "Drama scripts",
      "Character charts"
    ],

    "Civic Education": [
      "Constitution booklet",
      "Charts on rights/responsibilities",
      "Newspaper articles",
      "Community case studies"
    ],

    "Religious Education": [
      "Holy Bible",
      "Religious charts",
      "Moral storybooks",
      "Audio sermons"
    ],

    "Physical Education": [
      "Balls",
      "Cones",
      "Skipping ropes",
      "Whistles"
    ],

    "Chemistry 5070": [
      "Test tubes",
      "Beakers",
      "Litmus paper",
      "Safety goggles"
    ],

    "Physics 5054": [
      "Magnets",
      "String and weights",
      "Batteries and bulbs",
      "Meter rule"
    ],

    "Creative and Technology Studies": [
      "Recycled materials",
      "Drawing paper",
      "Craft tools",
      "Cardboard models"
    ],

    "Home Economics": [
      "Local food items",
      "Cooking utensils",
      "Fabric samples",
      "Recycled containers"
    ],

    Agriculture: [
      "Soil samples",
      "Local seeds",
      "Garden tools",
      "Compost materials"
    ],

    Commerce: [
      "Business charts",
      "Receipts/invoices",
      "Calculator",
      "Case studies"
    ],

    Accounting: [
      "Ledger books",
      "Calculator",
      "Receipt books",
      "Accounting worksheets"
    ],

    "Design and Technology": [
      "Wood samples",
      "Measuring tape",
      "Hand tools",
      "Drawing instruments"
    ],

    "Home Management": [
      "Cleaning materials",
      "Laundry items",
      "Kitchen utensils",
      "Storage containers"
    ],

    "Business Studies": [
      "Business magazines",
      "Entrepreneurship case studies",
      "Calculator",
      "Charts"
    ],

    History: [
      "Timeline chart",
      "Historical photographs",
      "Local newspaper clippings",
      "Maps"
    ],

    Geography: [
      "Local map of Zambia",
      "Compass",
      "Soil/rock samples",
      "Recycled cardboard for models"
    ],

    Biology: [
      "Leaf specimens",
      "Diagrams",
      "Local plant samples",
      "Dissection kit"
    ],


    "Fashion and Fabrics": [
      "Fabric samples",
      "Needles and thread",
      "Measuring tape",
      "Sewing machine"
    ],

    "Food and Nutrition": [
      "Cooking ingredients",
      "Kitchen utensils",
      "Food charts",
      "Measuring cups"
    ],

    "Technical Drawing": [
      "Drawing board",
      "T-square",
      "Compass",
      "Pencils and ruler"
    ],

    Music: [
      "Traditional instruments",
      "Audio player",
      "Song books",
      "Drums"
    ],

    "Chinese": [
      "Chinese textbooks",
      "Audio recordings",
      "Flashcards",
      "Calligraphy tools"
    ],

    "Art and Design": [
      "Paint",
      "Brushes",
      "Drawing paper",
      "Clay or recycled materials"
    ],

    "Drama and Performing Arts": [
      "Costumes",
      "Scripts",
      "Props",
      "Audio speaker"
    ],

    "Computer Studies": [
      "Computer/laptop",
      "Printed diagrams",
      "Recycled keyboard for practice",
      "Projector"
    ],

    French: [
      "French dictionary",
      "Flashcards",
      "Audio recordings",
      "Picture charts"
    ],

    Bemba: [
      "Local storybooks",
      "Charts",
      "Audio recordings",
      "Flashcards"
    ],

    Nyanja: [
      "Local language books",
      "Word cards",
      "Audio clips",
      "Charts"
    ],

    Tonga: [
      "Tonga readers",
      "Flashcards",
      "Community stories",
      "Charts"
    ],

    Lozi: [
      "Lozi language books",
      "Audio resources",
      "Charts",
      "Story cards"
    ],

    Lunda: [
      "Language charts",
      "Local readers",
      "Flashcards",
      "Audio recordings"
    ],

    Kaonde: [
      "Kaonde readers",
      "Charts",
      "Flashcards",
      "Storybooks"
    ],

    Luvale: [
      "Luvale books",
      "Language posters",
      "Audio materials",
      "Flashcards"
    ],

    Silozi: [
      "Silozi readers",
      "Charts",
      "Audio stories",
      "Language flashcards"
    ]
  };

  const extra = subjectAids[subject] ?? ["Printed diagrams", "Locally sourced materials", "Flashcards"];
  return [...common, ...extra];
}

function getHomework(grade: string, subject: string, topic: string): string {
  // Map the Zambian CBC grade/form labels to a numeric level for branching
  const levelMap: Record<string, number> = {
    "ECE Level 1": 0, "ECE Level 2": 0, "ECE Level 3": 0, "ECE Level 4": 0,
    "Grade 1": 1, "Grade 2": 2, "Grade 3": 3, "Grade 4": 4,
    "Grade 5": 5, "Grade 6": 6, "Grade 7": 7,
    "Form 1": 8, "Form 2": 9,
    "Form 3": 10, "Form 4": 11,
    "Form 5": 12, "Form 6": 13,
  };
  const level = levelMap[grade] ?? 7;

  // ECE / Lower Primary (ECE + Grades 1–4)
  if (level <= 4) {
    return `Draw and label a picture related to "${topic}". Write 3 sentences describing what you drew. Share with a family member and explain what you learned today.`;
  }

  // Upper Primary (Grades 5–7)
  if (level <= 7) {
    return `Answer the following questions in your exercise book:\n1. Define the key terms from today's lesson on "${topic}".\n2. Give TWO examples of "${topic}" from your daily life in Zambia.\n3. Write a short paragraph (5–7 sentences) explaining what you learned about "${topic}" today.`;
  }

  // Junior Secondary (Form 1–2)
  if (level <= 9) {
    return `Complete the following in your ${subject} exercise book:\n1. State and explain THREE key concepts from "${topic}".\n2. Solve the practice questions on "${topic}" from your textbook (pages as directed by teacher).\n3. Research ONE real-life application of "${topic}" in Zambia and write a half-page report.`;
  }

  // Senior Secondary & Sixth Form (Form 3–6)
  return `In your ${subject} exercise book:\n1. Answer the structured question: "With reference to "${topic}", discuss [key concept] and its significance." (8 marks)\n2. Attempt ONE past ECZ examination question related to "${topic}" (attach working/reasoning).\n3. Prepare a 3-minute oral presentation on "${topic}" for the next lesson.`;
}

function getEczAlignment(subject: string): string {
  const alignments: Record<string, string> = {
    Mathematics: "Structured questions requiring working shown; multiple-choice on concepts; problem-solving in context (ECZ Grade 9 & 12 format).",
    Science: "Short-answer and structured questions; diagram labelling; practical-based questions (ECZ Grade 7 & 9 format).",
    Biology: "Essay and structured questions; diagram labelling; data interpretation (ECZ Grade 12 Biology).",
    Chemistry: "Calculation questions; equation balancing; structured responses (ECZ Grade 12 Chemistry).",
    Physics: "Numerical problems with working; definition questions; diagram-based questions (ECZ Grade 12 Physics).",
    "English Language": "Comprehension passages; composition writing; grammar exercises (ECZ Grade 9 & 12 English).",
    History: "Source-based questions; essay questions with argument and evidence (ECZ Grade 12 History).",
    Geography: "Map work; data analysis; structured essay questions (ECZ Grade 12 Geography).",
    Agriculture: "Practical-based questions; short-answer; farm management scenarios (ECZ Grade 12 Agriculture).",
    "Computer Studies": "Theory questions; practical application scenarios; diagram-based questions (ECZ Grade 12 Computer Studies).",
  };

  return (
    alignments[subject] ??
    "Structured short-answer questions; definition and explanation tasks; application to real-life Zambian contexts (ECZ examination format)."
  );
}
