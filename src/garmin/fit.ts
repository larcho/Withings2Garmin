// FROM https://github.com/jaroslawhartman/withings-sync/blob/master/withings_sync/fit.py

const _calcCRC = (crc: number, byte: number): number => {
  const table: number[] = [
    0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001,
    0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
  ]

  // compute checksum of lower four bits of byte
  let tmp = table[crc & 0xf]
  crc = (crc >> 4) & 0x0fff
  crc = crc ^ tmp ^ table[byte & 0xf]

  // now compute checksum of upper four bits of byte
  tmp = table[crc & 0xf]
  crc = (crc >> 4) & 0x0fff
  crc = crc ^ tmp ^ table[(byte >> 4) & 0xf]

  return crc
}

const _getFixedContent = (
  msgNumber: number,
  contentLength: number,
): Buffer => {
  const buffer = Buffer.alloc(5)
  buffer.writeUInt8(0, 0)
  buffer.writeUInt8(0, 1)
  buffer.writeUInt16LE(msgNumber, 2)
  buffer.writeUInt8(contentLength, 4)
  return buffer
}

class FitBaseType {
  // BaseType Definition
  static enum = {
    '#': 0,
    endian: 0,
    field: 0x00,
    name: 'enum',
    invalid: 0xff,
    size: 1,
  }
  static sint8 = {
    '#': 1,
    endian: 0,
    field: 0x01,
    name: 'sint8',
    invalid: 0x7f,
    size: 1,
  }
  static uint8 = {
    '#': 2,
    endian: 0,
    field: 0x02,
    name: 'uint8',
    invalid: 0xff,
    size: 1,
  }
  static sint16 = {
    '#': 3,
    endian: 1,
    field: 0x83,
    name: 'sint16',
    invalid: 0x7fff,
    size: 2,
  }
  static uint16 = {
    '#': 4,
    endian: 1,
    field: 0x84,
    name: 'uint16',
    invalid: 0xffff,
    size: 2,
  }
  static sint32 = {
    '#': 5,
    endian: 1,
    field: 0x85,
    name: 'sint32',
    invalid: 0x7fffffff,
    size: 4,
  }
  static uint32 = {
    '#': 6,
    endian: 1,
    field: 0x86,
    name: 'uint32',
    invalid: 0xffffffff,
    size: 4,
  }
  static string = {
    '#': 7,
    endian: 0,
    field: 0x07,
    name: 'string',
    invalid: 0x00,
    size: 1,
  }
  static float32 = {
    '#': 8,
    endian: 1,
    field: 0x88,
    name: 'float32',
    invalid: 0xffffffff,
    size: 2,
  }
  static float64 = {
    '#': 9,
    endian: 1,
    field: 0x89,
    name: 'float64',
    invalid: 0xfffffffffffff,
    size: 4,
  }
  static uint8z = {
    '#': 10,
    endian: 0,
    field: 0x0a,
    name: 'uint8z',
    invalid: 0x00,
    size: 1,
  }
  static uint16z = {
    '#': 11,
    endian: 1,
    field: 0x8b,
    name: 'uint16z',
    invalid: 0x0000,
    size: 2,
  }
  static uint32z = {
    '#': 12,
    endian: 1,
    field: 0x8c,
    name: 'uint32z',
    invalid: 0x00000000,
    size: 4,
  }
  static byte = {
    '#': 13,
    endian: 0,
    field: 0x0d,
    name: 'byte',
    invalid: 0xff,
    size: 1,
  } // array of byte, field is invalid if all bytes are invalid

  static pack(basetype: {[key: string]: any}, value: any): Buffer {
    const buffer = Buffer.alloc(basetype.size)
    switch (basetype['#']) {
      case 0:
        buffer.writeUInt8(value, 0)
        break
      case 1:
        buffer.writeInt8(value, 0)
        break
      case 2:
        buffer.writeUInt8(value, 0)
        break
      case 3:
        buffer.writeInt16LE(value, 0)
        break
      case 4:
        buffer.writeUInt16LE(value, 0)
        break
      case 5:
        buffer.writeInt32LE(value, 0)
        break
      case 6:
        buffer.writeUInt32LE(value, 0)
        break
      case 7:
        buffer.write(value, 0)
        break
      case 8:
        buffer.writeFloatLE(value, 0)
        break
      case 9:
        buffer.writeDoubleLE(value, 0)
        break
      case 10:
        buffer.writeUInt8(value, 0)
        break
      case 11:
        buffer.writeUInt16LE(value, 0)
        break
      case 12:
        buffer.writeUInt32LE(value, 0)
        break
      case 13:
        buffer.write(value, 0, 1, 'ascii')
        break
    }
    return buffer
  }
}

