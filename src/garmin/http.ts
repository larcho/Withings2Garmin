import {OAuth1Token, OAuth2Token} from './authtokens'
import { GarthError } from './exceptions'
import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  AxiosProxyConfig,
} from 'axios'

const USER_AGENT = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
}

interface iRequestOptions {
  subdomain: string
  path: string
  params?: Record<string, string>
  data?: Record<string, string>
  config?: {
    api?: boolean
    referrer?: string | boolean
    headers?: Record<string, string>
  }
}

class Client {
  private sess: AxiosInstance
  public lastResp?: AxiosResponse
  public domain: string = 'garmin.com'
  private oauth1Token?: OAuth1Token
  private oauth2Token?: OAuth2Token
  private timeout: number = 10000
  private retries: number = 3
  private statusForcelist: number[] = [408, 429, 500, 502, 503, 504]
  private backoffFactor: number = 0.5
  private poolConnections: number = 10
  private poolMaxSize: number = 10
  private profile?: Record<string, any>

  constructor(session?: AxiosInstance, config: Record<string, any> = {}) {
    this.sess = session || axios.create()
    this.sess.defaults.headers.common = USER_AGENT
    this.configure({
      timeout: this.timeout,
      retries: this.retries,
      statusForcelist: this.statusForcelist,
      backoffFactor: this.backoffFactor,
      ...config,
    })
  }

  private configure(config: {
    oauth1Token?: OAuth1Token
    oauth2Token?: OAuth2Token
    domain?: string
    timeout?: number
    retries?: number
    statusForcelist?: number[]
    backoffFactor?: number
    poolConnections?: number
    poolMaxSize?: number
  }) {
    if (config.oauth1Token) this.oauth1Token = config.oauth1Token
    if (config.oauth2Token) this.oauth2Token = config.oauth2Token
    if (config.domain) this.domain = config.domain
    if (config.timeout) this.timeout = config.timeout
    if (config.retries) this.retries = config.retries
    if (config.statusForcelist) this.statusForcelist = config.statusForcelist
    if (config.backoffFactor) this.backoffFactor = config.backoffFactor
    if (config.poolConnections) this.poolConnections = config.poolConnections
    if (config.poolMaxSize) this.poolMaxSize = config.poolMaxSize
  }

  private async request(
    method: string,
    requestOptions: iRequestOptions,
  ): Promise<AxiosResponse> {
    const config = requestOptions.config || {}
    const url = new URL(
      requestOptions.path,
      new URL(`https://${requestOptions.subdomain}.${this.domain}`),
    )
    const headers = {...config.headers}
    if (config.referrer && this.lastResp) {
      headers['referer'] = this.lastResp.config.url || ''
    }

    try {
      this.lastResp = await this.sess.request({
        method,
        url: url.toString(),
        headers,
        timeout: this.timeout,
        params: requestOptions.params || {},
        data: requestOptions.data || {},
        ...requestOptions.config
      })
      return this.lastResp
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new GarthError('Error in request', error)
      } else {
        throw error
      }
    }
  }

  public async get(requestOptions: iRequestOptions): Promise<AxiosResponse> {
    return this.request('GET', requestOptions)
  }

  public async post(requestOptions: iRequestOptions): Promise<AxiosResponse> {
    return this.request('POST', requestOptions)
  }
}

export default Client
