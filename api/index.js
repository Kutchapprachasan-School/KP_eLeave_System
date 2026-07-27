import { AppManager, DEPLOYMENT_CONFIG } from '../eLeave/src/index.js';

export default function handler(req, res) {
  const app = AppManager.initializeSupervisionModule([]);
  res.status(200).json({
    status: 'online',
    app: DEPLOYMENT_CONFIG.app_name,
    version: DEPLOYMENT_CONFIG.version,
    admin: DEPLOYMENT_CONFIG.admin.email,
    supervision_service: 'active',
    timestamp: new Date().toISOString()
  });
}