class Fit {
  static HEADER_SIZE = 12

  static GMSG_NUMS: {[key: string]: number} = {
    file_id: 0,
    device_info: 23,
    weight_scale: 30,
    file_creator: 49,
    blood_pressure: 51,
  }
}

class FitEncoder extends Fit {
  static FILE_TYPE = 9
  static LMSG_TYPE_FILE_INFO = 0
  static LMSG_TYPE_FILE_CREATOR = 1
  static LMSG_TYPE_DEVICE_INFO = 2

  protected buf: Buffer
  private device_info_defined: boolean

  constructor() {
    super()
    this.buf = Buffer.alloc(0)
    this.device_info_defined = false
    this.writeHeader() // create header first
  }

  toString(): string {
    const lines: string[] = []
    for (let i = 0; i < this.buf.length; i += 16) {
      const b = this.buf.slice(i, i + 16)
      lines.push([...b].map(c => c.toString(16).padStart(2, '0')).join(' '))
    }
    return lines.join('\n')
  }

  writeHeader(
    headerSize: number = Fit.HEADER_SIZE,
    protocolVersion: number = 16,
    profileVersion: number = 108,
    dataSize: number = 0,
    dataType: string = '.FIT',
  ): void {
    const s = Buffer.alloc(headerSize)
    s.writeUInt8(headerSize, 0)
    s.writeUInt8(protocolVersion, 1)
    s.writeUInt16LE(profileVersion, 2)
    s.writeUInt32LE(dataSize, 4)
    s.write(dataType, 8)
    this.buf = Buffer.concat([s, this.buf.slice(headerSize)])
  }

  protected _buildContentBlock(content: any[]): [Buffer, Buffer] {
    const fieldDefs: Buffer[] = []
    const values: Buffer[] = []

    for (const [num, basetype, value, scale] of content) {
      const s = Buffer.alloc(3)
      s.writeUInt8(num, 0)
      s.writeUInt8(basetype.size, 1)
      s.writeUInt8(basetype.field, 2)
      fieldDefs.push(s)
      let val = value
      if (val === null || val === undefined) {
        val = basetype.invalid
      } else if (scale !== null && scale !== undefined) {
        val *= scale
      }
      values.push(FitBaseType.pack(basetype, val))
    }

    return [Buffer.concat(fieldDefs), Buffer.concat(values)]
  }

  writeFileInfo(
    serialNumber: number | null = null,
    timeCreated: Date | number | null = null,
    manufacturer: number | null = null,
    product: number | null = null,
    number: number | null = null,
  ): void {
    if (!timeCreated) {
      timeCreated = new Date()
    }

    const content = [
      [3, FitBaseType.uint32z, serialNumber, null],
      [4, FitBaseType.uint32, this.timestamp(timeCreated), null],
      [1, FitBaseType.uint16, manufacturer, null],
      [2, FitBaseType.uint16, product, null],
      [5, FitBaseType.uint16, number, null],
      [0, FitBaseType.enum, FitEncoder.FILE_TYPE, null], // type
    ]

    const [fields, values] = this._buildContentBlock(content)

    const msgNumber = Fit.GMSG_NUMS['file_id']
    const fixedContent = _getFixedContent(msgNumber, content.length)

    this.buf = Buffer.concat([
      this.buf,
      this.recordHeader(true, FitEncoder.LMSG_TYPE_FILE_INFO),
      fixedContent,
      fields,
      this.recordHeader(false, FitEncoder.LMSG_TYPE_FILE_INFO),
      values,
    ])
  }

