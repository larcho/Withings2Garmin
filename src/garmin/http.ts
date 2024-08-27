import {OAuth2Token} from './authtokens'
import {GarthError} from './exceptions'
import axios, {AxiosInstance, AxiosResponse, AxiosError} from 'axios'
import qs from 'qs'

const USER_AGENT = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
}

interface iRequestOptions {
  path: string
  subdomain?: string
  api?: boolean
  params?: Record<string, string>
  data?: Record<string, string>
  buffer?: Buffer
  filename?: string
  config?: {
    api?: boolean
    referrer?: string | boolean
    headers?: Record<string, string>
  }
}

class Client {
  public sess: AxiosInstance
  public lastResp?: AxiosResponse
  public domain: string = 'garmin.com'
  private oAuth2Token?: OAuth2Token
  private timeout: number = 10000
  private retries: number = 3
  private statusForcelist: number[] = [408, 429, 500, 502, 503, 504]
  private backoffFactor: number = 0.5

  constructor({
    session,
    oAuth2Token,
    config,
  }: {
    session?: AxiosInstance
    oAuth2Token?: OAuth2Token
    config?: Record<string, any>
  } = {}) {
    this.sess = session || axios.create()
    this.sess.defaults.headers.common = USER_AGENT
    this.oAuth2Token = oAuth2Token
    this.configure({
      timeout: this.timeout,
      retries: this.retries,
      statusForcelist: this.statusForcelist,
      backoffFactor: this.backoffFactor,
      ...config,
    })
  }

  private configure(config: {
    domain?: string
    timeout?: number
    retries?: number
    statusForcelist?: number[]
    backoffFactor?: number
  }) {
    if (config.domain) this.domain = config.domain
    if (config.timeout) this.timeout = config.timeout
    if (config.retries) this.retries = config.retries
    if (config.statusForcelist) this.statusForcelist = config.statusForcelist
    if (config.backoffFactor) this.backoffFactor = config.backoffFactor
  }

  private async request(
    method: string,
    requestOptions: iRequestOptions,
  ): Promise<AxiosResponse> {
    const config = requestOptions.config || {}
    const api = requestOptions.api || false
    const url = new URL(
      requestOptions.path,
      new URL(`https://${requestOptions.subdomain || 'www'}.${this.domain}`),
    )
    const headers = {...config.headers}
    if (config.referrer && this.lastResp) {
      headers['referer'] = this.lastResp.config.url || ''
    }

    const data = requestOptions.data ? qs.stringify(requestOptions.data) : null
    if (data) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    const buffer = requestOptions.buffer
    if (buffer) {
      const filename = requestOptions.filename || ''
      headers['Content-Type'] = 'application/octet-stream'
      headers['Content-Length'] = buffer.length.toString()
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    if (api) {
      if (!this.oAuth2Token || this.oAuth2Token.expired) {
        throw new GarthError('Invalid OAuth2 token, or token expired.')
      }
      headers['Authorization'] = this.oAuth2Token.toString()
    }

    try {
      this.lastResp = await this.sess.request({
        method,
        url: url.toString(),
        headers,
        timeout: this.timeout,
        params: requestOptions.params || {},
        data: buffer || data,
        ...requestOptions.config,
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

  public async connectApi(
    method: string = 'GET',
    requestOptions: iRequestOptions,
  ): Promise<any | undefined> {
    const response = await this.request(method, {
      ...requestOptions,
      subdomain: 'connectapi',
      api: true,
    })
    if (response.status === 204) {
      return undefined
    } else {
      return response.data
    }
  }

  public async get(requestOptions: iRequestOptions): Promise<AxiosResponse> {
    return this.request('GET', requestOptions)
  }

  public async post(requestOptions: iRequestOptions): Promise<AxiosResponse> {
    return this.request('POST', requestOptions)
  }

  public async upload(
    buffer: Buffer,
    filename: string,
  ): Promise<any | undefined> {
    return this.connectApi('POST', {
      path: '/upload-service/upload',
      buffer,
      filename,
    })
  }
}

export default Client
