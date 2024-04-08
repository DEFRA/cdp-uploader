const fileStatus = Object.freeze({
  pending: Symbol('pending'),
  infected: Symbol('infected'),
  clean: Symbol('clean')
})

function isFilePending(status) {
  return status === fileStatus.pending.description
}

function isInfected(status) {
  return status === fileStatus.infected.description
}
function isClean(status) {
  return status === fileStatus.clean.description
}

function isVirusScanned(status) {
  return isInfected(status) || isClean(status)
}

function toFileStatus(clamavStatus) {
  switch (clamavStatus) {
    case 'CLEAN':
      return fileStatus.clean.description
    case 'INFECTED':
      return fileStatus.infected.description
  }
}

export { isClean, isFilePending, isInfected, isVirusScanned, toFileStatus }
