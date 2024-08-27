import {roundToPrecision} from '../utils'
import fetchAuthTokens from './authtokens'
import GarminClient from '../garmin/http'
import WithingsMeasurements from '../withings/measurements'
import {FitEncoderWeight, FitEncoderBloodPressure} from '../garmin/fit'
import GarminApi from './garminapi'

const main = async () => {
  const tokens = await fetchAuthTokens()
  const garminClient = new GarminClient({oAuth2Token: tokens.garminOAuth2Token})
  const garminApi = new GarminApi(garminClient)
  const withingsMeasurements = new WithingsMeasurements(
    tokens.withingsOAuth2Token,
  )
  const startDate = await garminApi.getLatestEntryDate()
  const height = await withingsMeasurements.getHeight()
  const measurements = await withingsMeasurements.getMeasurements(startDate + 1)
  for (let item of measurements.reverse()) {
    if (item.weight && item.date) {
      const bmi = height ? roundToPrecision(item.weight / height ** 2, 2) : null
      const fitWeight = new FitEncoderWeight()
      fitWeight.writeFileInfo()
      fitWeight.writeFileCreator()
      fitWeight.writeDeviceInfo({timestamp: item.date})
      fitWeight.writeWeightScale({
        timestamp: item.date,
        weight: item.weight,
        percentFat: item.fatRatio,
        percentHydration: item.hydration,
        boneMass: item.boneMass,
        muscleMass: item.muscleMass,
        bmi,
      })
      fitWeight.finish()

      const filename = `weight_${item.date}.fit`
      const response = await garminClient.upload(fitWeight.buffer, filename)
      console.log(response)
    }
    if (item.date && item.systolicBloodPressure) {
      const fitBloodPressure = new FitEncoderBloodPressure()
      fitBloodPressure.writeFileInfo()
      fitBloodPressure.writeFileCreator()
      fitBloodPressure.writeDeviceInfo({timestamp: item.date})
      fitBloodPressure.writeBloodPressure({
        timestamp: item.date,
        diastolicBloodPressure: item.diastolicBloodPressure,
        systolicBloodPressure: item.systolicBloodPressure,
        heartRate: item.heartPulse,
      })
      fitBloodPressure.finish()
      const filename = `bloodpressure_${item.date}.fit`
      const response = await garminClient.upload(
        fitBloodPressure.buffer,
        filename,
      )
      console.log(response)
    }
  }
}

main()
