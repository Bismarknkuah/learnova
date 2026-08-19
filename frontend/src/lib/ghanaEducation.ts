// Ghana education taxonomy — drives level- and programme-aware dashboards.

export const LEVELS = ['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate', 'PhD'] as const;
export type Level = typeof LEVELS[number];

// SHS programmes (elective tracks) in Ghana.
export const SHS_PROGRAMMES = [
  'General Science', 'General Arts', 'Business', 'Home Economics',
  'Visual Arts', 'Agricultural Science', 'Technical', 'Vocational',
] as const;

// Core + typical subjects per level / SHS programme.
export const SUBJECTS: Record<string, string[]> = {
  KG: ['Numeracy', 'Literacy', 'Our World Our People', 'Creative Arts'],
  Primary: ['English', 'Mathematics', 'Science', 'Our World Our People', 'Ghanaian Language', 'Creative Arts', 'Computing'],
  JHS: ['English', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'French', 'ICT', 'Career Technology', 'Religious & Moral Education'],
  // SHS core (everyone) + electives by programme
  'SHS:core': ['Core Mathematics', 'English Language', 'Integrated Science', 'Social Studies'],
  'SHS:General Science': ['Physics', 'Chemistry', 'Biology', 'Elective Mathematics'],
  'SHS:General Arts': ['Literature', 'Government', 'Economics', 'History', 'Geography', 'French', 'CRS'],
  'SHS:Business': ['Financial Accounting', 'Cost Accounting', 'Business Management', 'Economics', 'Elective Mathematics'],
  'SHS:Home Economics': ['Food & Nutrition', 'Management in Living', 'Clothing & Textiles', 'Biology', 'Chemistry'],
  'SHS:Visual Arts': ['General Knowledge in Art', 'Graphic Design', 'Picture Making', 'Ceramics', 'Sculpture', 'Textiles'],
  'SHS:Agricultural Science': ['General Agriculture', 'Animal Husbandry', 'Crop Husbandry', 'Chemistry', 'Physics'],
  'SHS:Technical': ['Technical Drawing', 'Applied Electricity', 'Electronics', 'Building Construction', 'Woodwork'],
  'SHS:Vocational': ['Catering', 'Cosmetology', 'Dressmaking', 'Management in Living'],
};

export function subjectsFor(level?: string, programme?: string): string[] {
  if (!level) return [];
  if (level === 'SHS') return [...(SUBJECTS['SHS:core'] ?? []), ...(SUBJECTS[`SHS:${programme}`] ?? [])];
  if (['Undergraduate', 'Postgraduate', 'PhD'].includes(level)) return programme ? [programme] : [];
  return SUBJECTS[level] ?? [];
}

// Each level gets its own tone so the dashboard genuinely *feels* different.
export const LEVEL_THEME: Record<string, { label: string; tag: string; gradient: string }> = {
  KG: { label: 'Kindergarten', tag: 'Play & learn', gradient: 'from-pink-500 to-rose-500' },
  Primary: { label: 'Primary School', tag: 'Building the basics', gradient: 'from-sky-500 to-blue-600' },
  JHS: { label: 'Junior High', tag: 'BECE journey', gradient: 'from-emerald-500 to-teal-600' },
  SHS: { label: 'Senior High', tag: 'WASSCE & beyond', gradient: 'from-brand to-brand-dark' },
  Undergraduate: { label: 'Undergraduate', tag: 'Your degree path', gradient: 'from-violet-600 to-indigo-600' },
  Postgraduate: { label: 'Postgraduate', tag: 'Advanced study', gradient: 'from-amber-500 to-orange-600' },
  PhD: { label: 'Doctoral', tag: 'Research & scholarship', gradient: 'from-slate-700 to-slate-900' },
};

// What each level should be nudged toward on their dashboard.
export function levelActions(level?: string): { href: string; label: string }[] {
  switch (level) {
    case 'KG':
    case 'Primary':
      return [{ href: '/learn', label: 'Fun lessons' }, { href: '/classroom', label: 'Join class' }, { href: '/library', label: 'Story books' }];
    case 'JHS':
      return [{ href: '/exam-prep', label: 'BECE prep' }, { href: '/learn', label: 'Subjects' }, { href: '/classroom', label: 'Live classes' }, { href: '/tutors', label: 'Find a tutor' }];
    case 'SHS':
      return [{ href: '/exam-prep', label: 'WASSCE prep' }, { href: '/classroom', label: 'Live classes' }, { href: '/labs', label: 'Virtual labs' }, { href: '/tutors', label: 'Find a tutor' }];
    case 'Undergraduate':
    case 'Postgraduate':
      return [{ href: '/research-assistant', label: 'Research AI' }, { href: '/classroom', label: 'Lectures' }, { href: '/career', label: 'Career mentor' }, { href: '/portfolio', label: 'Portfolio' }];
    case 'PhD':
      return [{ href: '/research-assistant', label: 'Research AI' }, { href: '/research', label: 'Research hub' }, { href: '/scholarships', label: 'Funding' }, { href: '/portfolio', label: 'Publications' }];
    default:
      return [{ href: '/learn', label: 'Start learning' }, { href: '/classroom', label: 'Join class' }];
  }
}
