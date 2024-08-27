import * as readline from 'readline'
import GarminSSO from '../garmin/sso'
import WithingsAuth from '../withings/auth'
import {
  setSecret,
  AWS_WITHINGS_OAUTH_SECRET,
  AWS_GARMIN_OAUTH1_SECRET,
  AWS_GARMIN_OAUTH2_SECRET,
} from '../utils'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const askQuestion = async (question: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

const garminSSO = new GarminSSO()
const withingsAuth = new WithingsAuth()

const main = async () => {
  const garminEmail = await askQuestion('Garmin Email: ')
  const garminPassword = await askQuestion('Garmin password: ')
  const garminTokens = await garminSSO.login(garminEmail, garminPassword)
  await setSecret(
    Buffer.from(JSON.stringify(garminTokens.oAuth1Token)).toString('base64'),
    AWS_GARMIN_OAUTH1_SECRET,
  )
  await setSecret(
    Buffer.from(JSON.stringify(garminTokens.oAuth2Token)).toString('base64'),
    AWS_GARMIN_OAUTH2_SECRET,
  )
  const withingsAuthenticationURL = await withingsAuth.getAuthenticationURL()
  console.log(`Open this in your browser: ${withingsAuthenticationURL}`)
  const withingsToken = await askQuestion('Withings token: ')
  const withingsOAuth = await withingsAuth.getAccessToken(withingsToken)
  await setSecret(
    Buffer.from(JSON.stringify(withingsOAuth)).toString('base64'),
    AWS_WITHINGS_OAUTH_SECRET,
  )

  rl.close()
}

main()
