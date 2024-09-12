import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * @param {string} metricName
 * @param {number} value
 */
export async function counter(metricName, value = 1) {
  if (!config.get('isProduction')) return
  const logger = createLogger()

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(metricName, value, Unit.Count, StorageResolution.Standard)
    await metrics.flush()
  } catch (e) {
    logger.warn(e)
  }
}

export async function fileSize(metricName, value) {
  if (!config.get('isProduction')) return
  const logger = createLogger()

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(metricName, value, Unit.Bytes, StorageResolution.Standard)
    await metrics.flush()
  } catch (e) {
    logger.warn(e)
  }
}

export async function millis(metricName, value) {
  if (!config.get('isProduction')) return
  const logger = createLogger()

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(
      metricName,
      value,
      Unit.Milliseconds,
      StorageResolution.Standard
    )
    await metrics.flush()
  } catch (e) {
    logger.warn(e)
  }
}
