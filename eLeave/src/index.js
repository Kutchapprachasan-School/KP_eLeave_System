// Main Production Entry Point for eLeave Subsystems
import { DEPLOYMENT_CONFIG } from './config/appConfig.js';
import { SupervisionService } from './services/supervisionService.js';
import { WeeklyTimetable } from './components/WeeklyTimetable.js';
import { EvaluationModal } from './components/EvaluationModal.js';

export class AppManager {
  static getConfig() {
    return DEPLOYMENT_CONFIG;
  }

  static initializeSupervisionModule(dataStore = []) {
    console.log(`[DEPLOYMENT] Initializing Instructional Supervision Module for Admin: ${DEPLOYMENT_CONFIG.admin.email}`);
    return {
      service: new SupervisionService(dataStore),
      WeeklyTimetable,
      EvaluationModal,
      config: DEPLOYMENT_CONFIG
    };
  }
}

export { DEPLOYMENT_CONFIG, SupervisionService, WeeklyTimetable, EvaluationModal };
