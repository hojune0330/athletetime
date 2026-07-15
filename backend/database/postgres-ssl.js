function postgresSslConfig(environment = process.env) {
  if (environment.NODE_ENV !== 'production') return false;

  const encodedCa = environment.DATABASE_CA_CERT_BASE64;
  if (!encodedCa) return { rejectUnauthorized: true };

  return {
    rejectUnauthorized: true,
    ca: Buffer.from(encodedCa, 'base64').toString('utf8'),
  };
}

module.exports = { postgresSslConfig };
