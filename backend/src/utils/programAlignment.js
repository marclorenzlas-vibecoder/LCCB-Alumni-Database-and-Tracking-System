const ALIGNMENT_STATUS = {
  ALIGNED: 'ALIGNED',
  NOT_ALIGNED: 'NOT_ALIGNED',
  NEEDS_REVIEW: 'NEEDS_REVIEW'
};

const PROGRAM_KEYWORDS = [
  {
    courseTerms: ['sbit', 'bsit', 'information technology', 'computer', 'technology', 'stem'],
    jobTerms: [
      'software', 'developer', 'programmer', 'web', 'frontend', 'backend', 'full stack',
      'data', 'analyst', 'it', 'network', 'systems', 'database', 'cloud', 'qa',
      'quality assurance', 'cybersecurity', 'technical support', 'technician'
    ],
    label: 'technology'
  },
  {
    courseTerms: ['business', 'administration', 'mba', 'abm', 'accountancy', 'finance', 'human resource'],
    jobTerms: [
      'business', 'manager', 'management', 'administrator', 'administrative',
      'operations', 'finance', 'accounting', 'accountant', 'marketing', 'sales',
      'human resource', 'hr', 'analyst', 'consultant', 'supervisor', 'coordinator',
      'entrepreneur', 'clerk'
    ],
    label: 'business'
  },
  {
    courseTerms: ['hospitality', 'tourism', 'shtm', 'hotel', 'restaurant'],
    jobTerms: [
      'hotel', 'hospitality', 'tourism', 'restaurant', 'resort', 'event', 'events',
      'travel', 'guest', 'front office', 'food', 'beverage', 'chef', 'kitchen'
    ],
    label: 'hospitality'
  },
  {
    courseTerms: ['architecture', 'sarfaid', 'fine arts', 'design', 'interior'],
    jobTerms: [
      'architect', 'architecture', 'designer', 'design', 'interior', 'drafting',
      'draftsman', 'artist', 'creative', 'multimedia', 'illustrator', 'visual'
    ],
    label: 'architecture/design'
  },
  {
    courseTerms: ['education', 'educational', 'teacher', 'elementary', 'junior high', 'high school', 'humss'],
    jobTerms: [
      'teacher', 'educator', 'instructor', 'professor', 'trainer', 'school',
      'academic', 'curriculum', 'guidance', 'counselor', 'student'
    ],
    label: 'education'
  }
];

const normalizeText = (value) => String(value || '').toLowerCase();

const normalizeProgramAlignment = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return Object.values(ALIGNMENT_STATUS).includes(normalized) ? normalized : null;
};

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const inferProgramAlignment = ({ course, jobTitle, company, description }) => {
  const courseText = normalizeText(course);
  const jobText = normalizeText([jobTitle, company, description].filter(Boolean).join(' '));

  if (!courseText || !jobText) {
    return {
      status: ALIGNMENT_STATUS.NEEDS_REVIEW,
      notes: 'Course or employment details are incomplete.'
    };
  }

  const program = PROGRAM_KEYWORDS.find((entry) => includesAny(courseText, entry.courseTerms));

  if (!program) {
    return {
      status: ALIGNMENT_STATUS.NEEDS_REVIEW,
      notes: 'The graduated program is not in the automatic alignment rules.'
    };
  }

  if (includesAny(jobText, program.jobTerms)) {
    return {
      status: ALIGNMENT_STATUS.ALIGNED,
      notes: `Employment keywords match the ${program.label} program.`
    };
  }

  return {
    status: ALIGNMENT_STATUS.NOT_ALIGNED,
    notes: `No matching ${program.label} employment keywords were found.`
  };
};

module.exports = {
  ALIGNMENT_STATUS,
  inferProgramAlignment,
  normalizeProgramAlignment
};
