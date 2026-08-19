/**
 * Rich demo seed — populates every dashboard so the app looks alive on first run.
 * Idempotent: safe to run repeatedly. Run: npm run seed
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { connectMongo, disconnectMongo } from './core/db.js';
import { logger } from './core/logger.js';
import { TenantModel } from './modules/tenants/tenant.model.js';
import { UserModel } from './modules/users/user.model.js';
import { TutorModel } from './modules/tutors/tutor.model.js';
import { ProductModel } from './modules/marketplace/product.model.js';
import { ResourceModel } from './modules/library/resource.model.js';
import { ScholarshipModel } from './modules/scholarships/scholarship.model.js';
import { ExamModel } from './modules/exams/exam.model.js';
import { GroupModel } from './modules/community/community.model.js';
import { GamificationModel } from './modules/gamification/gamification.model.js';
import { LabModel } from './modules/labs/lab.model.js';
import { DepartmentModel, CourseModel, TimetableModel, FeeStructureModel, FeeInvoiceModel, ResultModel, gradeFor } from './modules/tenants/school.models.js';
import { MasteryModel } from './modules/adaptive/mastery.model.js';
import { FeedPostModel } from './modules/feed/feed.model.js';
import { KnowledgeModel, tokenize } from './modules/knowledge/knowledge.model.js';
import { TrainingTaskModel } from './modules/knowledge/training.model.js';
import { SessionModel } from './modules/classrooms/session.model.js';

export async function seedDatabase() {
  const tenant = await TenantModel.findOneAndUpdate(
    { slug: 'marketplace' },
    { name: 'Learnova Marketplace', slug: 'marketplace', type: 'marketplace' },
    { upsert: true, new: true },
  );
  await TenantModel.updateOne({ _id: tenant._id }, { $set: { tagline: 'Learn boldly. Rise together.', primaryColor: '#0E7C5A', about: 'A flagship Learnova campus serving West Africa.' } });
  const tenantId = tenant._id;
  const hash = await bcrypt.hash('password123', 10);

  const user = async (email: string, name: string, role: string, extra: Record<string, unknown> = {}) =>
    UserModel.findOneAndUpdate(
      { tenantId, email },
      { tenantId, email, name, role, passwordHash: hash, status: 'active', ...extra },
      { upsert: true, new: true },
    );

  // ---- Users (one of every role) ----
  const mensah = await user('mensah@learnova.dev', 'Prof. Mensah', 'teacher');
  const ofori = await user('ofori@learnova.dev', 'Madam Ofori', 'teacher');
  const ama = await user('ama@learnova.dev', 'Ama Owusu', 'student', { educationLevel: 'WASSCE', subjects: ['Physics', 'Mathematics', 'Chemistry'] });
  const kwame = await user('kwame@learnova.dev', 'Kwame Asante', 'student', { educationLevel: 'SHS', subjects: ['English', 'Literature', 'Government'] });
  const parent = await user('parent@learnova.dev', 'Mr. Boateng', 'parent');
  const admin = await user('admin@learnova.dev', 'Super Admin', 'super_admin');
  const schoolAdmin = await user('school@learnova.dev', 'School Admin', 'school_admin');
  // Link Ama to the parent for the Parent Portal.
  await UserModel.updateOne({ _id: ama._id }, { guardianId: parent._id });

  // ---- Tutor profiles ----
  const tutor = async (userId: unknown, data: Record<string, unknown>) =>
    TutorModel.findOneAndUpdate({ userId }, { tenantId, userId, isPublished: true, ...data }, { upsert: true, new: true });
  await tutor(mensah._id, {
    headline: 'WASSCE Physics & Maths, made simple', bio: 'Award-winning teacher, 12 years experience.',
    subjects: ['Physics', 'Mathematics'], levels: ['WASSCE', 'SHS'], languages: ['English', 'Twi'],
    hourlyRateGHS: 100, rating: 4.8, reviewsCount: 64, completedSessions: 320, ghanaCardVerified: true, aiTwinEnabled: true,
    gender: 'male', teachingStyle: 'exam-focused', country: 'Ghana', availability: ['weekday-evenings', 'weekends'],
  });
  await tutor(ofori._id, {
    headline: 'English & Literature for WASSCE', bio: 'Helping students master comprehension and essays.',
    subjects: ['English', 'Literature'], levels: ['WASSCE', 'JHS'], languages: ['English'],
    hourlyRateGHS: 80, rating: 4.6, reviewsCount: 41, completedSessions: 210, ghanaCardVerified: true, aiTwinEnabled: true,
    gender: 'female', teachingStyle: 'conversational', country: 'Ghana', availability: ['weekends'],
  });

  // ---- Marketplace products ----
  const product = (sellerId: unknown, d: Record<string, unknown>) =>
    ProductModel.findOneAndUpdate({ tenantId, title: d.title }, { tenantId, sellerId, isPublished: true, ...d }, { upsert: true });
  await product(mensah._id, { type: 'past_questions', title: 'WASSCE Physics Past Questions (2015–2024)', subject: 'Physics', priceGHS: 50, salesCount: 132, rating: 4.9 });
  await product(mensah._id, { type: 'course', title: 'Mastering Mechanics — Video Course', subject: 'Physics', priceGHS: 250, salesCount: 58, rating: 4.7 });
  await product(ofori._id, { type: 'ebook', title: 'WASSCE Essay Writing Handbook', subject: 'English', priceGHS: 40, salesCount: 90, rating: 4.8 });
  await product(ofori._id, { type: 'notes', title: 'Summarised Literature Notes', subject: 'Literature', priceGHS: 30, salesCount: 76, rating: 4.5 });
  await product(mensah._id, { type: 'guide', title: 'University Application Survival Guide', subject: 'General', priceGHS: 20, salesCount: 45, rating: 4.6 });
  await product(ofori._id, { type: 'template', title: 'Study Planner Template (Notion + PDF)', subject: 'Productivity', priceGHS: 0, salesCount: 210, rating: 4.9 });

  // ---- Digital library ----
  const res = (d: Record<string, unknown>) => ResourceModel.findOneAndUpdate({ tenantId, title: d.title }, { tenantId, addedBy: admin._id, ...d }, { upsert: true });
  await res({ type: 'ebook', title: 'Senior High Physics Textbook', subject: 'Physics', author: 'GES', tags: ['physics', 'shs'] });
  await res({ type: 'notes', title: 'Organic Chemistry Crash Notes', subject: 'Chemistry', author: 'Madam Ofori' });
  await res({ type: 'journal', title: 'West African Journal of Education', subject: 'General', author: 'WAEC' });
  await res({ type: 'ebook', title: 'Core Mathematics for SHS', subject: 'Mathematics', author: 'GES' });

  // ---- Scholarships ----
  const sch = (d: Record<string, unknown>) => ScholarshipModel.findOneAndUpdate({ tenantId, title: d.title }, { tenantId, postedBy: admin._id, ...d }, { upsert: true });
  await sch({ kind: 'scholarship', title: 'GNPF Brilliant but Needy Scholarship', sponsor: 'Ghana National Petroleum', amountGHS: 5000, level: 'Undergraduate', fundingType: 'partial', studyLocation: 'Ghana', deadline: new Date(Date.now() + 30 * 864e5), applyUrl: 'https://example.com/apply' });
  await sch({ kind: 'fellowship', title: 'MasterCard Foundation Scholars', sponsor: 'MasterCard Foundation', amountGHS: 20000, level: 'Undergraduate', fundingType: 'full', studyLocation: 'Abroad', deadline: new Date(Date.now() + 60 * 864e5), applyUrl: 'https://example.com/apply' });
  await sch({ kind: 'internship', title: 'MTN Ghana Tech Internship', sponsor: 'MTN Ghana', deadline: new Date(Date.now() + 20 * 864e5), applyUrl: 'https://example.com/apply' });
  await sch({ kind: 'grant', title: 'GETFund Research Grant', sponsor: 'GETFund', amountGHS: 15000, eligibility: 'Postgraduate researchers', level: 'Postgraduate', fundingType: 'partial', studyLocation: 'Ghana', deadline: new Date(Date.now() + 45 * 864e5), applyUrl: 'https://example.com/apply' });
  await sch({ kind: 'scholarship', title: 'School Full Scholarship (KG–Primary)', sponsor: 'Learnova Demo School', level: 'Primary', fundingType: 'full', studyLocation: 'Ghana', sponsorType: 'school', eligibility: 'Pupils with financial need — covers fees, books & uniform.' });
  await sch({ kind: 'scholarship', title: 'SHS Merit Full Scholarship', sponsor: 'Learnova Demo School', level: 'SHS', fundingType: 'full', studyLocation: 'Ghana', sponsorType: 'school', eligibility: 'Top BECE performers entering SHS.' });
  await sch({ kind: 'scholarship', title: 'Scholarship Secretariat Award', sponsor: 'Scholarship Secretariat', level: 'Undergraduate', fundingType: 'partial', studyLocation: 'Ghana', applyUrl: 'https://scholarshipsecretariat.gov.gh', eligibility: 'Brilliant but needy Ghanaian students in local universities.' });

  // ---- Exam (WASSCE Physics) ----
  await ExamModel.findOneAndUpdate(
    { tenantId, title: 'WASSCE Physics — Mechanics Mock' },
    {
      tenantId, track: 'WASSCE', subject: 'Physics', title: 'WASSCE Physics — Mechanics Mock',
      durationMin: 30, proctored: true, createdBy: mensah._id,
      questions: [
        { prompt: 'Newton’s first law is also called the law of…', options: ['Inertia', 'Acceleration', 'Gravity', 'Momentum'], answerIndex: 0, topic: 'newtons-laws', marks: 1 },
        { prompt: 'The SI unit of force is the…', options: ['Joule', 'Newton', 'Watt', 'Pascal'], answerIndex: 1, topic: 'forces', marks: 1 },
        { prompt: 'If F = ma, doubling mass at constant force will…', options: ['Double acceleration', 'Halve acceleration', 'No change', 'Triple it'], answerIndex: 1, topic: 'newtons-laws', marks: 1 },
      ],
    },
    { upsert: true },
  );

  // ---- Community groups ----
  const grp = (d: Record<string, unknown>) => GroupModel.findOneAndUpdate({ tenantId, name: d.name }, { tenantId, createdBy: ama._id, memberIds: [ama._id, kwame._id], ...d }, { upsert: true });
  await grp({ name: 'WASSCE 2026 Study Group', kind: 'study_group', description: 'Daily revision and past questions.' });
  await grp({ name: 'Physics Lovers', kind: 'club', description: 'Discuss physics problems and experiments.' });
  await grp({ name: 'Renewable Energy Research', kind: 'research', description: 'Solar & battery research for West Africa.' });
  await grp({ name: 'General Discussion', kind: 'forum', description: 'Ask anything, help anyone.' });

  // ---- Virtual lab ----
  await LabModel.findOneAndUpdate({ tenantId, title: 'Logic Circuit Lab' }, { tenantId, kind: 'logic_circuit', title: 'Logic Circuit Lab', subject: 'Computer Science', brief: 'Build and test digital logic gates.', createdBy: mensah._id }, { upsert: true });



  // ---- School Owner Portal demo data ----
  await DepartmentModel.findOneAndUpdate({ tenantId, name: 'Science' }, { tenantId, name: 'Science', head: 'Mr. Mensah' }, { upsert: true });
  await CourseModel.findOneAndUpdate({ tenantId, code: 'PHY101' }, { tenantId, code: 'PHY101', title: 'Physics', credits: 3, department: 'Science' }, { upsert: true });
  await CourseModel.findOneAndUpdate({ tenantId, code: 'MAT101' }, { tenantId, code: 'MAT101', title: 'Core Mathematics', credits: 3, department: 'Science' }, { upsert: true });
  await TimetableModel.findOneAndUpdate({ tenantId, courseTitle: 'Physics', day: 'Monday' }, { tenantId, courseTitle: 'Physics', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'Lab 1', teacher: 'Mr. Mensah' }, { upsert: true });
  await FeeStructureModel.findOneAndUpdate({ tenantId, name: 'Term 1 Tuition' }, { tenantId, name: 'Term 1 Tuition', amountGHS: 1500, term: 'Term 1' }, { upsert: true });
  await FeeInvoiceModel.findOneAndUpdate({ tenantId, studentId: ama._id, name: 'Term 1 Tuition' }, { tenantId, studentId: ama._id, name: 'Term 1 Tuition', amountGHS: 1500, status: 'unpaid' }, { upsert: true });
  for (const r of [{ courseTitle: 'Physics', score: 72 }, { courseTitle: 'Core Mathematics', score: 81 }]) {
    await ResultModel.findOneAndUpdate({ tenantId, studentId: ama._id, courseTitle: r.courseTitle }, { tenantId, studentId: ama._id, courseTitle: r.courseTitle, score: r.score, grade: gradeFor(r.score), term: 'Term 1' }, { upsert: true });
  }

  // ---- Adaptive mastery for Ama (drives the Learning Path page) ----
  const mastery = (concept: string, subject: string, pKnown: number, attempts: number) =>
    MasteryModel.findOneAndUpdate({ tenantId, studentId: ama._id, concept }, { tenantId, studentId: ama._id, concept, subject, pKnown, attempts }, { upsert: true });
  await mastery('Newton’s Laws', 'Physics', 0.35, 8);
  await mastery('Quadratic Equations', 'Mathematics', 0.62, 12);
  await mastery('Stoichiometry', 'Chemistry', 0.78, 9);
  await mastery('Vectors', 'Physics', 0.9, 15);


  // ---- Campus feed (social network) demo posts ----
  if (await FeedPostModel.countDocuments({ tenantId }) === 0) {
    await FeedPostModel.create([
      { tenantId, authorId: ama._id, kind: 'achievement', body: 'Just hit a 5-day study streak on Learnova! 🔥 Physics is finally clicking.' },
      { tenantId, authorId: kwame._id, kind: 'question', body: 'Anyone have good notes on organic chemistry nomenclature? Struggling a bit.' },
      { tenantId, authorId: mensah._id, kind: 'research', body: 'Sharing a great paper on solar mini-grids for rural Ghana — worth a read for the energy research team.', link: 'https://example.com/solar-minigrids' },
    ]);
  }
  // ---- Inbuilt assistant: starter knowledge (grows as teachers teach it) ----
  if (await KnowledgeModel.countDocuments({ tenantId }) === 0) {
    const kb = [
      { q: "What is Newton's second law?", a: "Newton's second law states that force equals mass times acceleration (F = ma). The bigger the force, the bigger the acceleration; the bigger the mass, the smaller the acceleration for the same force.", subject: 'Physics' },
      { q: 'How do I solve a quadratic equation?', a: 'For ax² + bx + c = 0, use the quadratic formula x = (-b ± √(b²-4ac)) / 2a. First identify a, b and c, compute the discriminant b²-4ac, then substitute.', subject: 'Maths' },
      { q: 'What is photosynthesis?', a: 'Photosynthesis is how green plants make food. Using sunlight, water and carbon dioxide, chlorophyll in the leaves produces glucose and releases oxygen: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.', subject: 'Biology' },
      { q: 'What is the difference between a metal and a non-metal?', a: 'Metals are usually shiny, good conductors of heat and electricity, malleable and ductile (e.g. iron, copper). Non-metals are usually dull, poor conductors and brittle (e.g. sulphur, carbon).', subject: 'Chemistry' },
      { q: 'How do I write a good essay introduction?', a: 'A strong introduction hooks the reader, gives brief background, and states your thesis (main argument) clearly in one sentence so the reader knows your position.', subject: 'English' },
      { q: 'What caused the trans-Atlantic slave trade?', a: 'It was driven mainly by European demand for cheap labour on plantations in the Americas, the profitability of the triangular trade, and the exchange of enslaved people for goods and firearms.', subject: 'History' },
    ];
    await KnowledgeModel.insertMany(kb.map((e) => ({ tenantId, question: e.q, answer: e.a, subject: e.subject, source: 'system', keywords: tokenize(e.q + ' ' + e.subject) })));
  }
  // More starter knowledge so the assistant answers common questions out of the box.
  if (await KnowledgeModel.countDocuments({ tenantId, source: 'system' }) < 10) {
    const more = [
      { q: 'What is the water cycle?', a: 'The water cycle is how water moves around Earth: it evaporates from seas and rivers, condenses into clouds, falls as rain (precipitation), and flows back through rivers — repeating endlessly.', subject: 'Science' },
      { q: 'What is a noun?', a: 'A noun is a naming word — it names a person, place, animal or thing (e.g. Kofi, Accra, goat, table).', subject: 'English' },
      { q: 'How do I add fractions?', a: 'To add fractions, make the denominators (bottom numbers) the same, then add the numerators (top numbers). Example: 1/4 + 1/4 = 2/4 = 1/2.', subject: 'Maths' },
      { q: 'What is democracy?', a: 'Democracy is a system of government where the people choose their leaders by voting in free and fair elections, and power belongs to the citizens.', subject: 'Social Studies' },
      { q: 'What are the parts of a plant?', a: 'The main parts of a plant are the roots (absorb water), stem (supports and carries water), leaves (make food), flowers (reproduction) and fruit/seeds.', subject: 'Science' },
      { q: 'What is the capital of Ghana?', a: 'The capital of Ghana is Accra, located on the Atlantic coast in the Greater Accra Region.', subject: 'Social Studies' },
      { q: 'What is gravity?', a: 'Gravity is the force that pulls objects toward each other. On Earth it pulls everything toward the ground, which is why things fall when you drop them.', subject: 'Physics' },
      { q: 'How do I find the area of a rectangle?', a: 'Area of a rectangle = length × width. Multiply the two side lengths. Example: a 5m by 3m room has an area of 15 square metres.', subject: 'Maths' },
    ];
    await KnowledgeModel.insertMany(more.map((e) => ({ tenantId, question: e.q, answer: e.a, subject: e.subject, source: 'system', keywords: tokenize(e.q + ' ' + e.subject) })));
  }
  // Open training tasks for tutors to answer (₵0.20 each) — these grow the AI.
  if (await TrainingTaskModel.countDocuments({ tenantId }) === 0) {
    const tasks = [
      { question: 'Explain the law of conservation of energy with an example.', subject: 'Physics', level: 'SHS' },
      { question: 'How do you balance a chemical equation? Give a worked example.', subject: 'Chemistry', level: 'SHS' },
      { question: 'What is the difference between mitosis and meiosis?', subject: 'Biology', level: 'SHS' },
      { question: 'Explain supply and demand with a simple example.', subject: 'Economics', level: 'SHS' },
      { question: 'How do you solve simultaneous equations?', subject: 'Maths', level: 'SHS' },
      { question: 'What were the main causes of Ghana\'s independence?', subject: 'History', level: 'SHS' },
      { question: 'Explain the structure of a good paragraph.', subject: 'English', level: 'JHS' },
      { question: 'What is the difference between speed and velocity?', subject: 'Physics', level: 'SHS' },
      { question: 'How does the digestive system work?', subject: 'Biology', level: 'JHS' },
      { question: 'Explain compound interest with a calculation.', subject: 'Maths', level: 'SHS' },
    ];
    await TrainingTaskModel.insertMany(tasks.map((t) => ({ tenantId, ...t })));
  }


  // ---- A demo class so the classroom list is populated ----
  if (await SessionModel.countDocuments({ tenantId }) === 0) {
    await SessionModel.create([
      { tenantId, title: 'Physics: Newton\'s Laws (Live Revision)', hostId: mensah._id, status: 'scheduled' },
      { tenantId, title: 'Maths Clinic: Quadratics', hostId: ofori._id, status: 'scheduled' },
    ]);
  }


  // ---- Gamification (so the leaderboard ranks students) ----
  const gami = (userId: unknown, xp: number) =>
    GamificationModel.findOneAndUpdate({ userId }, { tenantId, userId, xp, coins: Math.floor(xp / 10), level: Math.floor(xp / 500) + 1, streak: { count: 5, lastActive: new Date() }, badges: [{ code: 'first_class', label: 'First Class Attended', earnedAt: new Date() }, { code: 'quiz_ace', label: 'Quiz Ace', earnedAt: new Date() }, { code: 'streak_5', label: '5-Day Streak', earnedAt: new Date() }] }, { upsert: true });
  await gami(ama._id, 1250);
  await gami(kwame._id, 870);

  logger.info('✅ Rich seed complete. Logins (password123): ama@ kwame@ mensah@ ofori@ parent@ school@ admin@(super) learnova.dev');
}

// CLI entry (npm run seed): connect, seed, disconnect. Guarded so importing this file does NOT auto-run.
async function runCli() { await connectMongo(); await seedDatabase(); await disconnectMongo(); }
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli().catch((e) => { logger.error(e); process.exit(1); });
}
