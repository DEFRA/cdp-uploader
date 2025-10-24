import { unlink } from 'node:fs/promises'

export function registerTempFileCleanup(server) {
  server.ext('onPreResponse', async (request, h) => {
    const payload = request.payload

    if (payload && typeof payload === 'object') {
      const path = payload.path
      if (typeof path === 'string') {
        try {
          await unlink(path)
          request.logger.debug(`Deleted temp file: ${path}`)
        } catch (err) {
          request.logger.warn(
            err,
            `Failed to delete temp file ${path}: ${err.message}`
          )
        }
      }

      if (Array.isArray(payload.files)) {
        for (const file of payload.files) {
          const filePath = file?.path
          if (typeof filePath === 'string') {
            try {
              await unlink(filePath)
              request.logger.debug(`Deleted temp file: ${filePath}`)
            } catch (err) {
              request.logger.warn(
                err,
                `Failed to delete temp file ${filePath}: ${err.message}`
              )
            }
          }
        }
      }
    }

    return h.continue
  })
}
