/**
 * Get base64 certs from all environment variables starting with TRUSTSTORE_
 *
 * @param envs
 * @returns {string[]}
 */
const getTrustStoreCerts = (envs) =>
  Object.entries(envs)
    .map(([key, value]) => key.startsWith('TRUSTSTORE_') && value)
    .filter(Boolean)
    .map((envValue) => Buffer.from(envValue, 'base64').toString().trim())

export { getTrustStoreCerts }
