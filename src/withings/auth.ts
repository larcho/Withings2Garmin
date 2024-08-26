import axios, {AxiosError} from 'axios'
import {WithingsError} from './exceptions'
import {OAuth2Token, iOAuth2Token} from './authtokens'

const CONSUMER_URL =
  'https://withings2garmin.s3.amazonaws.com/withings_consumer.json'
// From Jaros Withings-Sync
const WITHINGS_CALLBACK_URL =
  'https://jaroslawhartman.github.io/withings-sync/contrib/withings.html'
const AUTHORIZE_URL = 'https://account.withings.com/oauth2_user/authorize2'
const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2'

const sleep = async (milliseconds: number) =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })

export default class WithingsAuth {
  private consumerKey?: string
  private consumerSecret?: string

  constructor() {
    axios
      .get(CONSUMER_URL)
      .then(response => {
        const {consumer_key, consumer_secret} = response.data
        this.consumerKey = consumer_key
        this.consumerSecret = consumer_secret
      })
      .catch(error => {
        throw new WithingsError('Unable to fetch consumer data', error)
      })
  }

  public async getAuthenticationURL(): Promise<string> {
    while (!this.consumerKey) {
      await sleep(100)
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.consumerKey,
      state: 'OK',
      scope: 'user.metrics',
      redirect_uri: WITHINGS_CALLBACK_URL,
    })
    const url = `${AUTHORIZE_URL}?${params.toString()}`
    return url
  }

  public async getAccessToken(
    authenticationCode: string,
  ): Promise<OAuth2Token> {
    while (!this.consumerKey || !this.consumerSecret) {
      await sleep(100)
    }
    try {
      const params = new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: this.consumerKey,
        client_secret: this.consumerSecret,
        code: authenticationCode,
        redirect_uri: WITHINGS_CALLBACK_URL,
      })
      const response = await axios.post(TOKEN_URL, params)
      const {body} = response.data as {status: number; body: iOAuth2Token}
      return new OAuth2Token(
        body.userid,
        body.access_token,
        body.refresh_token,
        body.scope,
        body.expires_in,
        body.token_type,
      )
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new WithingsError('Error in request', error)
      } else {
        throw error
      }
    }
  }
}
