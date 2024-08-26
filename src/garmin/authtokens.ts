export class OAuth1Token {
  readonly oauth_token: string
  readonly oauth_token_secret: string
  readonly mfa_token?: string
  readonly mfa_expiration_timestamp?: Date
  readonly domain?: string

  constructor(
    oauth_token: string,
    oauth_token_secret: string,
    mfa_token?: string,
    mfa_expiration_timestamp?: Date,
    domain?: string,
  ) {
    this.oauth_token = oauth_token
    this.oauth_token_secret = oauth_token_secret
    this.mfa_token = mfa_token
    this.mfa_expiration_timestamp = mfa_expiration_timestamp
    this.domain = domain
  }
}

export interface iOAuth2Token {
  scope: string
  jti: string
  token_type: string
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_token_expires_in: number
}

export class OAuth2Token {
  readonly scope: string
  readonly jti: string
  readonly token_type: string
  readonly access_token: string
  readonly refresh_token: string
  readonly expires_in: number
  readonly expires_at: Date
  readonly refresh_token_expires_in: number
  readonly refresh_token_expires_at: Date

  constructor(
    scope: string,
    jti: string,
    token_type: string,
    access_token: string,
    refresh_token: string,
    expires_in: number,
    refresh_token_expires_in: number,
    expires_at?: string,
    refresh_token_expires_at?: string,
  ) {
    this.scope = scope
    this.jti = jti
    this.token_type = token_type
    this.access_token = access_token
    this.refresh_token = refresh_token
    this.expires_in = expires_in
    this.refresh_token_expires_in = refresh_token_expires_in

    const now = new Date()
    if(expires_at) {
      this.expires_at = new Date(expires_at)
    } else {
      this.expires_at = new Date(now.getTime() + expires_in * 1000)
    }
    if(refresh_token_expires_at) {
      this.refresh_token_expires_at = new Date(refresh_token_expires_at)
    } else {
      this.refresh_token_expires_at = new Date(
        now.getTime() + refresh_token_expires_in * 1000,
      )
    }
  }

  get expired(): boolean {
    return this.expires_at < new Date()
  }

  get refreshExpired(): boolean {
    return this.refresh_token_expires_at < new Date()
  }

  toString(): string {
    return `${this.token_type.charAt(0).toUpperCase() + this.token_type.slice(1)} ${this.access_token}`
  }
}
