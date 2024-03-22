const UploadStatus = {
  Initiated: Symbol('Initiated'),
  Quarantined: Symbol('Quarantined'),
  Scanned: Symbol('Scanned'),
  Moved: Symbol('Moved'),
  Calledback: Symbol('Calledback')
}

function canBeUploaded(status) {
  return !status || status === UploadStatus.Initiated
}

function canBeMoved(safe, status) {
  return (
    safe &&
    (status === UploadStatus.Quarantined || status === UploadStatus.Scanned)
  )
}

export { UploadStatus, canBeUploaded, canBeMoved }
