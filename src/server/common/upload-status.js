const UploadStatus = {
  Initiated: 'initiated',
  Quarantined: 'quarantined',
  Scanned: 'scanned',
  Delivered: 'delivered',
  Acknowledged: 'acknowledged'
}

function canBeUploaded(status) {
  return !status || status === UploadStatus.Initiated
}

function canBeMoved(safe, status) {
  return (
    safe &&
    status &&
    (status === UploadStatus.Quarantined || status === UploadStatus.Scanned)
  )
}

export { UploadStatus, canBeUploaded, canBeMoved }
