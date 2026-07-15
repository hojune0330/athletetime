function postgresSslConfig(environment = process.env) {
  if (environment.NODE_ENV !== 'production') return false;

  const encodedCa = environment.DATABASE_CA_CERT_BASE64;
  if (encodedCa) {
    return {
      rejectUnauthorized: true,
      ca: Buffer.from(encodedCa, 'base64').toString('utf8'),
    };
  }

  // Render's private PostgreSQL endpoint uses a self-signed certificate.
  // Keep this exception explicit and platform-bound instead of weakening TLS globally.
  if (
    environment.RENDER === 'true'
    && environment.DATABASE_TLS_ALLOW_SELF_SIGNED === 'true'
  ) {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

module.exports = { postgresSslConfig };
