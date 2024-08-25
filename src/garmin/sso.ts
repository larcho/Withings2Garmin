import Client from './http'
import {GarthError} from './exceptions'
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import axios from 'axios'
import {OAuth1Token} from './authtokens'

// From https://github.com/matin/garth
const CONSUMER_URL = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json'

const sleep = async (milliseconds: number) =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })

export default class GarminOAuth1Session {
  private client: Client
  private oauth?: OAuth
  private oauth1token?: OAuth1Token

  constructor(client: Client, oauth1token?: OAuth1Token) {
    this.client = client
    this.oauth1token = oauth1token

    axios.get(CONSUMER_URL).then(response => {
      const {consumer_key, consumer_secret} = response.data
      this.oauth = new OAuth({
        consumer: {key: consumer_key, secret: consumer_secret},
        signature_method: 'HMAC-SHA1',
        hash_function: (base_string, key) =>
          crypto.createHmac('sha1', key).update(base_string).digest('base64'),
      })
    })
  }

  async login(email: string, password: string) {
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

    this.oauth1token = await this.getOAuth1Token(ticket)
  }

  private getCSRFToken(html: string): string {
    const csrfRe = /name="_csrf"\s+value="(.+?)"/
    const match = csrfRe.exec(html)
    if (match?.length) {
      return match[1]
    } else {
      throw new GarthError('CSRF token not found')
    }
  }

  private assertTitle(html: string) {
    const titleRe = /<title>(.+?)<\/title>/
    const match = titleRe.exec(html)
    if (!match || !match.length || match[1] !== 'Success') {
      throw new GarthError('Login not succesful')
    }
  }

  private parseTickets(html: string): string {
    const ticketRe = /embed\?ticket=([^"]+)"/
    const match = ticketRe.exec(html)
    if (match?.length) {
      return match[1]
    } else {
      throw new GarthError('Ticket not found')
    }
  }

  private async getOAuth1Token(ticket: string): Promise<OAuth1Token> {
    const loginUrl = `https://sso.${this.client.domain}/sso/embed`
    const subdomain = 'connectapi'
    const path = `/oauth-service/oauth/preauthorized?ticket=${ticket}&login-url=${loginUrl}&accepts-mfa-tokens=true`
    const url = `https://${subdomain}.${this.client.domain}${path}`
    const requestData = {
      url,
      method: 'GET',
    }
    while (!this.oauth) {
      await sleep(100)
    }
    const headers = this.oauth.toHeader(this.oauth.authorize(requestData))

    await this.client.get({
      subdomain,
      path,
      config: {
        headers: {
          ...headers,
          'User-Agent': 'com.garmin.android.apps.connectmobile',
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
}
