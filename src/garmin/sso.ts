import Client from './http'
import {GarthError} from './exceptions'
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import axios from 'axios'
import {OAuth1Token, OAuth2Token, iOAuth2Token} from './authtokens'
import {sleep} from '../utils'

// From https://github.com/matin/garth
const CONSUMER_URL = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json'
const USER_AGENT = 'com.garmin.android.apps.connectmobile'

export default class GarminOAuth1Session {
  private client: Client
  private oAuth?: OAuth
  private oAuth1Token?: OAuth1Token

  constructor({
    client,
    oAuth1Token,
  }: {
    client?: Client
    oAuth1Token?: OAuth1Token
  } = {}) {
    this.client = client || new Client()
    this.oAuth1Token = oAuth1Token

    axios
      .get(CONSUMER_URL)
      .then(response => {
        const {consumer_key, consumer_secret} = response.data
        this.oAuth = new OAuth({
          consumer: {key: consumer_key, secret: consumer_secret},
          signature_method: 'HMAC-SHA1',
          hash_function: (base_string, key) =>
            crypto.createHmac('sha1', key).update(base_string).digest('base64'),
        })
      })
      .catch(error => {
        throw new GarthError('Unable to fetch consumer data', error)
      })
  }

  async login(
    email: string,
    password: string,
  ): Promise<{oAuth1Token: OAuth1Token; oAuth2Token: OAuth2Token}> {
    const ssoUrl = `https://sso.${this.client.domain}/sso`
    const ssoEmbedUrl = `${ssoUrl}/embed`
    const ssoEmbedParams = {
      id: 'gauth-widget',
      embedWidget: 'true',
      gauthHost: ssoUrl,
    }
    const signInParams = {
      ...ssoEmbedParams,
      gauthHost: ssoEmbedUrl,
      service: ssoEmbedUrl,
      source: ssoEmbedUrl,
      redirectAfterAccountLoginUrl: ssoEmbedUrl,
      redirectAfterAccountCreationUrl: ssoEmbedUrl,
    }

    // Set Cookie
    await this.client.get({
      subdomain: 'sso',
      path: '/sso/embed',
      params: ssoEmbedParams,
    })

    // Get CSRF Token
    await this.client.get({
      subdomain: 'sso',
      path: '/sso/signin',
      params: signInParams,
    })

    const csrfToken = this.getCSRFToken(this.client.lastResp?.data || '')

    // Submit login form with email and password
    await this.client.post({
      subdomain: 'sso',
      path: '/sso/signin',
      params: signInParams,
      data: {
        username: email,
        password,
        embed: 'true',
        _csrf: csrfToken,
      },
      config: {
        referrer: true,
      },
    })
    this.assertTitle(this.client.lastResp?.data || '')
    const ticket = this.parseTickets(this.client.lastResp?.data || '')

    const oAuth1Token = await this.getOAuth1Token(ticket)
    this.oAuth1Token = oAuth1Token
    const oAuth2Token = await this.exchangeToken()
    return {oAuth1Token, oAuth2Token}
  }

  private getCSRFToken(html: string): string {
    const csrfRe = /name="_csrf"\s+value="(.+?)"/
    const match = csrfRe.exec(html)
    if (match?.length) {
      return match[1]
    } else {
      throw new GarthError('CSRF token not found.')
    }
  }

  private assertTitle(html: string) {
    const titleRe = /<title>(.+?)<\/title>/
    const match = titleRe.exec(html)
    if (!match || !match.length || match[1] !== 'Success') {
      throw new GarthError('Unable to log in.')
    }
  }

  private parseTickets(html: string): string {
    const ticketRe = /embed\?ticket=([^"]+)"/
    const match = ticketRe.exec(html)
    if (match?.length) {
      return match[1]
    } else {
      throw new GarthError('Ticket not found.')
    }
  }

  private async getOAuth1Token(ticket: string): Promise<OAuth1Token> {
    const loginUrl = `https://sso.${this.client.domain}/sso/embed`
    const subdomain = 'connectapi'
    const path =
      '/oauth-service/oauth/preauthorized' +
      `?ticket=${ticket}&login-url=${loginUrl}&accepts-mfa-tokens=true`
    const url = `https://${subdomain}.${this.client.domain}${path}`
    const requestData = {
      url,
      method: 'GET',
    }
    while (!this.oAuth) {
      await sleep(100)
    }
    const headers = this.oAuth.toHeader(this.oAuth.authorize(requestData))

    await this.client.get({
      subdomain,
      path,
      config: {
        headers: {
          ...headers,
          'User-Agent': USER_AGENT,
        },
      },
    })
    const responseObject = String(this.client.lastResp!.data)
      .split('&')
      .reduce(
        (acc, pair: string) => {
          const [key, value] = pair.split('=')
          acc[key] = value
          return acc
        },
        {} as {[key: string]: string},
      )
    return new OAuth1Token(
      responseObject.oauth_token,
      responseObject.oauth_token_secret,
    )
  }

  public async exchangeToken(): Promise<OAuth2Token> {
    if (!this.oAuth1Token) {
      throw new GarthError('OAuth1Token not found.')
    }
    while (!this.oAuth) {
      await sleep(100)
    }
    const data = {}
    const subdomain = 'connectapi'
    const path = '/oauth-service/oauth/exchange/user/2.0'
    const url = `https://${subdomain}.${this.client.domain}${path}`
    const requestData = {
      url,
      method: 'POST',
      data,
    }
    const token = {
      key: this.oAuth1Token.oauth_token,
      secret: this.oAuth1Token.oauth_token_secret,
    }
    const headers = this.oAuth.toHeader(
      this.oAuth.authorize(requestData, token),
    )

    await this.client.post({
      subdomain,
      path,
      config: {
        headers: {
          ...headers,
          'User-Agent': USER_AGENT,
        },
      },
    })
    const {
      scope,
      jti,
      access_token,
      token_type,
      refresh_token,
      expires_in,
      refresh_token_expires_in,
    } = this.client.lastResp!.data as iOAuth2Token

    return new OAuth2Token(
      scope,
      jti,
      token_type,
      access_token,
      refresh_token,
      expires_in,
      refresh_token_expires_in,
    )
  }
}
