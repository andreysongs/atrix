import { readFileSync } from "node:fs";

const file = process.argv[2];
const packageNeedle = process.argv[3] || "Lcom/kotlin/mNative/";
if (!file) throw new Error("Usage: node scripts/analyze-dex.mjs <classes.dex> [package descriptor]");
const bytes = readFileSync(file);
const u16 = (offset) => bytes.readUInt16LE(offset);
const u32 = (offset) => bytes.readUInt32LE(offset);
const readUleb = (start) => {
  let value = 0;
  let shift = 0;
  let offset = start;
  let octet;
  do {
    octet = bytes[offset++];
    value |= (octet & 0x7f) << shift;
    shift += 7;
  } while (octet & 0x80);
  return { value: value >>> 0, offset };
};

const strings = [];
const stringCount = u32(0x38);
const stringTable = u32(0x3c);
for (let index = 0; index < stringCount; index += 1) {
  let offset = u32(stringTable + index * 4);
  offset = readUleb(offset).offset;
  let end = offset;
  while (bytes[end] !== 0) end += 1;
  strings.push(bytes.subarray(offset, end).toString("utf8"));
}

const typeCount = u32(0x40);
const typeTable = u32(0x44);
const types = Array.from({ length: typeCount }, (_, index) => strings[u32(typeTable + index * 4)]);
const methodCount = u32(0x58);
const methodTable = u32(0x5c);
const methods = Array.from({ length: methodCount }, (_, index) => {
  const offset = methodTable + index * 8;
  return { owner: types[u16(offset)], name: strings[u32(offset + 4)] };
});

function parseEncodedMethods(offset, count, owner, output) {
  let methodIndex = 0;
  for (let index = 0; index < count; index += 1) {
    const methodDiff = readUleb(offset); offset = methodDiff.offset; methodIndex += methodDiff.value;
    const access = readUleb(offset); offset = access.offset;
    const code = readUleb(offset); offset = code.offset;
    if (!code.value || !methods[methodIndex]?.owner?.startsWith(owner)) continue;
    const instructionCount = u32(code.value + 12);
    const instructionOffset = code.value + 16;
    const literals = new Set();
    for (let unit = 0; unit < instructionCount; unit += 1) {
      const opcode = u16(instructionOffset + unit * 2) & 0xff;
      if (opcode === 0x1a && unit + 1 < instructionCount) {
        const stringIndex = u16(instructionOffset + (unit + 1) * 2);
        if (strings[stringIndex]) literals.add(strings[stringIndex]);
      }
      if (opcode === 0x1b && unit + 2 < instructionCount) {
        const stringIndex = u16(instructionOffset + (unit + 1) * 2) | (u16(instructionOffset + (unit + 2) * 2) << 16);
        if (strings[stringIndex]) literals.add(strings[stringIndex]);
      }
    }
    output.push({ method: methods[methodIndex].name, literals: [...literals] });
  }
  return offset;
}

const classCount = u32(0x60);
const classTable = u32(0x64);
for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
  const definition = classTable + classIndex * 32;
  const descriptor = types[u32(definition)];
  const classDataOffset = u32(definition + 24);
  if (!descriptor?.startsWith(packageNeedle) || !classDataOffset) continue;
  let cursor = classDataOffset;
  const staticFields = readUleb(cursor); cursor = staticFields.offset;
  const instanceFields = readUleb(cursor); cursor = instanceFields.offset;
  const directMethods = readUleb(cursor); cursor = directMethods.offset;
  const virtualMethods = readUleb(cursor); cursor = virtualMethods.offset;
  for (let field = 0; field < staticFields.value + instanceFields.value; field += 1) {
    cursor = readUleb(cursor).offset;
    cursor = readUleb(cursor).offset;
  }
  const output = [];
  cursor = parseEncodedMethods(cursor, directMethods.value, descriptor, output);
  parseEncodedMethods(cursor, virtualMethods.value, descriptor, output);
  console.log("\n" + descriptor);
  for (const item of output) {
    const relevant = item.literals.filter((value) => value.length < 500 && !value.startsWith("L"));
    if (relevant.length) console.log("  " + item.method + ": " + JSON.stringify(relevant));
  }
}
