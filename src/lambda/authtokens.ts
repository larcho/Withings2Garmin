import {
  getSecret,
  setSecret,
  AWS_WITHINGS_OAUTH_SECRET,
  AWS_GARMIN_OAUTH1_SECRET,
  AWS_GARMIN_OAUTH2_SECRET,
} from '../utils'
import {OAuth2Token as WithingsOAuth2Token} from '../withings/authtokens'
import {
  OAuth2Token as GarminOAuth2Token,
  OAuth1Token as GarminOAuth1Token,
} from '../garmin/authtokens'
import WithingsAuth from '../withings/auth'
import GarminSSO from '../garmin/sso'

export default async (): Promise<{
  withingsOAuth2Token: WithingsOAuth2Token
  garminOAuth2Token: GarminOAuth2Token
}> => {
  // Withings
  const withingsOAuthBase64 = await getSecret(AWS_WITHINGS_OAUTH_SECRET)
  const withingsOAuthParsed = JSON.parse(
    Buffer.from(withingsOAuthBase64, 'base64').toString('utf8'),
  )
  let withingsOAuth2Token = new WithingsOAuth2Token(
    withingsOAuthParsed.userid,
    withingsOAuthParsed.access_token,
    withingsOAuthParsed.refresh_token,
    withingsOAuthParsed.scope,
    withingsOAuthParsed.expires_in,
    withingsOAuthParsed.token_type,
    withingsOAuthParsed.expires_at,
  )
  if (withingsOAuth2Token.expired) {
    const auth = new WithingsAuth()
    withingsOAuth2Token = await auth.refreshAccessToken(withingsOAuth2Token)
    await setSecret(
      Buffer.from(JSON.stringify(withingsOAuth2Token)).toString('base64'),
      AWS_WITHINGS_OAUTH_SECRET,
    )
  }

  // Garmin
  const garminOAuth2Base64 = await getSecret(AWS_GARMIN_OAUTH2_SECRET)
  const garminOAuth2Parsed = JSON.parse(
    Buffer.from(garminOAuth2Base64, 'base64').toString('utf8'),
  )
  let garminOAuth2Token = new GarminOAuth2Token(
    garminOAuth2Parsed.scope,
    garminOAuth2Parsed.jti,
    garminOAuth2Parsed.token_type,
    garminOAuth2Parsed.access_token,
    garminOAuth2Parsed.refresh_token,
    garminOAuth2Parsed.expires_in,
    garminOAuth2Parsed.refresh_token_expires_in,
    garminOAuth2Parsed.expires_at,
    garminOAuth2Parsed.refresh_token_expires_at,
  )
  if (garminOAuth2Token.expired) {
    const garminOAuth1Base64 = await getSecret(AWS_GARMIN_OAUTH1_SECRET)
    const garminOAuth1Parsed = JSON.parse(
      Buffer.from(garminOAuth1Base64, 'base64').toString('utf8'),
    )
    const garminOAuth1Token = new GarminOAuth1Token(
      garminOAuth1Parsed.oauth_token,
      garminOAuth1Parsed.oauth_token_secret,
    )
    const garminSSO = new GarminSSO({oAuth1Token: garminOAuth1Token})
    garminOAuth2Token = await garminSSO.exchangeToken()
    await setSecret(
      Buffer.from(JSON.stringify(garminOAuth2Token)).toString('base64'),
      AWS_GARMIN_OAUTH2_SECRET,
    )
  }

  return {withingsOAuth2Token, garminOAuth2Token}
}