  writeFileCreator(
    softwareVersion: number | null = null,
    hardwareVersion: number | null = null,
  ): void {
    const content = [
      [0, FitBaseType.uint16, softwareVersion, null],
      [1, FitBaseType.uint8, hardwareVersion, null],
    ]

    const [fields, values] = this._buildContentBlock(content)

    const msgNumber = Fit.GMSG_NUMS['file_creator']
    const fixedContent = _getFixedContent(msgNumber, content.length)

    this.buf = Buffer.concat([
      this.buf,
      this.recordHeader(true, FitEncoder.LMSG_TYPE_FILE_CREATOR),
      fixedContent,
      fields,
      this.recordHeader(false, FitEncoder.LMSG_TYPE_FILE_CREATOR),
      values,
    ])
  }

  writeDeviceInfo(
    timestamp: Date,
    serialNumber: number | null = null,
    cumOperatingTime: number | null = null,
    manufacturer: number | null = null,
    product: number | null = null,
    softwareVersion: number | null = null,
    batteryVoltage: number | null = null,
    deviceIndex: number | null = null,
    deviceType: number | null = null,
    hardwareVersion: number | null = null,
    batteryStatus: number | null = null,
  ): void {
    const content = [
      [253, FitBaseType.uint32, this.timestamp(timestamp), 1],
      [3, FitBaseType.uint32z, serialNumber, 1],
      [7, FitBaseType.uint32, cumOperatingTime, 1],
      [8, FitBaseType.uint32, null, null], // unknown field(undocumented)
      [2, FitBaseType.uint16, manufacturer, 1],
      [4, FitBaseType.uint16, product, 1],
      [5, FitBaseType.uint16, softwareVersion, 100],
      [10, FitBaseType.uint16, batteryVoltage, 256],
      [0, FitBaseType.uint8, deviceIndex, 1],
      [1, FitBaseType.uint8, deviceType, 1],
      [6, FitBaseType.uint8, hardwareVersion, 1],
      [11, FitBaseType.uint8, batteryStatus, null],
    ]

    const [fields, values] = this._buildContentBlock(content)

    if (!this.device_info_defined) {
      const header = this.recordHeader(true, FitEncoder.LMSG_TYPE_DEVICE_INFO)
      const msgNumber = Fit.GMSG_NUMS['device_info']
      const fixedContent = _getFixedContent(msgNumber, content.length)
      this.buf = Buffer.concat([this.buf, header, fixedContent, fields])
      this.device_info_defined = true
    }

    const header = this.recordHeader(false, FitEncoder.LMSG_TYPE_DEVICE_INFO)
    this.buf = Buffer.concat([this.buf, header, values])
  }

  protected recordHeader(
    definition: boolean = false,
    lmsgType: number = 0,
  ): Buffer {
    let msg = 0
    if (definition) {
      msg = 1 << 6 // 6th bit is a definition message
    }
    const header = Buffer.alloc(1)
    header.writeUInt8(msg + lmsgType)
    return header
  }

  private crc(): Buffer {
    let crc = 0
    for (let i = 0; i < this.buf.length; i++) {
      const b = this.buf.readInt8(i)
      crc = _calcCRC(crc, b)
    }
    const crcBuffer = Buffer.alloc(2)
    crcBuffer.writeUint16LE(crc)
    return crcBuffer
  }

  finish(): void {
    const dataSize = this.getSize() - Fit.HEADER_SIZE
    this.writeHeader(Fit.HEADER_SIZE, 16, 108, dataSize)
    const crc = this.crc()
    this.buf = Buffer.concat([this.buf, crc])
  }

  getSize(): number {
    return this.buf.length
  }

  getValue(): Buffer {
    return this.buf
  }

  protected timestamp(t: Date | number): number {
    const FIT_EPOCH = 631065600 // UTC 00:00 Dec 31 1989
    if (t instanceof Date) {
      return Math.floor(t.getTime() / 1000) - FIT_EPOCH
    } else {
      return t - FIT_EPOCH
    }
  }
}

export class FitEncoderBloodPressure extends FitEncoder {
  // Here might be dragons - no idea what lmsg stand for, found 14 somewhere in the deepest web
  static readonly LMSG_TYPE_BLOOD_PRESSURE = 14

