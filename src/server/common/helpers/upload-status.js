const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  quarantined: Symbol('quarantined'),
  scanned: Symbol('scanned'),
  delivered: Symbol('delivered'),
  acknowledged: Symbol('acknowledged')
})

function canBeQuarantined(status) {
  return Boolean(!status || status === uploadStatus.initiated.description)
}

function canBeScanned(status) {
  return Boolean(!status || status === uploadStatus.quarantined.description)
}

function canBeDelivered(safe, status) {
  return Boolean(
    safe &&
      status &&
      (status === uploadStatus.quarantined.description ||
        status === uploadStatus.scanned.description)
  )
}

function canBeAcknowledged(safe, status) {
  return Boolean(
    (!safe && status && status === uploadStatus.scanned.description) ||
      (status && status === uploadStatus.delivered.description)
  )
}

export {
  uploadStatus,
  canBeQuarantined,
  canBeScanned,
  canBeDelivered,
  canBeAcknowledged
}
