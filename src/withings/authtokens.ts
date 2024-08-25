export interface iOAuth2Token {
  userid: string
  access_token: string
  refresh_token: string
  scope: string
  expires_in: number
  token_type: string
}

export class OAuth2Token {
  readonly userid: string
  readonly access_token: string
  readonly refresh_token: string
  readonly scope: string
  readonly expires_in: number
  readonly expires_at: Date
  readonly token_type: string

  constructor(
    userid: string,
    access_token: string,
    refresh_token: string,
    scope: string,
    expires_in: number,
    token_type: string,
  ) {
    this.userid = userid
    this.access_token = access_token
    this.refresh_token = refresh_token
    this.scope = scope
    this.expires_in = expires_in
    this.token_type = token_type

    const now = new Date()
    this.expires_at = new Date(now.getTime() + expires_in * 1000)
  }

  get expired(): boolean {
    return this.expires_at < new Date()
  }

  toString(): string {
    return `${this.token_type.charAt(0).toUpperCase() + this.token_type.slice(1)} ${this.access_token}`
  }
}
