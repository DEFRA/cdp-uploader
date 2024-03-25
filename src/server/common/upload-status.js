const uploadStatus = Object.freeze({
  initiated: Symbol('initiated'),
  quarantined: Symbol('quarantined'),
  scanned: Symbol('scanned'),
  delivered: Symbol('delivered'),
  acknowledged: Symbol('acknowledged')
})

function canBeUploaded(status) {
  return Boolean(!status || status === uploadStatus.initiated)
}

function canBeMoved(safe, status) {
  return Boolean(
    safe &&
      status &&
      (status === uploadStatus.quarantined || status === uploadStatus.scanned)
  )
}

export { uploadStatus, canBeUploaded, canBeMoved }
