import { Router } from 'express';
import * as asanaController from '../controllers/asanaController';

const router = Router();

/** Ping to verify Asana routes are deployed (e.g. GET /api/asana). */
router.get('/', (_req, res) => res.json({ ok: true, message: 'Asana API' }));
router.get('/upcoming-tasks', asanaController.getUpcomingTasks);
/** Admin remedy: set Asana task Start Date custom field only (body: { due_on: "YYYY-MM-DD" }). */
router.put('/tasks/:taskGid/due-on', asanaController.updateTaskDueOn);
/** Admin remedy: set one Asana task custom field (body: { field: string, value: string | number }). */
router.put('/tasks/:taskGid/custom-field', asanaController.updateTaskCustomField);

export default router;
