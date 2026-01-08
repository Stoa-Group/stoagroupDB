import { Router } from 'express';
import * as bankingController from '../controllers/bankingController';

const router = Router();

// Loan routes (POST and PUT only - Domo handles GET)
router.post('/loans', bankingController.createLoan);
router.put('/loans/:id', bankingController.updateLoan);

// DSCR Test routes
router.post('/dscr-tests', bankingController.createDSCRTest);
router.put('/dscr-tests/:id', bankingController.updateDSCRTest);

// Participation routes
router.post('/participations', bankingController.createParticipation);
router.put('/participations/:id', bankingController.updateParticipation);

// Guarantee routes
router.post('/guarantees', bankingController.createGuarantee);
router.put('/guarantees/:id', bankingController.updateGuarantee);

// Covenant routes
router.post('/covenants', bankingController.createCovenant);
router.put('/covenants/:id', bankingController.updateCovenant);

// Liquidity Requirement routes
router.post('/liquidity-requirements', bankingController.createLiquidityRequirement);
router.put('/liquidity-requirements/:id', bankingController.updateLiquidityRequirement);

// Bank Target routes
router.post('/bank-targets', bankingController.createBankTarget);
router.put('/bank-targets/:id', bankingController.updateBankTarget);

// Equity Commitment routes
router.post('/equity-commitments', bankingController.createEquityCommitment);
router.put('/equity-commitments/:id', bankingController.updateEquityCommitment);

export default router;

