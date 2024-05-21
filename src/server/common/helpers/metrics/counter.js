import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const counter = async (metricName, value = 1) => {
  const logger = createLogger()
  if (!config.get('isProduction')) return

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(metricName, value, Unit.Count, StorageResolution.Standard)
    await metrics.flush()
  } catch (e) {
    logger.warn(e)
  }
}

const averageFileSize = async (metricName, value) => {
  const logger = createLogger()
  if (!config.get('isProduction')) return

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(metricName, value, Unit.Bytes, StorageResolution.Standard)
    await metrics.flush()
  } catch (e) {
    logger.warn(e)
  }
}

export { counter, averageFileSize }
