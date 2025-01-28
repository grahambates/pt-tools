import fs from "fs";
import { deserializeMod, serializeMod } from "../src/serializer";
import { CommandType } from "../src";

const { buffer } = fs.readFileSync(__dirname + "/example.mod");

describe("deserializeMod()", () => {
  const mod = deserializeMod(buffer);

  it("sets the name", () => {
    expect(mod.name).toContain("rink-a-dink");
  });

  it("sets the song length", () => {
    expect(mod.songLength).toBe(50);
  });

  it("sets the songPositions", () => {
    expect(mod.songPositions[0]).toBe(23);
    expect(mod.songPositions[1]).toBe(0);
    expect(mod.songPositions[2]).toBe(8);
  });

  it("sets sample data", () => {
    expect(mod.samples[0].name).toContain("Rink a Dink");
    expect(mod.samples[0].length).toBe(5170);
    expect(mod.samples[0].data).toHaveLength(5170);
  });

  it("sets pattern data", () => {
    const item1 = mod.patterns[0].channels[0].patternItems[0];
    const item2 = mod.patterns[0].channels[1].patternItems[32];

    expect(item1.sampleNumber).toBe(17);
    expect(item1.command).toBe(CommandType.SetSpeed);
    expect(item1.commandValue).toBe(3);
    expect(item1.period).toBe(214);

    expect(item2.sampleNumber).toBe(4);
    expect(item2.command).toBe(0);
    expect(item2.commandValue).toBe(0);
    expect(item2.period).toBe(214);
  });
});

describe("serializeMod()", () => {
  it("reserializes to match original data", () => {
    const mod = deserializeMod(buffer);
    const serialized = serializeMod(mod);
    expect(serialized).toEqual(Buffer.from(new Uint8Array(buffer)));
  });
});
