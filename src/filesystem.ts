import fs from "fs";
import { deserializeMod, serializeMod } from "./serializer";
import { Module } from "./model";

export function loadMod(filename: string): Module {
  const data = fs.readFileSync(filename);
  return deserializeMod(data.buffer);
}

export function saveMod(mod: Module, filename: string): void {
  return fs.writeFileSync(filename, serializeMod(mod));
}
