function relativeToAbsolute(base, path) {
  if (isAbsolute(path)) {
    return path
  }

  try {
    return new URL(path, base).toString()
  } catch (e) {
    throw new Error('Failed to convert path to absolute url')
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
