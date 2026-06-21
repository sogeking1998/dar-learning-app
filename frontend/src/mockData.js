export const MOCK_USER = {
  id: 1,
  name: 'Juan dela Cruz',
  email: 'juan.delacruz@dar.gov.ph',
  division: 'PBD',
  position: 'Agrarian Reform Program Officer II',
  joined: '2024-01-15'
}

export const MOCK_COURSES = [
  {
    id: 1, code: 'PBD-01', session: 1,
    title: 'Enterprise-Based Community Organizing (e-CO) Skills',
    shortTitle: 'e-CO Skills', division: 'PBD',
    description: 'Learn enterprise-based community organizing skills for agrarian reform beneficiaries.',
    progress: 100, status: 'completed', duration: '45 minutes',
    preTest: { questions: 15, completed: true, score: 12 },
    postTest: { questions: 20, completed: true, score: 18 },
    assignments: 3, hasVideo: true, hasDownloads: true
  },
  {
    id: 2, code: 'PBD-02', session: 2,
    title: 'Participatory Research and Planning',
    shortTitle: 'Research & Planning', division: 'PBD',
    description: 'Master participatory research methodologies for agrarian communities.',
    progress: 100, status: 'completed', duration: '60 minutes',
    preTest: { questions: 15, completed: true, score: 13 },
    postTest: { questions: 20, completed: true, score: 19 },
    assignments: 3, hasVideo: true, hasDownloads: true
  },
  {
    id: 3, code: 'PBD-03', session: 3,
    title: 'Strategic Development Planning',
    shortTitle: 'Strategic Planning', division: 'PBD',
    description: 'Develop strategic plans for agrarian reform program implementation.',
    progress: 60, status: 'in_progress', duration: '90 minutes',
    preTest: { questions: 15, completed: true, score: 11 },
    postTest: { questions: 20, completed: false },
    assignments: 3, hasVideo: true, hasDownloads: true
  },
  {
    id: 4, code: 'PBD-04', session: 4,
    title: 'Enterprise Development and Management',
    shortTitle: 'Enterprise Management', division: 'PBD',
    description: 'Learn enterprise development and management for agrarian reform.',
    progress: 0, status: 'not_started', duration: '75 minutes',
    preTest: { questions: 15, completed: false },
    postTest: { questions: 20, completed: false },
    assignments: 3, hasVideo: true, hasDownloads: true
  },
  {
    id: 5, code: 'LTS-01', session: 1,
    title: 'EP/CLOA Processing',
    shortTitle: 'EP/CLOA Processing', division: 'LTS',
    description: 'Learn the processing of Emancipation Patent and Certificate of Land Ownership Award.',
    progress: 0, status: 'not_started', duration: '60 minutes',
    preTest: { questions: 15, completed: false },
    postTest: { questions: 20, completed: false },
    assignments: 2, hasVideo: true, hasDownloads: true
  },
  {
    id: 6, code: 'LTS-02', session: 2,
    title: 'Land Acquisition and Distribution',
    shortTitle: 'Land Acquisition', division: 'LTS',
    description: 'Understand the process of land acquisition and distribution under CARP.',
    progress: 0, status: 'not_started', duration: '90 minutes',
    preTest: { questions: 15, completed: false },
    postTest: { questions: 20, completed: false },
    assignments: 2, hasVideo: true, hasDownloads: true
  },
  {
    id: 7, code: 'AJD-01', session: 1,
    title: 'Mediation',
    shortTitle: 'Mediation', division: 'AJD',
    description: 'Learn mediation techniques for agrarian dispute resolution.',
    progress: 0, status: 'not_started', duration: '120 minutes',
    preTest: { questions: 15, completed: false },
    postTest: { questions: 20, completed: false },
    assignments: 4, hasVideo: true, hasDownloads: true
  },
  {
    id: 8, code: 'AJD-02', session: 2,
    title: 'Adjudication Process',
    shortTitle: 'Adjudication', division: 'AJD',
    description: 'Understand the adjudication process for agrarian disputes.',
    progress: 0, status: 'not_started', duration: '90 minutes',
    preTest: { questions: 15, completed: false },
    postTest: { questions: 20, completed: false },
    assignments: 3, hasVideo: true, hasDownloads: true
  },
  {
    id: 9, code: 'Admin-01', session: 1,
    title: 'Administrative Procedures and Protocols',
    shortTitle: 'Admin Procedures', division: 'Admin',
    description: 'Learn DAR administrative procedures, documentation, and protocols.',
    progress: 0, status: 'not_started', duration: '45 minutes',
    preTest: { questions: 10, completed: false },
    postTest: { questions: 15, completed: false },
    assignments: 2, hasVideo: true, hasDownloads: true
  }
]

export const MOCK_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'New Training Module: Land Rights Education',
    content: 'A new training module on Land Rights Education has been added to the LTS section. All employees are encouraged to complete this module by end of the month.',
    date: '2026-06-15', author: 'Training Office'
  },
  {
    id: 2,
    title: 'Completion Deadline Reminder — June 30',
    content: 'Please be reminded that the deadline for completing PBD Sessions 1-4 is on June 30, 2026. Ensure all tasks and assessments are submitted on time.',
    date: '2026-06-10', author: 'HR Department'
  },
  {
    id: 3,
    title: 'System Maintenance: June 20, 12AM–4AM',
    content: 'The Online CapDev system will undergo scheduled maintenance. Please save your progress before this period.',
    date: '2026-06-08', author: 'IT Support'
  },
  {
    id: 4,
    title: 'Webinar: Sustainable Agrarian Reform Practices',
    content: 'Join us for an online webinar on June 25, 2026 at 9:00 AM. Registration link will be sent via email.',
    date: '2026-06-05', author: 'Training Office'
  }
]

export const MOCK_EMPLOYEES = [
  { id: 1, name: 'Juan dela Cruz',    email: 'juan.delacruz@dar.gov.ph', division: 'PBD',   position: 'ARPO II',            completed: 4, total: 4, progress: 100 },
  { id: 2, name: 'Maria Santos',      email: 'maria.santos@dar.gov.ph',  division: 'PBD',   position: 'ARPO I',             completed: 2, total: 4, progress: 62  },
  { id: 3, name: 'Pedro Reyes',       email: 'pedro.reyes@dar.gov.ph',   division: 'LTS',   position: 'Land Officer',       completed: 1, total: 2, progress: 55  },
  { id: 4, name: 'Ana Mendoza',       email: 'ana.mendoza@dar.gov.ph',   division: 'AJD',   position: 'Legal Officer',      completed: 0, total: 2, progress: 20  },
  { id: 5, name: 'Carlos Villanueva', email: 'carlos.v@dar.gov.ph',      division: 'LTS',   position: 'Land Officer',       completed: 2, total: 2, progress: 100 },
  { id: 6, name: 'Liza Aquino',       email: 'liza.aquino@dar.gov.ph',   division: 'Admin', position: 'Admin Assistant',    completed: 0, total: 1, progress: 0   },
  { id: 7, name: 'Mark Bautista',     email: 'mark.bautista@dar.gov.ph', division: 'AJD',   position: 'Legal Officer',      completed: 1, total: 2, progress: 70  },
  { id: 8, name: 'Grace Lim',         email: 'grace.lim@dar.gov.ph',     division: 'PBD',   position: 'ARPO I',             completed: 3, total: 4, progress: 85  },
]
