const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    assignPlanToRetailer,
    createPlanValidation
} = require('../controllers/planController');

// All routes require admin authentication
router.use(authenticate);

// Plan CRUD routes
router.post('/plans', createPlanValidation, createPlan);
router.get('/plans', getAllPlans);
router.get('/plans/:planId', getPlanById);
router.put('/plans/:planId', createPlanValidation, updatePlan);
router.delete('/plans/:planId', deletePlan);

// Retailer plan assignment
router.put('/retailers/:retailerId/assign-plan', assignPlanToRetailer);

module.exports = router;
