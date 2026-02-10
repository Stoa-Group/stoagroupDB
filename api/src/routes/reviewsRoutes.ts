import { Router } from 'express';
import * as reviewsController from '../controllers/reviewsController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// List reviews (filters: property, sentiment, category, from, to, limit, includeOnlyReport)
router.get('/', reviewsController.getReviews);

// Active properties with review config (for dashboard + scraper)
router.get('/properties', reviewsController.getReviewProperties);

// Update config (GoogleMapsUrl, IncludeInReviewsReport) per property — admin
router.put('/properties/:projectId/config', authenticate, reviewsController.updateReviewConfig);

// Daily alert email list (from core.contacts or ad-hoc)
router.get('/config/daily-alert-list', reviewsController.getDailyAlertList);
router.post('/config/daily-alert-list', authenticate, reviewsController.addDailyAlertRecipient);
router.delete('/config/daily-alert-list/:id', authenticate, reviewsController.deleteDailyAlertRecipient);

// Seed Google Maps URLs for properties (admin; body: { propertyUrls: { "Property Name": "url", ... } })
router.post('/seed-property-urls', authenticate, reviewsController.seedPropertyUrls);

// Bulk upsert reviews (scraper)
router.post('/bulk', reviewsController.bulkUpsertReviews);

export default router;
