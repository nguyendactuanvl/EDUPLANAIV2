import { SemesterData } from './knttCurriculum';
import { BIOLOGY_KNTT } from './curriculum/biologyCurriculum';
import { PHYSICS_KNTT } from './curriculum/physicsCurriculum';
import { CHEMISTRY_KNTT } from './curriculum/chemistryCurriculum';
import { LITERATURE_KNTT } from './curriculum/literatureCurriculum';
import { HISTORY_KNTT, GEOGRAPHY_KNTT, LAW_ECON_KNTT } from './curriculum/socialCurriculum';
import { EXPERIENTIAL_KNTT, DEFENSE_KNTT, ENGLISH_KNTT } from './curriculum/appliedCurriculum';

export type SubjectCurriculumMap = Record<string, Record<number, Record<'semester_1' | 'semester_2', SemesterData>>>;

export const KNTT_SUBJECT_CURRICULUM: SubjectCurriculumMap = {
  "sinh_hoc": BIOLOGY_KNTT,
  "vat_li": PHYSICS_KNTT,
  "hoa_hoc": CHEMISTRY_KNTT,
  "ngu_van": LITERATURE_KNTT,
  "lich_su": HISTORY_KNTT,
  "dia_li": GEOGRAPHY_KNTT,
  "gdcd_gdktpl": LAW_ECON_KNTT,
  "hdtn_hn": EXPERIENTIAL_KNTT,
  "gdqp_an": DEFENSE_KNTT,
  "tieng_anh": ENGLISH_KNTT
};
