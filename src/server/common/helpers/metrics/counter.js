import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'
import { config } from '~/src/config'
import { createLogger } from '~/src/server/common/helpers/logging/logger'

const counter = async (metricName, value = 1) => {
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

const fileSize = async (metricName, value) => {
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

const millis = async (metricName, value) => {
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

export { counter, fileSize, millis }
