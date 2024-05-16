/**
 * Get map of service to buckets environment variables starting with CONSUMER_
 *
 * @param envs
 */
const getBucketsAllowlist = (envs) => {
  const bucketsAllowlist = Object.entries(envs)
    .filter(([key, value]) => key.startsWith('CONSUMER_BUCKETS'))
    .map(([key, value]) => value.split(','))

  return bucketsAllowlist.flat()
}

export { getBucketsAllowlist }
