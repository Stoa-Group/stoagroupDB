import { Router } from 'express';
import * as bankingController from '../controllers/bankingController';

const router = Router();

// Loan routes
router.get('/loans', bankingController.getAllLoans);
router.get('/loans/:id', bankingController.getLoanById);
router.get('/loans/project/:projectId', bankingController.getLoansByProject);
router.post('/loans', bankingController.createLoan);
router.put('/loans/:id', bankingController.updateLoan);
router.put('/loans/project/:projectId', bankingController.updateLoanByProject); // Convenience: update by ProjectId

// DSCR Test routes
router.get('/dscr-tests', bankingController.getAllDSCRTests);
router.get('/dscr-tests/:id', bankingController.getDSCRTestById);
router.get('/dscr-tests/project/:projectId', bankingController.getDSCRTestsByProject);
router.post('/dscr-tests', bankingController.createDSCRTest);
router.put('/dscr-tests/:id', bankingController.updateDSCRTest);

// Participation routes
router.get('/participations', bankingController.getAllParticipations);
router.get('/participations/:id', bankingController.getParticipationById);
router.get('/participations/project/:projectId', bankingController.getParticipationsByProject);
router.post('/participations', bankingController.createParticipation);
router.put('/participations/:id', bankingController.updateParticipation);

// Guarantee routes
router.get('/guarantees', bankingController.getAllGuarantees);
router.get('/guarantees/:id', bankingController.getGuaranteeById);
router.get('/guarantees/project/:projectId', bankingController.getGuaranteesByProject);
router.post('/guarantees', bankingController.createGuarantee);
router.put('/guarantees/:id', bankingController.updateGuarantee);

// Covenant routes
router.get('/covenants', bankingController.getAllCovenants);
router.get('/covenants/:id', bankingController.getCovenantById);
router.get('/covenants/project/:projectId', bankingController.getCovenantsByProject);
router.post('/covenants', bankingController.createCovenant);
router.put('/covenants/:id', bankingController.updateCovenant);

// Liquidity Requirement routes
router.get('/liquidity-requirements', bankingController.getAllLiquidityRequirements);
router.get('/liquidity-requirements/:id', bankingController.getLiquidityRequirementById);
router.get('/liquidity-requirements/project/:projectId', bankingController.getLiquidityRequirementsByProject);
router.post('/liquidity-requirements', bankingController.createLiquidityRequirement);
router.put('/liquidity-requirements/:id', bankingController.updateLiquidityRequirement);

// Bank Target routes
router.get('/bank-targets', bankingController.getAllBankTargets);
router.get('/bank-targets/:id', bankingController.getBankTargetById);
router.post('/bank-targets', bankingController.createBankTarget);
router.put('/bank-targets/:id', bankingController.updateBankTarget);

// Equity Commitment routes
router.get('/equity-commitments', bankingController.getAllEquityCommitments);
router.get('/equity-commitments/:id', bankingController.getEquityCommitmentById);
router.get('/equity-commitments/project/:projectId', bankingController.getEquityCommitmentsByProject);
router.post('/equity-commitments', bankingController.createEquityCommitment);
router.put('/equity-commitments/:id', bankingController.updateEquityCommitment);

export default router;

