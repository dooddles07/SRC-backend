// routes/pipeline.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  listPipelines,
  listOpportunities,
  createOpportunity,
  moveOpportunityStage,
} = require('../controllers/pipelineController');

// GET  /api/pipelines
router.get('/', authenticate, listPipelines);

// GET  /api/pipelines/:pipelineId/opportunities
router.get('/:pipelineId/opportunities', authenticate, listOpportunities);

// POST /api/opportunities
router.post(
  '/opportunities',
  authenticate,
  [
    body('pipelineId').notEmpty().withMessage('pipelineId is required'),
    body('pipelineStageId').notEmpty().withMessage('pipelineStageId is required'),
    body('contactId').notEmpty().withMessage('contactId is required'),
    body('name').notEmpty().withMessage('name is required'),
  ],
  createOpportunity
);

// PATCH /api/pipelines/opportunities/:opportunityId/stage
router.patch(
  '/opportunities/:opportunityId/stage',
  authenticate,
  [
    body('pipelineStageId').notEmpty().withMessage('pipelineStageId is required'),
  ],
  moveOpportunityStage
);

module.exports = router;
