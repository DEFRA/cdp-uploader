import Wreck from '@hapi/wreck'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export async function downloadToS3({
  url,
  bucket,
  key,
  s3,
  timeoutMs = 30_000
}) {
  const { res, payload } = await Wreck.request('GET', url, {
    redirects: 3,
    timeout: timeoutMs
  }).then(async (res) => {
    if (res?.statusCode && (res?.statusCode < 200 || res?.statusCode >= 300)) {
      const errBody = await Wreck.read(res).catch(() => Buffer.from(''))
      throw new Error(
        `HTTP ${res.statusCode} fetching ${url}: ${errBody.toString().slice(0, 200)}`
      )
    }
    return { res, payload: res }
  })

  const contentType = res.headers['content-type']
  const contentLengthHeader = res.headers['content-length']
  const contentLength = contentLengthHeader
    ? Number(contentLengthHeader)
    : undefined

  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: payload,
    ContentType: contentType
  })

  try {
    const out = await s3.send(put)
    return { bucket, key, etag: out.ETag, contentLength, contentType }
  } catch (err) {
    payload.destroy(err)
    throw err
  }
}
