"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const GRADES = [
  // Early Childhood Education
  "ECE Level 1",
  "ECE Level 2",
  "ECE Level 3",
  "ECE Level 4",
  // Lower Primary
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  // Upper Primary
  "Grade 5",
  "Grade 6",
  "Grade 7",
  // Junior Secondary
  "Form 1",
  "Form 2",
  // Senior Secondary
  "Form 3",
  "Form 4",
  // Sixth Form / High School
  "Form 5",
  "Form 6",
];

// Labels for optgroups in the select
const GRADE_GROUPS = [
  { label: "Early Childhood Education", grades: ["ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4"] },
  { label: "Lower Primary (Grades 1–4)",  grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4"] },
  { label: "Upper Primary (Grades 5–7)",  grades: ["Grade 5", "Grade 6", "Grade 7"] },
  { label: "Junior Secondary",            grades: ["Form 1", "Form 2"] },
  { label: "Senior Secondary",            grades: ["Form 3", "Form 4"] },
  { label: "Sixth Form",                  grades: ["Form 5", "Form 6"] },
];

const SUBJECTS = [
  "Mathematics", "English Language", "Science", "Social Studies",
  "Additional Mathematics", "Literature in English", "Civic Education",
  "Religious Education", "Physical Education", "Chemistry", "Physics",
  "Creative and Technology Studies", "Home Economics", "Agriculture",
  "Commerce", "Accounting", "Design and Technology", "Home Management",
  "Business Studies", "History", "Geography", "Biology", "Fashion and Fabrics",
  "Chinese", "Food and Nutrition", "Technical Drawing", "Music", "Art and Design",
  "Drama and Performing Arts", "Computer Studies", "French",
  "Bemba", "Nyanja", "Tonga", "Lozi", "Lunda", "Kaonde", "Luvale", "Silozi",
];

const SUBJECT_TO_DEPT: Record<string, string> = {
  "English Language": "Department of English Language",
  "Literature in English": "Department of English Language",
  "French": "Department of French",
  "Chinese": "Department of Chinese",
  "Bemba": "Department of Zambian Languages",
  "Nyanja": "Department of Zambian Languages",
  "Tonga": "Department of Zambian Languages",
  "Lozi": "Department of Zambian Languages",
  "Lunda": "Department of Zambian Languages",
  "Kaonde": "Department of Zambian Languages",
  "Luvale": "Department of Zambian Languages",
  "Silozi": "Department of Zambian Languages",
  "Mathematics": "Department of Mathematics",
  "Additional Mathematics": "Department of Additional Mathematics",
  "Biology": "Department of Biology",
  "Chemistry": "Department of Chemistry",
  "Physics": "Department of Physics",
  "Science": "Department of Combined Sciences",
  "History": "Department of History",
  "Geography": "Department of Geography",
  "Social Studies": "Department of Social Sciences",
  "Civic Education": "Department of Civic Education",
  "Religious Education": "Department of Religious Education",
  "Commerce": "Department of Commerce",
  "Business Studies": "Department of Business Studies",
  "Accounting": "Department of Accounting",
  "Computer Studies": "Department of Computer Studies",
  "Design and Technology": "Department of Design and Technology",
  "Technical Drawing": "Department of Technical Drawing",
  "Creative and Technology Studies": "Department of Creative and Technology Studies",
  "Home Economics": "Department of Home Economics",
  "Home Management": "Department of Home Management",
  "Food and Nutrition": "Department of Food and Nutrition",
  "Fashion and Fabrics": "Department of Fashion and Fabrics",
  "Art and Design": "Department of Art and Design",
  "Music": "Department of Music",
  "Drama and Performing Arts": "Department of Drama and Performing Arts",
  "Physical Education": "Department of Physical Education",
  "Agriculture": "Department of Agriculture",
};

export interface FormValues {
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

interface Props {
  onGenerate: (values: FormValues) => void;
  loading: boolean;
  defaultTeacherName?: string;
  defaultSchool?: string;
}

export default function LessonPlanForm({
  onGenerate,
  loading,
  defaultTeacherName = "",
  defaultSchool = "",
}: Props) {
  const [school, setSchool] = useState(defaultSchool);
  const [department, setDepartment] = useState("");
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("40");
  const [enrollment, setEnrollment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSubjectChange(val: string) {
    setSubject(val);
    if (!department && SUBJECT_TO_DEPT[val]) {
      setDepartment(SUBJECT_TO_DEPT[val]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grade || !subject || !lessonTitle || !topic) return;
    onGenerate({ school, department, teacherName, grade, subject, lessonTitle, topic, duration, enrollment, date });
  }

  // Dribbble-style input
  const inp = "drib-input";
  const lbl = "block text-xs font-medium text-[--text-secondary] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="drib-card p-6 space-y-6">

      {/* ── School Info ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-[#ea4c89] shrink-0" />
          <p className="text-[--text-primary] text-sm font-semibold">School Information</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl}>School Name</label>
            <input
              type="text" value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. Namalawe Secondary School"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={cn(inp, "cursor-pointer")}
            >
              <option value="">Select department</option>
              <optgroup label="Languages">
                <option value="Department of Languages">Department of Languages</option>
                <option value="Department of English Language">Department of English Language</option>
                <option value="Department of Zambian Languages">Department of Zambian Languages</option>
                <option value="Department of French">Department of French</option>
                <option value="Department of Chinese">Department of Chinese</option>
              </optgroup>
              <optgroup label="Sciences">
                <option value="Department of Sciences">Department of Sciences</option>
                <option value="Department of Biology">Department of Biology</option>
                <option value="Department of Chemistry">Department of Chemistry</option>
                <option value="Department of Physics">Department of Physics</option>
                <option value="Department of Combined Sciences">Department of Combined Sciences</option>
              </optgroup>
              <optgroup label="Mathematics">
                <option value="Department of Mathematics">Department of Mathematics</option>
                <option value="Department of Additional Mathematics">Department of Additional Mathematics</option>
              </optgroup>
              <optgroup label="Social Sciences & Humanities">
                <option value="Department of Social Sciences">Department of Social Sciences</option>
                <option value="Department of Humanities">Department of Humanities</option>
                <option value="Department of History">Department of History</option>
                <option value="Department of Geography">Department of Geography</option>
                <option value="Department of Civic Education">Department of Civic Education</option>
                <option value="Department of Religious Education">Department of Religious Education</option>
              </optgroup>
              <optgroup label="Commerce & Business">
                <option value="Department of Commerce">Department of Commerce</option>
                <option value="Department of Business Studies">Department of Business Studies</option>
                <option value="Department of Accounting">Department of Accounting</option>
                <option value="Department of Economics">Department of Economics</option>
              </optgroup>
              <optgroup label="Technical & Practical">
                <option value="Department of Technical Studies">Department of Technical Studies</option>
                <option value="Department of Design and Technology">Department of Design and Technology</option>
                <option value="Department of Technical Drawing">Department of Technical Drawing</option>
                <option value="Department of Computer Studies">Department of Computer Studies</option>
                <option value="Department of Creative and Technology Studies">Department of Creative and Technology Studies</option>
              </optgroup>
              <optgroup label="Home Economics">
                <option value="Department of Home Economics">Department of Home Economics</option>
                <option value="Department of Home Management">Department of Home Management</option>
                <option value="Department of Food and Nutrition">Department of Food and Nutrition</option>
                <option value="Department of Fashion and Fabrics">Department of Fashion and Fabrics</option>
              </optgroup>
              <optgroup label="Arts, Music & PE">
                <option value="Department of Arts">Department of Arts</option>
                <option value="Department of Art and Design">Department of Art and Design</option>
                <option value="Department of Music">Department of Music</option>
                <option value="Department of Drama and Performing Arts">Department of Drama and Performing Arts</option>
                <option value="Department of Physical Education">Department of Physical Education</option>
              </optgroup>
              <optgroup label="Agriculture">
                <option value="Department of Agriculture">Department of Agriculture</option>
              </optgroup>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Teacher Name</label>
            <input
              type="text" value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="e.g. Ms Shambeta"
              className={inp}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[--border]" />

      {/* ── Lesson Details ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-[#007531] shrink-0" />
          <p className="text-[--text-primary] text-sm font-semibold">Lesson Details</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>
              Grade <span className="text-[#ea4c89]">*</span>
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              className={cn(inp, "cursor-pointer")}
            >
              <option value="" disabled>Select grade / form</option>
              {GRADE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>
              Subject <span className="text-[#ea4c89]">*</span>
            </label>
            <select
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className={cn(inp, "cursor-pointer")}
            >
              <option value="" disabled>Select subject</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>
              Lesson Title <span className="text-[#ea4c89]">*</span>
            </label>
            <input
              type="text" value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
              placeholder="e.g. Introduction to Photosynthesis"
              className={inp}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>
              Topic <span className="text-[#ea4c89]">*</span>
            </label>
            <input
              type="text" value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="e.g. Photosynthesis"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Duration (minutes)</label>
            <input
              type="number" value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={20} max={120}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Number of Learners</label>
            <input
              type="number" value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
              placeholder="e.g. 45" min={1}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Date</label>
            <input
              type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inp}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !grade || !subject || !lessonTitle || !topic}
        className={cn(
          "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
          loading || !grade || !subject || !lessonTitle || !topic
            ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
            : "bg-[#ea4c89] text-white hover:bg-[#d6437a] active:scale-[0.99]"
        )}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating lesson plan…
          </>
        ) : (
          "Generate Lesson Plan"
        )}
      </button>
    </form>
  );
}
