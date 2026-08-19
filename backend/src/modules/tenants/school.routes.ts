import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { schoolService } from './school.service.js';

export const schoolRoutes = Router();
schoolRoutes.use(requireAuth, requireRole('school_admin', 'super_admin'));

const createSchema = z.object({ name: z.string().min(2), slug: z.string().min(2), plan: z.string().optional() });
schoolRoutes.post('/', validate(createSchema), asyncHandler(async (req, res) =>
  ok(res, await schoolService.createTenant(req.body), undefined, 201)));

const campusSchema = z.object({ name: z.string().min(2), region: z.string().optional(), address: z.string().optional() });
schoolRoutes.post('/campuses', validate(campusSchema), asyncHandler(async (req, res) =>
  ok(res, await schoolService.addCampus(req.user!.tenantId, req.body))));

schoolRoutes.get('/roster', asyncHandler(async (req, res) =>
  ok(res, await schoolService.roster(req.user!.tenantId, req.query.role as string | undefined))));

schoolRoutes.get('/stats', asyncHandler(async (req, res) =>
  ok(res, await schoolService.stats(req.user!.tenantId))));

// ---- Academic Management ----
schoolRoutes.post('/departments', validate(z.object({ name: z.string().min(2), campus: z.string().optional(), head: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.addDepartment(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/departments', asyncHandler(async (req, res) => ok(res, await schoolService.listDepartments(req.user!.tenantId))));

schoolRoutes.post('/courses', validate(z.object({ code: z.string().min(1), title: z.string().min(2), department: z.string().optional(), credits: z.number().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.addCourse(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/courses', asyncHandler(async (req, res) => ok(res, await schoolService.listCourses(req.user!.tenantId))));

// ---- Administration ----
schoolRoutes.post('/timetable', validate(z.object({ courseTitle: z.string().min(2), day: z.string(), startTime: z.string(), endTime: z.string(), room: z.string().optional(), teacher: z.string().optional(), campus: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.addTimetable(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/timetable', asyncHandler(async (req, res) => ok(res, await schoolService.listTimetable(req.user!.tenantId))));

schoolRoutes.post('/fees', validate(z.object({ name: z.string().min(2), amountGHS: z.number().positive(), term: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.addFeeStructure(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/fees', asyncHandler(async (req, res) => ok(res, await schoolService.listFeeStructures(req.user!.tenantId))));
schoolRoutes.post('/invoices', validate(z.object({ studentId: z.string(), name: z.string().optional(), amountGHS: z.number().positive(), dueDate: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.invoiceStudent(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/invoices', asyncHandler(async (req, res) => ok(res, await schoolService.listInvoices(req.user!.tenantId))));

schoolRoutes.post('/results', validate(z.object({ studentId: z.string(), courseTitle: z.string().min(2), score: z.number().min(0).max(100), term: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.recordResult(req.user!.tenantId, req.body), undefined, 201)));
schoolRoutes.get('/results', asyncHandler(async (req, res) => ok(res, await schoolService.listResults(req.user!.tenantId))));

// ---- Communication ----
schoolRoutes.post('/announce', validate(z.object({ title: z.string().min(2), body: z.string().min(2) })),
  asyncHandler(async (req, res) => ok(res, await schoolService.announce(req.user!.tenantId, req.body.title, req.body.body))));

// ---- #7 Learning Difficulty Predictor ----
schoolRoutes.get('/risk-report', asyncHandler(async (req, res) => ok(res, await schoolService.riskReport(req.user!.tenantId))));
schoolRoutes.post('/risk-report/notify', validate(z.object({ studentId: z.string(), risk: z.number(), interventions: z.array(z.string()) })),
  asyncHandler(async (req, res) => ok(res, await schoolService.notifyAtRisk(req.user!.tenantId, req.body.studentId, req.body.risk, req.body.interventions))));

// ---- #16 Institutional Analytics ----
schoolRoutes.get('/analytics', asyncHandler(async (req, res) => ok(res, await schoolService.analytics(req.user!.tenantId))));

// ---- User management (school admin) ----
schoolRoutes.post('/users', validate(z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(['student', 'teacher', 'parent', 'school_admin']), password: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.addUser(req.user!.tenantId, req.body), undefined, 201)));

schoolRoutes.post('/users/bulk', validate(z.object({ rows: z.array(z.object({ name: z.string(), email: z.string(), role: z.string().optional() })).min(1).max(500) })),
  asyncHandler(async (req, res) => ok(res, await schoolService.bulkAddUsers(req.user!.tenantId, req.body.rows))));

schoolRoutes.patch('/users/roles', validate(z.object({ userIds: z.array(z.string()).min(1), role: z.enum(['student', 'teacher', 'parent', 'school_admin']) })),
  asyncHandler(async (req, res) => ok(res, await schoolService.bulkSetRole(req.user!.tenantId, req.body.userIds, req.body.role))));
