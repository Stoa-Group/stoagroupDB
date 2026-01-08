import { Router } from 'express';
import * as pipelineController from '../controllers/pipelineController';

const router = Router();

// Under Contract routes (POST and PUT only - Domo handles GET)
router.post('/under-contracts', pipelineController.createUnderContract);
router.put('/under-contracts/:id', pipelineController.updateUnderContract);

// Commercial Listed routes
router.post('/commercial-listed', pipelineController.createCommercialListed);
router.put('/commercial-listed/:id', pipelineController.updateCommercialListed);

// Commercial Acreage routes
router.post('/commercial-acreage', pipelineController.createCommercialAcreage);
router.put('/commercial-acreage/:id', pipelineController.updateCommercialAcreage);

// Closed Property routes
router.post('/closed-properties', pipelineController.createClosedProperty);
router.put('/closed-properties/:id', pipelineController.updateClosedProperty);

export default router;

