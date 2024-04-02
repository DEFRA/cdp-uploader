const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  pending: Symbol('pending'),
  quarantined: Symbol('quarantined'),
  scanned: Symbol('scanned'),
  delivered: Symbol('delivered'),
  acknowledged: Symbol('acknowledged')
})

function canBeQuarantined(details) {
  return Boolean(
    !details?.uploadStatus ||
      details.uploadStatus === uploadStatus.initiated.toString()
  )
}

function canBeScanned(status) {
  return Boolean(!status || status === uploadStatus.quarantined)
}

function canBeDelivered(safe, status) {
  return Boolean(
    safe &&
      status &&
      (status === uploadStatus.quarantined ||
        status === uploadStatus.scanned.toString())
  )
}

function canBeAcknowledged(safe, status) {
  return Boolean(
    (!safe && status && status === uploadStatus.scanned.toString()) ||
      (status && status === uploadStatus.delivered)
  )
}

export {
  uploadStatus,
  canBeQuarantined,
  canBeScanned,
  canBeDelivered,
  canBeAcknowledged
}
