import { equal, strictEqual } from 'node:assert';
import { AppManager, DEPLOYMENT_CONFIG } from '../../src/index.js';

// Test Deployment Admin Email
strictEqual(DEPLOYMENT_CONFIG.admin.email, 'panchapon@udkp.ac.th');
strictEqual(DEPLOYMENT_CONFIG.admin.role, 'DIRECTOR');

// Test App Initialization
const app = AppManager.initializeSupervisionModule([]);
strictEqual(app.config.admin.email, 'panchapon@udkp.ac.th');
equal(typeof app.service.createSlot, 'function');

console.log('✅ Deployment Configuration Test Passed (Admin: panchapon@udkp.ac.th)');
