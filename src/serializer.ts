import {
  CHANNELS,
  PATTERN_LENGTH,
  Module,
  Pattern,
  PatternItem,
  Sample,
} from "./model";

const TITLE_LENGTH = 20;
const TAG_LENGTH = 4;

// Deserialize:

class Reader {
  private offset = 0;
  private dataView: DataView;

  constructor(buffer: ArrayBuffer) {
    this.dataView = new DataView(buffer);
  }

  readUint8() {
    return this.dataView.getUint8(this.offset++);
  }

  readInt8() {
    return this.dataView.getInt8(this.offset++);
  }

  readUint16() {
    const value = this.dataView.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readSlice(length: number) {
    const slice = this.dataView.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  readAscii(length: number) {
    return new TextDecoder().decode(this.readSlice(length));
  }
}

export function deserializeMod(data: ArrayBufferLike): Module {
  const reader = new Reader(data);
  const module = new Module();

  // Title
  module.name = reader.readAscii(TITLE_LENGTH);

  // Samples
  module.samples = module.samples.map(() => deserializeSample(reader));

  module.songLength = reader.readUint8();
  module.unknown = reader.readUint8();

  // Song positions
  module.songPositions = module.songPositions.map(() => reader.readUint8());

  // Tag
  const tag = reader.readAscii(TAG_LENGTH);
  if (tag !== "M.K." && tag !== "M!K!") {
    throw new Error("File is not a ProTracker module");
  }

  // Patterns
  const maxUsedPatterns = Math.max(...module.songPositions);
  for (let i = 0; i <= maxUsedPatterns; i++) {
    module.patterns.push(deserializePattern(reader));
  }

  // Samples
  module.samples.forEach((sample) => {
    sample.data = new Uint8Array(reader.readSlice(sample.length));
  });

  return module;
}

function deserializeSample(reader: Reader): Sample {
  const sample = new Sample();
  sample.name = reader.readAscii(22);
  sample.length = reader.readUint16() * 2;
  sample.fineTune = reader.readInt8();
  sample.volume = reader.readUint8();
  sample.repeatStart = reader.readUint16() * 2;
  sample.repeatLength = reader.readUint16() * 2;
  return sample;
}

function deserializePattern(reader: Reader): Pattern {
  const pattern = new Pattern();
  for (let line = 0; line < PATTERN_LENGTH; line++) {
    for (let chan = 0; chan < CHANNELS; chan++) {
      const bytes = new Uint8Array(reader.readSlice(4));
      pattern.channels[chan].patternItems[line] = deserializePatternItem(bytes);
    }
  }
  return pattern;
}

function deserializePatternItem(data: Uint8Array): PatternItem {
  const item = new PatternItem();
  item.command = data[2] & 0x0f;
  item.commandValue = data[3];
  item.period = ((data[0] & 0x0f) << 8) + data[1];
  item.sampleNumber = (data[0] & 0xf0) + ((data[2] & 0xf0) >> 4);
  return item;
}

// Serialize:

class Writer {
  private buffers: Buffer[] = [];

  getBuffer(): Buffer {
    return Buffer.concat(this.buffers);
  }

  writeAscii(value: string, length: number) {
    const buffer = Buffer.alloc(length);
    buffer.write(value, 0, length, "ascii");
    this.writeBuffer(buffer);
  }

  writeUint16(value: number) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value);
    this.writeBuffer(buffer);
  }

  writeByte(value: number) {
    this.writeBuffer(Buffer.from([value]));
  }

  writeBuffer(value: Buffer) {
    this.buffers.push(value);
  }
}

export function serializeMod(module: Module): Buffer {
  const writer = new Writer();

  writer.writeAscii(module.name, TITLE_LENGTH);

  // Samples
  module.samples.forEach((s) => serializeSample(s, writer));

  writer.writeByte(module.songLength);
  writer.writeByte(module.unknown);

  // Positions
  for (const position of module.songPositions) {
    writer.writeByte(position);
  }

  // Tag
  writer.writeAscii(
    module.songPositions.some((pos) => pos > 63) ? "M!K!" : "M.K.",
    TAG_LENGTH,
  );

  // Patterns
  module.patterns.forEach((pattern) => {
    for (let line = 0; line < PATTERN_LENGTH; line++) {
      for (let chan = 0; chan < CHANNELS; chan++) {
        const item = pattern.channels[chan].patternItems[line];
        serializePatternItem(item, writer);
      }
    }
  });

  // Samples
  module.samples.forEach((sample) => {
    if (sample.length > 2) {
      writer.writeBuffer(Buffer.from(sample.data));
    }
  });

  return writer.getBuffer();
}

function serializeSample(sample: Sample, writer: Writer) {
  writer.writeAscii(sample.name, 22);
  writer.writeUint16(sample.length / 2);
  writer.writeByte(sample.fineTune);
  writer.writeByte(sample.volume);
  writer.writeUint16(sample.repeatStart / 2);
  writer.writeUint16(sample.repeatLength / 2);
}

function serializePatternItem(item: PatternItem, writer: Writer) {
  const buffer = Buffer.alloc(4);
  buffer[0] = (item.sampleNumber & 0xf0) + ((item.period & 0x0f00) >> 8);
  buffer[1] = item.period & 0x00ff;
  buffer[2] = (item.command as number) + ((item.sampleNumber & 0x0f) << 4);
  buffer[3] = item.commandValue;
  writer.writeBuffer(buffer);
}
