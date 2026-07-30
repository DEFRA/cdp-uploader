const fileErrors = {
  virus: {
    code: 'FILE_VIRUS',
    message: 'The selected file contains a virus'
  },
  empty: {
    code: 'FILE_EMPTY',
    message: 'The selected file is empty'
  },
  tooBig: {
    code: 'FILE_TOO_LARGE',
    message: 'The selected file must be smaller than $MAXSIZE'
  },
  wrongType: {
    code: 'FILE_INVALID_TYPE',
    message: 'The selected file must be a $MIMETYPES'
  },
  uploadFailed: {
    code: 'FILE_UPLOAD_FAILED',
    message: 'The selected file could not be uploaded – try again'
  },
  downloadFailed: {
    code: 'FILE_DOWNLOAD_FAILED',
    message: 'The selected file could not be downloaded'
  }
}

export { fileErrors }
