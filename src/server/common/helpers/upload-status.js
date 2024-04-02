const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  pending: Symbol('pending'),
  quarantined: Symbol('quarantined'),
  scanned: Symbol('scanned'),
  delivered: Symbol('delivered'),
  acknowledged: Symbol('acknowledged')
})

function canBeUploaded(status) {
  return Boolean(!status || isInitiated(status))
}

function canBeScanned(status) {
  return Boolean(isPending(status))
  //   return Boolean( !status || isPending(status))
}

function canBeDelivered(safe, status) {
  return Boolean(safe && status && isScanned(status)) // || isPending(status))
}

function canBeAcknowledged(safe, status) {
  return Boolean(
    (status && isDelivered(status)) || (!safe && status && isScanned(status))
  )
  //   return Boolean( isReady(status) || isFailed(status))
}

function isInitiated(status) {
  return status === uploadStatus.initiated.description
}

function isPending(status) {
  return status === uploadStatus.pending.description
}

function isScanned(status) {
  return status === uploadStatus.scanned.description
}

function isDelivered(status) {
  return status === uploadStatus.delivered.description
}

export {
  uploadStatus,
  canBeUploaded,
  canBeScanned,
  canBeDelivered,
  canBeAcknowledged
}
