import { BankQuestion, MatrixCriteria, DifficultyLevel } from '../types';

export async function fetchQuestionsByCriteria(criteria: MatrixCriteria): Promise<BankQuestion[]> {
  try {
    const local = JSON.parse(localStorage.getItem('EDUPLAN_QUESTIONS_BANK') || '[]');
    const filtered = local.filter((q: BankQuestion) => 
      q.grade === criteria.grade && 
      (!criteria.topic_code || q.topic_code === criteria.topic_code)
    );
    return filtered;
  } catch (e) {
    return [];
  }
}

export function sortAndShuffleByDifficulty(questions: BankQuestion[]): BankQuestion[] {
  const diffOrder: Record<DifficultyLevel, number> = { NB: 1, TH: 2, VD: 3, VDC: 4 };

  // Group by difficulty
  const grouped: Record<DifficultyLevel, BankQuestion[]> = { NB: [], TH: [], VD: [], VDC: [] };
  questions.forEach(q => {
    if (grouped[q.difficulty]) {
      grouped[q.difficulty].push(q);
    } else {
      grouped.NB.push(q);
    }
  });

  // Shuffle function
  const shuffle = (arr: BankQuestion[]) => arr.slice().sort(() => Math.random() - 0.5);

  const sorted: BankQuestion[] = [
    ...shuffle(grouped.NB),
    ...shuffle(grouped.TH),
    ...shuffle(grouped.VD),
    ...shuffle(grouped.VDC)
  ];

  return sorted;
}

export async function generateExamFromMatrix(matrix: MatrixCriteria[]): Promise<BankQuestion[]> {
  let examQuestions: BankQuestion[] = [];

  for (const criteria of matrix) {
    const questions = await fetchQuestionsByCriteria(criteria);
    const nb = questions.filter(q => q.difficulty === 'NB');
    const th = questions.filter(q => q.difficulty === 'TH');
    const vd = questions.filter(q => q.difficulty === 'VD');
    const vdc = questions.filter(q => q.difficulty === 'VDC');

    const nb_count = criteria.nb_count || 0;
    const th_count = criteria.th_count || 0;
    const vd_count = criteria.vd_count || 0;
    const vdc_count = criteria.vdc_count || 0;

    examQuestions.push(
      ...nb.slice(0, nb_count),
      ...th.slice(0, th_count),
      ...vd.slice(0, vd_count),
      ...vdc.slice(0, vdc_count)
    );
  }

  return sortAndShuffleByDifficulty(examQuestions);
}

export async function fetchQuestionsForWorksheet(grade: 10 | 11 | 12, topicCode?: string): Promise<BankQuestion[]> {
  try {
    const local = JSON.parse(localStorage.getItem('EDUPLAN_QUESTIONS_BANK') || '[]');
    return local.filter((q: BankQuestion) => 
      q.grade === grade && 
      (!topicCode || q.topic_code === topicCode)
    );
  } catch (e) {
    return [];
  }
}