  private blood_pressure_monitor_defined: boolean

  constructor() {
    super()
    this.blood_pressure_monitor_defined = false
  }

  writeBloodPressure(
    timestamp: Date | number,
    diastolicBloodPressure: number | null = null,
    systolicBloodPressure: number | null = null,
    meanArterialPressure: number | null = null,
    map3SampleMean: number | null = null,
    mapMorningValues: number | null = null,
    mapEveningValues: number | null = null,
    heartRate: number | null = null,
  ): void {
    // BLOOD PRESSURE FILE MESSAGES
    const content = [
      [253, FitBaseType.uint32, this.timestamp(timestamp), 1],
      [0, FitBaseType.uint16, systolicBloodPressure, 1],
      [1, FitBaseType.uint16, diastolicBloodPressure, 1],
      [2, FitBaseType.uint16, meanArterialPressure, 1],
      [3, FitBaseType.uint16, map3SampleMean, 1],
      [4, FitBaseType.uint16, mapMorningValues, 1],
      [5, FitBaseType.uint16, mapEveningValues, 1],
      [6, FitBaseType.uint8, heartRate, 1],
    ]

    const [fields, values] = this._buildContentBlock(content)

    if (!this.blood_pressure_monitor_defined) {
      const header = this.recordHeader(
        true,
        FitEncoderBloodPressure.LMSG_TYPE_BLOOD_PRESSURE,
      )
      const msgNumber = Fit.GMSG_NUMS['blood_pressure']
      const fixedContent = _getFixedContent(msgNumber, content.length)

      this.buf = Buffer.concat([this.buf, header, fixedContent, fields])
      this.blood_pressure_monitor_defined = true
    }

    const header = this.recordHeader(
      false,
      FitEncoderBloodPressure.LMSG_TYPE_BLOOD_PRESSURE,
    )
    this.buf = Buffer.concat([this.buf, header, values])
  }
}

export class FitEncoderWeight extends FitEncoder {
  static readonly LMSG_TYPE_WEIGHT_SCALE = 3

  private weight_scale_defined: boolean

  constructor() {
    super()
    this.weight_scale_defined = false
  }

  writeWeightScale(
    timestamp: Date,
    weight: number,
    percentFat: number | null = null,
    percentHydration: number | null = null,
    visceralFatMass: number | null = null,
    boneMass: number | null = null,
    muscleMass: number | null = null,
    basalMet: number | null = null,
    activeMet: number | null = null,
    physiqueRating: number | null = null,
    metabolicAge: number | null = null,
    visceralFatRating: number | null = null,
    bmi: number | null = null,
  ): void {
    const content = [
      [253, FitBaseType.uint32, this.timestamp(timestamp), 1],
      [0, FitBaseType.uint16, weight, 100],
      [1, FitBaseType.uint16, percentFat, 100],
      [2, FitBaseType.uint16, percentHydration, 100],
      [3, FitBaseType.uint16, visceralFatMass, 100],
      [4, FitBaseType.uint16, boneMass, 100],
      [5, FitBaseType.uint16, muscleMass, 100],
      [7, FitBaseType.uint16, basalMet, 4],
      [9, FitBaseType.uint16, activeMet, 4],
      [8, FitBaseType.uint8, physiqueRating, 1],
      [10, FitBaseType.uint8, metabolicAge, 1],
      [11, FitBaseType.uint8, visceralFatRating, 1],
      [13, FitBaseType.uint16, bmi, 10],
    ]

    const [fields, values] = this._buildContentBlock(content)

    if (!this.weight_scale_defined) {
      const header = this.recordHeader(
        true,
        FitEncoderWeight.LMSG_TYPE_WEIGHT_SCALE,
      )
      const msgNumber = Fit.GMSG_NUMS['weight_scale']
      const fixedContent = _getFixedContent(msgNumber, content.length)

      this.buf = Buffer.concat([this.buf, header, fixedContent, fields])
      this.weight_scale_defined = true
    }

    const header = this.recordHeader(
      false,
      FitEncoderWeight.LMSG_TYPE_WEIGHT_SCALE,
    )

    this.buf = Buffer.concat([this.buf, header, values])
  }
}
