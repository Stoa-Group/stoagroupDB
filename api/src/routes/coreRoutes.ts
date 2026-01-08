import { Router } from 'express';
import * as coreController from '../controllers/coreController';

const router = Router();

// Project routes (POST and PUT only - Domo handles GET)
router.post('/projects', coreController.createProject);
router.put('/projects/:id', coreController.updateProject);

// Bank routes
router.post('/banks', coreController.createBank);
router.put('/banks/:id', coreController.updateBank);

// Person routes
router.post('/persons', coreController.createPerson);
router.put('/persons/:id', coreController.updatePerson);

// Equity Partner routes
router.post('/equity-partners', coreController.createEquityPartner);
router.put('/equity-partners/:id', coreController.updateEquityPartner);

export default router;

