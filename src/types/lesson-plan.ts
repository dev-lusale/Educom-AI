export interface LessonStep {
  stepNumber: 1 | 2 | 3;
  title: string;
  duration: string;
  teacherActivities: string[];
  learnerActivities: string[];
  competencies?: string[];
  teachingAids?: string[];
}

export interface LessonPlanData {
  // School & Teacher Info
  school: string;
  department: string;
  teacherName: string;

  // Class Info
  grade: string;
  subject: string;
  lessonTitle: string;
  topic: string;
  lesson: string;
  duration: string;
  enrollment: string;
  date: string;
  references: string;
  objectives: string;

  // Competencies
  competencies: {
    criticalThinking: string[];
    communication: string[];
    cooperation: string[];
  };

  // Teaching Aids (global)
  teachingAids: string[];

  // 3-Step Table
  steps: LessonStep[];

  // Homework
  homework: {
    description: string;
    eczAlignment: string;
  };
}
