const INSECURE_DEFAULT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
const isProduction = process.env.NODE_ENV === 'production';
const failures = [];

function requireProductionEnv(name) {
  if (isProduction && !process.env[name]) {
    failures.push(`${name} is required when NODE_ENV=production`);
  }
}

requireProductionEnv('JWT_SECRET');
requireProductionEnv('DATABASE_URL');
requireProductionEnv('FRONTEND_URL');
requireProductionEnv('RESEND_API_KEY');

if (process.env.JWT_SECRET === INSECURE_DEFAULT_SECRET) {
  failures.push('JWT_SECRET uses the insecure development default');
}

if (process.env.CORS_ALLOW_ALL === 'true' && isProduction) {
  failures.push('CORS_ALLOW_ALL must not be true in production');
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`❌ ${failure}`);
  }
  process.exit(1);
}

console.log('✅ deployment environment checks passed');
