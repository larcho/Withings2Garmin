import axios, {AxiosError} from 'axios'
import {WithingsError} from './exceptions'
import {OAuth2Token} from './authtokens'

const GETMEAS_URL = 'https://wbsapi.withings.net/measure?action=getmeas'

interface iMeasureValue {
  value: number
  type: number
  unit: number
  algo: number
  fm: number
}

interface iMeasureItem {
  grpid: number
  attrib: number
  date: number
  created: number
  modified: number
  category: number
  deviceid: string
  hash_deviceid: string
  measures: iMeasureValue[]
  modelid: number
  model: string
  comment: string | null
}

interface iMeasureBody {
  updatetime: number
  timezone: string
  measuregrps: iMeasureItem[]
}

export default class WithingsMeasurements {
  private oAuth2Token: OAuth2Token

  constructor(oAuth2Token: OAuth2Token) {
    this.oAuth2Token = oAuth2Token
  }

  public async getMeasurements(): Promise<WithingsMeasureGroup[]> {
    try {
      const params = new URLSearchParams({
        access_token: this.oAuth2Token.access_token,
        category: '1',
        // TODO: Update with non hardcoded values
        startdate: '1722085489',
        enddate: '1724677556',
      })
      const response = await axios.post(GETMEAS_URL, params)
      const {body} = response.data as {status: number; body: iMeasureBody}
      return body.measuregrps.map(item => new WithingsMeasureGroup(item))
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(error)
        throw new WithingsError('Error in request', error)
      } else {
        throw error
      }
    }
  }
}

class WithingsMeasure {
  static TYPE_WEIGHT = 1
  static TYPE_HEIGHT = 4
  static TYPE_FAT_FREE_MASS = 5
  static TYPE_FAT_RATIO = 6
  static TYPE_FAT_MASS_WEIGHT = 8
  static TYPE_DIASTOLIC_BLOOD_PRESSURE = 9
  static TYPE_SYSTOLIC_BLOOD_PRESSURE = 10
  static TYPE_HEART_PULSE = 11
  static TYPE_TEMPERATURE = 12
  static TYPE_SP02 = 54
  static TYPE_BODY_TEMPERATURE = 71
  static TYPE_SKIN_TEMPERATURE = 73
  static TYPE_MUSCLE_MASS = 76
  static TYPE_HYDRATION = 77
  static TYPE_BONE_MASS = 88
  static TYPE_PULSE_WAVE_VELOCITY = 91
  static TYPE_VO2MAX = 123
  static TYPE_QRS_INTERVAL = 135
  static TYPE_PR_INTERVAL = 136
  static TYPE_QT_INTERVAL = 137
  static TYPE_CORRECTED_QT_INTERVAL = 138
  static TYPE_ATRIAL_FIBRILLATION_PPG = 139
  static TYPE_FAT_MASS_SEGMENTS = 174
  static TYPE_EXTRACELLULAR_WATER = 168
  static TYPE_INTRACELLULAR_WATER = 169
  static TYPE_VISCERAL_FAT = 170
  static TYPE_MUSCLE_MASS_SEGMENTS = 175
  static TYPE_VASCULAR_AGE = 155
  static TYPE_ATRIAL_FIBRILLATION = 130
  static TYPE_NERVE_HEALTH_LEFT_FOOT = 158
  static TYPE_NERVE_HEALTH_RIGHT_FOOT = 159
  static TYPE_NERVE_HEALTH_FEET = 167
  static TYPE_ELECTRODERMAL_ACTIVITY_FEET = 196
  static TYPE_ELECTRODERMAL_ACTIVITY_LEFT_FOOT = 197
  static TYPE_ELECTRODERMAL_ACTIVITY_RIGHT_FOOT = 198

