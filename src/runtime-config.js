// Browser-only release switches. Journey defaults on for development and new
// deployments; set VITE_CLIENT_JOURNEY_ENABLED=false for an immediate UI rollback.
export const CLIENT_JOURNEY_ENABLED = import.meta.env.VITE_CLIENT_JOURNEY_ENABLED !== 'false';
