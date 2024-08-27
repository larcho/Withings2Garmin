import moment from 'moment'
import GarminClient from '../garmin/http'

interface iLatestWeightItem {
  samplePk: number
  date: number
  calendarDate: string
  timestampGMT: number
}

interface iDailtyWeightSummary {
  summaryDate: string
  numOfWeightEntries: number
  latestWeight: iLatestWeightItem
}

interface iWeightResponse {
  dailyWeightSummaries?: iDailtyWeightSummary[]
}

interface iBloodPressureItem {
  version: number
  measurementTimestampGMT: string
}

interface iBloodPressureMeasurementSummaries {
  measurements: iBloodPressureItem[]
}

interface iBloodPressureResponse {
  measurementSummaries: iBloodPressureMeasurementSummaries[]
}

export default class GarminApi {
  private client: GarminClient

  constructor(client: GarminClient) {
    this.client = client
  }

  public async getLatestEntryDate(): Promise<number> {
    const monthAgo = moment().subtract(1, 'months')

    let latestEntry = monthAgo.unix()

    const weightPath =
      `/weight-service/weight/range/${monthAgo.format('YYYY-MM-DD')}/` +
      `${moment().format('YYYY-MM-DD')}`
    const weightData = (await this.client.connectApi('GET', {
      path: weightPath,
    })) as iWeightResponse
    const dailyWeightSummaries = weightData.dailyWeightSummaries || []
    if (
      dailyWeightSummaries.length > 0 &&
      dailyWeightSummaries[0].latestWeight.date > latestEntry
    ) {
      latestEntry = dailyWeightSummaries[0].latestWeight.date
    }

    const bloodPressurePath =
      `/bloodpressure-service/bloodpressure/range/${monthAgo.format('YYYY-MM-DD')}/` +
      `${moment().format('YYYY-MM-DD')}?includeAll=true`
    const bloodPressureResponse = (await this.client.connectApi('GET', {
      path: bloodPressurePath,
    })) as iBloodPressureResponse

    // Yay for Garmin and not keeping a consistent API data structure.

    const bloodMeasurement =
      bloodPressureResponse.measurementSummaries.length > 0
        ? bloodPressureResponse.measurementSummaries[0].measurements[0]
        : undefined

    if (bloodMeasurement) {
      const time = moment.utc(bloodMeasurement.measurementTimestampGMT)
      if (time.unix() > latestEntry) {
        latestEntry = time.unix()
      }
    }

    return latestEntry
  }
}
