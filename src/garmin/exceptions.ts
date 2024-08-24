import {AxiosError} from 'axios'

export class GarthError extends Error {
  public error?: AxiosError

  constructor(message: string, error?: AxiosError) {
    super(message)
    this.error = error
  }
}
