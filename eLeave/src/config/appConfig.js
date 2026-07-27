// Instructional Supervision Subsystem - Production Deployment Config
export const DEPLOYMENT_CONFIG = {
  app_name: 'eLeave & Instructional Supervision System',
  version: '2026.1.0',
  environment: 'production',
  admin: {
    email: 'panchapon@udkp.ac.th',
    role: 'DIRECTOR',
    authority: ['FULL_ADMIN', 'SCORE_OVERRIDE', 'DIRECTOR_SIGN']
  },
  modules: {
    eleave_core: {
      enabled: true,
      isolated: true
    },
    instructional_supervision: {
      enabled: true,
      route_prefix: '/supervision',
      video_link_validation: true,
      max_lesson_plan_size_mb: 10,
      director_override_audit: true
    }
  }
};
