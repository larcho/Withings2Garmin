import {
  SecretsManagerClient,
  UpdateSecretCommand,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'

export const AWS_WITHINGS_OAUTH_SECRET = 'WithingsOAuthSecret'
export const AWS_GARMIN_OAUTH1_SECRET = 'GarminOAuth1Secret'
export const AWS_GARMIN_OAUTH2_SECRET = 'GarminOAuth2Secret'

const secretsManagerClient = new SecretsManagerClient({})

export const setSecret = async (
  secret: string,
  resource:
    | typeof AWS_WITHINGS_OAUTH_SECRET
    | typeof AWS_GARMIN_OAUTH1_SECRET
    | typeof AWS_GARMIN_OAUTH2_SECRET,
) => {
  const command = new UpdateSecretCommand({
    SecretId: resource,
    SecretString: secret,
  })
  await secretsManagerClient.send(command)
}

export const getSecret = async (
  resource:
    | typeof AWS_WITHINGS_OAUTH_SECRET
    | typeof AWS_GARMIN_OAUTH1_SECRET
    | typeof AWS_GARMIN_OAUTH2_SECRET,
): Promise<string> => {
  const command = new GetSecretValueCommand({
    SecretId: resource,
  })
  const result = await secretsManagerClient.send(command)
  return result.SecretString || ''
}
