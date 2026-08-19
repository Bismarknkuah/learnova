import { NotFoundError, ConflictError } from '../../core/errors.js';
import { TenantModel } from './tenant.model.js';
import { UserModel } from '../users/user.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { DepartmentModel, CourseModel, TimetableModel, FeeStructureModel, FeeInvoiceModel, ResultModel, gradeFor } from './school.models.js';
import { NotificationModel } from '../notifications/notification.model.js';
import bcrypt from 'bcryptjs';
import { MasteryModel } from '../adaptive/mastery.model.js';
import { SessionModel } from '../classrooms/session.model.js';
import { LedgerModel } from '../payments/ledger.model.js';
import { TutorModel } from '../tutors/tutor.model.js';

/** School Owner Portal: provision a campus tenant and view its roster + basic stats. */
export const schoolService = {
  async createTenant(data: { name: string; slug: string; plan?: string }) {
    const exists = await TenantModel.findOne({ slug: data.slug });
    if (exists) throw new ConflictError('Slug already taken');
    return TenantModel.create({ name: data.name, slug: data.slug, type: 'school', plan: data.plan ?? 'free' });
  },

  async addCampus(tenantId: string, campus: { name: string; region?: string; address?: string }) {
    const t = await TenantModel.findByIdAndUpdate(tenantId, { $push: { campuses: campus } }, { new: true });
    if (!t) throw new NotFoundError('Tenant not found');
    return t;
  },

  roster(tenantId: string, role?: string) {
    const filter: Record<string, unknown> = { tenantId, deletedAt: null };
    if (role) filter.role = role;
    return UserModel.find(filter).select('name email role status createdAt');
  },

  async stats(tenantId: string) {
    const [students, teachers, bookings] = await Promise.all([
      UserModel.countDocuments({ tenantId, role: 'student', deletedAt: null }),
      UserModel.countDocuments({ tenantId, role: 'teacher', deletedAt: null }),
      BookingModel.countDocuments({ tenantId, deletedAt: null }),
    ]);
    const [campuses, courses, results] = await Promise.all([
      TenantModel.findById(tenantId).select('campuses'),
      CourseModel.countDocuments({ tenantId }),
      ResultModel.countDocuments({ tenantId }),
    ]);
    return { students, teachers, bookings, campuses: campuses?.get('campuses')?.length ?? 0, courses, results };
  },

  // ---- Academic Management ----
  addDepartment(tenantId: string, b: { name: string; campus?: string; head?: string }) { return DepartmentModel.create({ tenantId, ...b }); },
  listDepartments(tenantId: string) { return DepartmentModel.find({ tenantId }).sort('-createdAt'); },
  addCourse(tenantId: string, b: { code: string; title: string; department?: string; credits?: number }) { return CourseModel.create({ tenantId, ...b }); },
  listCourses(tenantId: string) { return CourseModel.find({ tenantId }).sort('-createdAt'); },

  // ---- Administration ----
  addTimetable(tenantId: string, b: Record<string, unknown>) { return TimetableModel.create({ tenantId, ...b }); },
  listTimetable(tenantId: string) { return TimetableModel.find({ tenantId }).sort('day'); },
  addFeeStructure(tenantId: string, b: { name: string; amountGHS: number; term?: string }) { return FeeStructureModel.create({ tenantId, ...b }); },
  listFeeStructures(tenantId: string) { return FeeStructureModel.find({ tenantId }).sort('-createdAt'); },
  invoiceStudent(tenantId: string, b: { studentId: string; name?: string; amountGHS: number; dueDate?: string }) { return FeeInvoiceModel.create({ tenantId, ...b }); },
  listInvoices(tenantId: string) { return FeeInvoiceModel.find({ tenantId }).populate('studentId', 'name').sort('-createdAt'); },
  async recordResult(tenantId: string, b: { studentId: string; courseTitle: string; score: number; term?: string }) {
    return ResultModel.create({ tenantId, ...b, grade: gradeFor(b.score) });
  },
  listResults(tenantId: string) { return ResultModel.find({ tenantId }).populate('studentId', 'name').sort('-createdAt'); },


  // ---- #7 AI Learning Difficulty Predictor ----
  /** Risk = weak mastery + low results + low attendance, per student. Returns ranked at-risk list. */
  async riskReport(tenantId: string) {
    const students = await UserModel.find({ tenantId, role: 'student', deletedAt: null }).select('name');
    const out: { studentId: string; name: string; risk: number; reasons: string[]; interventions: string[] }[] = [];
    for (const s of students) {
      const [mastery, results, attendance] = await Promise.all([
        MasteryModel.find({ tenantId, studentId: s._id }).select('pKnown'),
        ResultModel.find({ tenantId, studentId: s._id }).select('score'),
        SessionModel.countDocuments({ tenantId, 'attendees.userId': s._id }),
      ]);
      const avgMastery = mastery.length ? mastery.reduce((a, m) => a + (m.pKnown ?? 0), 0) / mastery.length : 0.5;
      const avgScore = results.length ? results.reduce((a, r) => a + (r.score ?? 0), 0) / results.length : 60;
      const reasons: string[] = [];
      let risk = 0;
      if (avgMastery < 0.5) { risk += 40; reasons.push(`Low concept mastery (${Math.round(avgMastery * 100)}%)`); }
      if (avgScore < 50) { risk += 35; reasons.push(`Failing average score (${Math.round(avgScore)}%)`); }
      if (attendance < 2) { risk += 25; reasons.push('Low class attendance'); }
      if (risk === 0) continue;
      const interventions: string[] = [];
      if (avgMastery < 0.5) interventions.push('Assign weakest-topic practice & a peer-tutor study group');
      if (avgScore < 50) interventions.push('Book a one-on-one tutor session before the next assessment');
      if (attendance < 2) interventions.push('Parent check-in on attendance & a revised study schedule');
      out.push({ studentId: String(s._id), name: s.get('name'), risk: Math.min(100, risk), reasons, interventions });
    }
    return out.sort((a, b) => b.risk - a.risk);
  },

  /** Notify a flagged student, their guardian, and teachers with the intervention plan. */
  async notifyAtRisk(tenantId: string, studentId: string, risk: number, interventions: string[]) {
    const student = await UserModel.findOne({ _id: studentId, tenantId }).select('name guardianId');
    if (!student) return { sent: 0 };
    const teachers = await UserModel.find({ tenantId, role: 'teacher' }).select('_id');
    const recipients = [studentId, ...(student.get('guardianId') ? [String(student.get('guardianId'))] : []), ...teachers.map((t) => String(t._id))];
    const title = `Learning support flagged for ${student.get('name')}`;
    const body = `Predicted difficulty (risk ${risk}%). Recommended: ${interventions.join('; ')}.`;
    await NotificationModel.insertMany(recipients.map((u) => ({ tenantId, userId: u, title, body, kind: 'intervention' })));
    return { sent: recipients.length };
  },

  // ---- #16 Institutional Analytics ----
  async analytics(tenantId: string) {
    const [results, paidInvoices, sessions, tutors, students] = await Promise.all([
      ResultModel.find({ tenantId }).select('score courseTitle'),
      FeeInvoiceModel.find({ tenantId, status: 'paid' }).select('amountGHS'),
      SessionModel.find({ tenantId }).select('attendees createdAt'),
      TutorModel.find({ tenantId }).select('rating completedSessions headline').populate('userId', 'name'),
      UserModel.countDocuments({ tenantId, role: 'student', deletedAt: null }),
    ]);
    const avgScore = results.length ? Math.round(results.reduce((a, r) => a + (r.score ?? 0), 0) / results.length) : 0;
    const revenueGHS = paidInvoices.reduce((a, i) => a + (i.amountGHS ?? 0), 0);
    const platform = await LedgerModel.find({ tenantId, account: 'platform_revenue', type: 'CREDIT' }).select('amountGHS');
    const commissionGHS = Math.round(platform.reduce((a, e) => a + e.amountGHS, 0) * 100) / 100;
    const attendanceTotal = sessions.reduce((a, s) => a + ((s.get('attendees') as unknown[])?.length ?? 0), 0);
    // Performance by course (avg score)
    const byCourse = new Map<string, { sum: number; n: number }>();
    for (const r of results) { const c = r.get('courseTitle') as string; const e = byCourse.get(c) ?? { sum: 0, n: 0 }; e.sum += r.score ?? 0; e.n++; byCourse.set(c, e); }
    const performance = [...byCourse].map(([course, e]) => ({ course, avg: Math.round(e.sum / e.n) }));
    const teacherEffectiveness = tutors.map((t) => ({ name: (t.get('userId') as { name?: string })?.name ?? t.get('headline') ?? 'Tutor', rating: t.get('rating') ?? 0, sessions: t.get('completedSessions') ?? 0 }))
      .sort((a, b) => b.rating - a.rating).slice(0, 10);
    return { students, avgScore, revenueGHS, commissionGHS, attendanceTotal, sessions: sessions.length, performance, teacherEffectiveness };
  },


  // ---- User management (add students/staff, bulk, roles) ----
  async addUser(tenantId: string, input: { name: string; email: string; role: string; password?: string }) {
    const exists = await UserModel.findOne({ tenantId, email: input.email.toLowerCase() });
    if (exists) throw Object.assign(new Error('A user with that email already exists'), { status: 409 });
    const passwordHash = await bcrypt.hash(input.password || 'learnova123', 10);
    const user = await UserModel.create({ tenantId, name: input.name, email: input.email.toLowerCase(), role: input.role, passwordHash });
    return { id: String(user._id), name: user.name, email: user.email, role: user.role, tempPassword: input.password ? undefined : 'learnova123' };
  },
  async bulkAddUsers(tenantId: string, rows: { name: string; email: string; role: string }[]) {
    const created: unknown[] = []; const skipped: string[] = [];
    for (const r of rows) {
      if (!r.email || !r.name) { skipped.push(r.email || '(no email)'); continue; }
      const exists = await UserModel.findOne({ tenantId, email: r.email.toLowerCase() });
      if (exists) { skipped.push(r.email); continue; }
      const passwordHash = await bcrypt.hash('learnova123', 10);
      const u = await UserModel.create({ tenantId, name: r.name, email: r.email.toLowerCase(), role: r.role || 'student', passwordHash });
      created.push({ id: String(u._id), email: u.email, role: u.role });
    }
    return { created: created.length, skipped, defaultPassword: 'learnova123' };
  },
  async bulkSetRole(tenantId: string, userIds: string[], role: string) {
    const r = await UserModel.updateMany({ tenantId, _id: { $in: userIds } }, { $set: { role } });
    return { updated: r.modifiedCount };
  },

  // ---- Branding ----
  async getBranding(tenantId: string) {
    const t = await TenantModel.findById(tenantId).select('name logoUrl bannerUrl primaryColor tagline about campuses');
    return t ?? {};
  },
  async updateBranding(tenantId: string, input: Record<string, unknown>) {
    const allowed = ['name', 'logoUrl', 'bannerUrl', 'primaryColor', 'tagline', 'about'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (input[k] !== undefined) update[k] = input[k];
    return TenantModel.findByIdAndUpdate(tenantId, { $set: update }, { new: true }).select('name logoUrl bannerUrl primaryColor tagline about');
  },

  // ---- Communication: in-app announcement to all tenant users (SMS/email need a provider) ----
  async announce(tenantId: string, title: string, body: string) {
    const users = await UserModel.find({ tenantId, deletedAt: null }).select('_id');
    await NotificationModel.insertMany(users.map((u) => ({ tenantId, userId: u._id, title, body, kind: 'announcement' })));
    return { sent: users.length };
  },
};