  static withings_table = {
    [WithingsMeasure.TYPE_WEIGHT]: ['Weight', 'kg'],
    [WithingsMeasure.TYPE_HEIGHT]: ['Height', 'meter'],
    [WithingsMeasure.TYPE_FAT_FREE_MASS]: ['Fat Free Mass', 'kg'],
    [WithingsMeasure.TYPE_FAT_RATIO]: ['Fat Ratio', '%'],
    [WithingsMeasure.TYPE_FAT_MASS_WEIGHT]: ['Fat Mass Weight', 'kg'],
    [WithingsMeasure.TYPE_DIASTOLIC_BLOOD_PRESSURE]: [
      'Diastolic Blood Pressure',
      'mmHg',
    ],
    [WithingsMeasure.TYPE_SYSTOLIC_BLOOD_PRESSURE]: [
      'Systolic Blood Pressure',
      'mmHg',
    ],
    [WithingsMeasure.TYPE_HEART_PULSE]: ['Heart Pulse', 'bpm'],
    [WithingsMeasure.TYPE_TEMPERATURE]: ['Temperature', 'celsius'],
    [WithingsMeasure.TYPE_SP02]: ['SP02', '%'],
    [WithingsMeasure.TYPE_BODY_TEMPERATURE]: ['Body Temperature', 'celsius'],
    [WithingsMeasure.TYPE_SKIN_TEMPERATURE]: ['Skin Temperature', 'celsius'],
    [WithingsMeasure.TYPE_MUSCLE_MASS]: ['Muscle Mass', 'kg'],
    [WithingsMeasure.TYPE_HYDRATION]: ['Hydration', 'kg'],
    [WithingsMeasure.TYPE_BONE_MASS]: ['Bone Mass', 'kg'],
    [WithingsMeasure.TYPE_PULSE_WAVE_VELOCITY]: ['Pulse Wave Velocity', 'm/s'],
    [WithingsMeasure.TYPE_VO2MAX]: ['VO2 max', 'ml/min/kg'],
    [WithingsMeasure.TYPE_QRS_INTERVAL]: [
      'QRS interval duration based on ECG signal',
      'ms',
    ],
    [WithingsMeasure.TYPE_PR_INTERVAL]: [
      'PR interval duration based on ECG signal',
      'ms',
    ],
    [WithingsMeasure.TYPE_QT_INTERVAL]: [
      'QT interval duration based on ECG signal',
      'ms',
    ],
    [WithingsMeasure.TYPE_CORRECTED_QT_INTERVAL]: [
      'Corrected QT interval duration based on ECG signal',
      'ms',
    ],
    [WithingsMeasure.TYPE_ATRIAL_FIBRILLATION_PPG]: [
      'Atrial fibrillation result from PPG',
      'ms',
    ],
    [WithingsMeasure.TYPE_FAT_MASS_SEGMENTS]: [
      'Fat Mass for segments in mass unit',
      'kg',
    ],
    [WithingsMeasure.TYPE_EXTRACELLULAR_WATER]: ['Extracellular Water', 'kg'],
    [WithingsMeasure.TYPE_INTRACELLULAR_WATER]: ['Intracellular Water', 'kg'],
    [WithingsMeasure.TYPE_VISCERAL_FAT]: ['Extracellular Water', 'kg'],
    [WithingsMeasure.TYPE_MUSCLE_MASS_SEGMENTS]: [
      'Muscle Mass for segments in mass unit',
      'kg',
    ],
    [WithingsMeasure.TYPE_VASCULAR_AGE]: ['Vascular age', 'years'],
    [WithingsMeasure.TYPE_ATRIAL_FIBRILLATION]: [
      'Atrial fibrillation result',
      'ms',
    ],
    [WithingsMeasure.TYPE_NERVE_HEALTH_LEFT_FOOT]: [
      'Nerve Health Score left foot',
      '',
    ],
    [WithingsMeasure.TYPE_NERVE_HEALTH_RIGHT_FOOT]: [
      'Nerve Health Score right foot',
      '',
    ],
    [WithingsMeasure.TYPE_NERVE_HEALTH_FEET]: ['Nerve Health Score feet', ''],
    [WithingsMeasure.TYPE_ELECTRODERMAL_ACTIVITY_FEET]: [
      'Electrodermal activity feet',
      '',
    ],
    [WithingsMeasure.TYPE_ELECTRODERMAL_ACTIVITY_LEFT_FOOT]: [
      'Electrodermal activity left foot',
      '',
    ],
    [WithingsMeasure.TYPE_ELECTRODERMAL_ACTIVITY_RIGHT_FOOT]: [
      'Electrodermal activity right foot',
      '',
    ],
  }

  public value: number
  public type: number
  public unit: number
  public type_s: string
  public unit_s: string

  constructor(measure: iMeasureValue) {
    this.value = measure.value
    this.type = measure.type
    this.unit = measure.unit
    const tableEntry = WithingsMeasure.withings_table[this.type] || [
      'unknown',
      '',
    ]
    this.type_s = tableEntry[0]
    this.unit_s = tableEntry[1]
  }

  toString(): string {
    return `${this.type_s}: ${this.getValue()} ${this.unit_s}`
  }

  getValue(): number {
    return this.value * Math.pow(10, this.unit)
  }
}

class WithingsMeasureGroup {
  public grpid?: number
  attrib?: number
  date?: number
  category?: number
  measures: WithingsMeasure[]

  constructor(measuregrp: iMeasureItem) {
    this.grpid = measuregrp.grpid
    this.attrib = measuregrp.attrib
    this.date = measuregrp.date
    this.category = measuregrp.category
    this.measures = measuregrp.measures.map(
      (item: iMeasureValue) => new WithingsMeasure(item),
    )
  }

  get length(): number {
    return this.measures.length
  }

  get datetime(): Date | undefined {
    return this.date ? new Date(this.date * 1000) : undefined
  }

  private getMeasureValue(type: number): number | null {
    const measure = this.measures.find(m => m.type === type)
    return measure ? Math.round(measure.getValue() * 100) / 100 : null
  }

  get weight(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_WEIGHT)
  }

  get height(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_HEIGHT)
  }

  get fatFreeMass(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_FAT_FREE_MASS)
  }

  get fatRatio(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_FAT_RATIO)
  }

  get fatMassWeight(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_FAT_MASS_WEIGHT)
  }

  get diastolicBloodPressure(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_DIASTOLIC_BLOOD_PRESSURE)
  }

  get systolicBloodPressure(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_SYSTOLIC_BLOOD_PRESSURE)
  }

  get heartPulse(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_HEART_PULSE)
  }

  get temperature(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_TEMPERATURE)
  }

  get spO2(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_SP02)
  }

  get bodyTemperature(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_BODY_TEMPERATURE)
  }

  get skinTemperature(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_SKIN_TEMPERATURE)
  }

  get muscleMass(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_MUSCLE_MASS)
  }

  get hydration(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_HYDRATION)
  }

  get boneMass(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_BONE_MASS)
  }

  get pulseWaveVelocity(): number | null {
    return this.getMeasureValue(WithingsMeasure.TYPE_PULSE_WAVE_VELOCITY)
  }
}
