function relativeToAbsolute(base, path, logger) {
  if (isAbsolute(path)) {
    return path
  }
  try {
    return new URL(path, base).toString()
  } catch (e) {
    logger.error('Failed to convert path to absolute url')
    return path
  }
}

function isAbsolute(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export { relativeToAbsolute, isAbsolute }
