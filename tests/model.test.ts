import { Module, Pattern } from "../src/model";

describe("Module", () => {
  describe("constructor())", () => {
    const mod = new Module();

    it("has correct default properties", () => {
      expect(mod.name).toBe("");

      expect(mod.songLength).toBe(0);
      expect(mod.unknown).toBe(0);
      expect(mod.songPositions).toHaveLength(128);
      expect(mod.samples).toHaveLength(31);

      expect(mod.samples[0].data).toHaveLength(0);
      expect(mod.samples[0].length).toBe(0);
      expect(mod.samples[0].fineTune).toBe(0);
      expect(mod.samples[0].volume).toBe(0);
      expect(mod.samples[0].repeatStart).toBe(0);
      expect(mod.samples[0].repeatLength).toBe(0);
    });
  });

  describe("getSample()", () => {
    const mod = new Module();

    it("returns a valid sample slot", () => {
      const sample = mod.getSample(1);
      expect(sample).toBe(mod.samples[0]);
    });

    it("throws for index 0", () => {
      expect(() => {
        mod.getSample(0);
      }).toThrow();
    });

    it("throws for index > max", () => {
      expect(() => {
        mod.getSample(99);
      }).toThrow();
    });
  });

  describe("isPatternUsed()", () => {
    const mod = new Module();

    mod.songLength = 2;
    mod.songPositions[0] = 1;
    mod.songPositions[1] = 2;

    it("returns true for used patterns", () => {
      expect(mod.isPatternUsed(1)).toBe(true);
      expect(mod.isPatternUsed(2)).toBe(true);
    });

    it("returns false for unused patterns", () => {
      expect(mod.isPatternUsed(0)).toBe(false);
      expect(mod.isPatternUsed(3)).toBe(false);
    });
  });

  describe("removeUnusedPatterns()", () => {
    const mod = new Module();
    const p0 = new Pattern();
    const p1 = new Pattern();
    const p2 = new Pattern();
    const p3 = new Pattern();

    mod.patterns.push(p0, p1, p2, p3);

    mod.songLength = 3;
    mod.songPositions[0] = 0;
    mod.songPositions[1] = 3;
    mod.songPositions[2] = 2;

    mod.removeUnusedPatterns();

    it("has a patterns array length matching song length", () => {
      expect(mod.patterns).toHaveLength(3);
    });

    it("no longer includes the unused pattern", () => {
      expect(mod.patterns).not.toContain(p1);
    });

    it("still includes the used patterns in the correct order", () => {
      expect(mod.patterns[mod.songPositions[0]]).toBe(p0);
      expect(mod.patterns[mod.songPositions[1]]).toBe(p3);
      expect(mod.patterns[mod.songPositions[2]]).toBe(p2);
    });
  });

  test("isSampleUsed()", () => {
    const mod = new Module();
    const pattern = new Pattern();
    mod.patterns.push(pattern);
    pattern.channels[2].patternItems[16].sampleNumber = 4;

    expect(mod.isSampleUsed(4)).toBe(true);
    expect(mod.isSampleUsed(1)).toBe(false);
  });

  test("removeUnusedSamples()", () => {
    const mod = new Module();
    mod.patterns.push(new Pattern());
    // Make two samples not empty
    mod.samples[0].length = 100;
    mod.samples[1].length = 100;
    // Use one of them
    mod.patterns[0].channels[0].patternItems[32].sampleNumber = 2;

    mod.removeUnusedSamples();

    expect(mod.samples[0].length).toBe(0); // Unused
    expect(mod.samples[1].length).toBe(100); // Used
  });
});

describe("Pattern", () => {
  describe("constructor())", () => {
    const pattern = new Pattern();

    it("has correct default properties", () => {
      expect(pattern.channels).toHaveLength(4);
      expect(pattern.channels[0].patternItems).toHaveLength(64);
      expect(pattern.channels[0].patternItems[0].sampleNumber).toBe(0);
      expect(pattern.channels[0].patternItems[0].period).toBe(0);
      expect(pattern.channels[0].patternItems[0].command).toBe(0);
      expect(pattern.channels[0].patternItems[0].commandValue).toBe(0);
    });
  });

  test("isSampleUsed()", () => {
    const pattern = new Pattern();
    pattern.channels[2].patternItems[16].sampleNumber = 4;

    expect(pattern.isSampleUsed(4)).toBe(true);
    expect(pattern.isSampleUsed(1)).toBe(false);
  });
});
