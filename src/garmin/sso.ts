import Client from './http'
import {GarthError} from './exceptions'

export default class GarminOAuth1Session {
  private client: Client

  constructor(client: Client) {
    this.client = client
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

    console.log(ticket)
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
}
