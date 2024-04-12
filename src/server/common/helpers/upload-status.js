const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  pending: Symbol('pending'),
  ready: Symbol('ready')
})

function isInitiated(status) {
  return status === uploadStatus.initiated.description
}

function isReady(status) {
  return status === uploadStatus.ready.description
}

function isUploadPending(status) {
  return status === uploadStatus.pending.description
}

export { isInitiated, isReady, isUploadPending, uploadStatus }
