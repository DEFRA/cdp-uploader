const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  quarantined: Symbol('quarantined'),
  scanned: Symbol('scanned'),
  delivered: Symbol('delivered'),
  acknowledged: Symbol('acknowledged')
})

function canBeQuarantined(status) {
  return Boolean(!status || status === uploadStatus.initiated)
}

function canBeScanned(status) {
  return Boolean(!status || status === uploadStatus.quarantined)
}

function canBeDelivered(safe, status) {
  return Boolean(
    safe &&
      status &&
      (status === uploadStatus.quarantined || status === uploadStatus.scanned)
  )
}

function canBeAcknowledged(safe, status) {
  return Boolean(
    (!safe && status && status === uploadStatus.scanned) ||
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
