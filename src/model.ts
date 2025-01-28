export const MAX_SAMPLES = 31;
export const MAX_POSITIONS = 128;
export const PATTERN_LENGTH = 64;
export const CHANNELS = 4;

export enum CommandType {
  ArpNone = 0x00,
  SlideUp = 0x01,
  SlideDown = 0x02,
  TonePortamento = 0x03,
  Vibrato = 0x04,
  TonePortamentoVolumeSlide = 0x05,
  VibratoVolumeSlide = 0x06,
  Tremolo = 0x07,
  UnusedSync = 0x08,
  SampleOffset = 0x09,
  VolumeSlide = 0x0a,
  PositionJump = 0x0b,
  SetVolume = 0x0c,
  PatternBreak = 0x0d,
  Extended = 0x0e,
  SetSpeed = 0x0f,
}

export class Module {
  name: string = "";
  samples: Sample[] = Array.from({ length: MAX_SAMPLES }, () => new Sample());
  songLength: number = 0;
  songPositions: number[] = Array(MAX_POSITIONS).fill(0);
  patterns: Pattern[] = [];
  unknown: number = 0;

  isPatternUsed(patternNumber: number): boolean {
    return this.songPositions.slice(0, this.songLength).includes(patternNumber);
  }

  isSampleUsed(sampleNumber: number): boolean {
    return this.patterns.some((p) => p.isSampleUsed(sampleNumber));
  }

  getSample(sampleNumber: number): Sample {
    if (sampleNumber < 1) {
      throw new Error("Sample numbers are 1 based index");
    }
    if (sampleNumber > MAX_SAMPLES) {
      throw new Error("Max sample number is " + MAX_SAMPLES);
    }
    return this.samples[sampleNumber - 1];
  }

  optimiseLoopedAllSamples(): void {
    this.samples.forEach((s) => s.optimiseLooped());
  }

  padAllSamples(sampleSize: number): void {
    this.samples.map((s) => s.pad(sampleSize));
  }

  zeroLeadingAllSamples(): void {
    this.samples.forEach((s) => s.zeroLeading());
  }

  removeUnusedSamples(): void {
    this.samples.forEach((sample, index) => {
      const sampleNumber = index + 1;
      if (!this.isSampleUsed(sampleNumber)) {
        this.getSample(sampleNumber).clear();
      }
    });
  }

  removeUnusedPatterns(): void {
    // Clear positions after song length
    for (let i = this.songLength; i < 128; i++) {
      this.songPositions[i] = 0;
    }

    const used = Array(100).fill(false);
    for (let i = 0; i < this.songLength; i++) {
      used[this.songPositions[i]] = true;
    }

    const findLastUsed = () => {
      for (let i = used.length - 1; i >= 0; i--) {
        if (used[i]) return i;
      }
      return -1;
    };

    for (let current = 0; current < used.length; current++) {
      if (!used[current]) {
        const lastUsed = findLastUsed();
        if (lastUsed > current) {
          this.patterns[current] = this.patterns[lastUsed];
          this.remapPattern(lastUsed, current);
          used[current] = true;
          used[lastUsed] = false;
        } else {
          break;
        }
      }
    }

    const maxUsedPattern = Math.max(...this.songPositions);
    this.patterns = this.patterns.slice(0, maxUsedPattern + 1);
  }

  remapPattern(source: number, dest: number): void {
    this.songPositions = this.songPositions.map((pos) =>
      pos === source ? dest : pos,
    );
  }
}

export class Pattern {
  channels: Channel[] = Array.from({ length: CHANNELS }, () => new Channel());

  isSampleUsed(sampleNumber: number): boolean {
    return this.channels.some((c) => c.isSampleUsed(sampleNumber));
  }
}

export class Channel {
  patternItems: PatternItem[] = Array.from(
    { length: PATTERN_LENGTH },
    () => new PatternItem(),
  );

  isSampleUsed(sampleNumber: number): boolean {
    return this.patternItems.some((i) => i.sampleNumber === sampleNumber);
  }
}

export class PatternItem {
  sampleNumber: number = 0;
  period: number = 0;
  command: CommandType = 0;
  commandValue: number = 0;
}

export class Sample {
  name: string = "";
  length: number = 0;
  fineTune: number = 0;
  volume: number = 0;
  repeatStart: number = 0;
  repeatLength: number = 0;
  data: Uint8Array = new Uint8Array();

  clear(): void {
    this.data = new Uint8Array(2);
    this.length = 0;
    this.repeatStart = 0;
    this.repeatLength = 2;
    this.fineTune = 0;
  }

  zeroLeading(): void {
    if (this.length > 2 && this.repeatLength === 2 && this.repeatStart === 0) {
      this.data[0] = 0;
      this.data[1] = 0;
    }
  }

  optimiseLooped(): void {
    if (this.repeatLength > 2) {
      const newLength = this.repeatStart + this.repeatLength;
      if (newLength < this.length) {
        this.data = this.data.slice(0, newLength);
        this.length = newLength;
      }
    }
  }

  truncateToLoop(): boolean {
    if (this.repeatLength > 2 && this.repeatStart > 2) {
      this.data = this.data.slice(
        this.repeatStart - 2,
        this.repeatStart - 2 + this.repeatLength + 2,
      );
      this.length = this.data.length;
      this.repeatStart = 2;
      return true;
    }
    return false;
  }

  pad(sampleSize: number): void {
    if (this.length <= 2) {
      return;
    }
    const newLength = Math.ceil(this.length / sampleSize) * sampleSize;
    const newData = new Uint8Array(newLength);
    let pos = 0;
    const repeatEnd = this.repeatStart + this.repeatLength;

    for (let i = 0; i < newLength; i++) {
      newData[i] = pos < this.data.length ? this.data[pos] : 0x00;
      pos++;
      if (this.repeatLength > 2 && pos === repeatEnd) {
        pos = this.repeatStart;
      }
    }
    this.length = newLength;
    this.data = newData;
  }
}
