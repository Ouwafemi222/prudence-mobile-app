/**
 * Pure-logic tests for perceptual hash helpers (no browser Canvas required).
 * Run: node scripts/test-perceptual-hash.mjs
 */

function hammingDistance(a, b) {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  const ai = BigInt(`0x${a}`);
  const bi = BigInt(`0x${b}`);
  let xor = ai ^ bi;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

function binaryToHex64(bits) {
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function computeDHashFromGrayscale(gray) {
  const width = 9;
  const height = 8;
  if (gray.length !== width * height) return null;
  let bits = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const left = gray[y * width + x];
      const right = gray[y * width + x + 1];
      bits += left < right ? "1" : "0";
    }
  }
  return binaryToHex64(bits);
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ok: ${message}`);
  } else {
    failed += 1;
    console.error(`  FAIL: ${message}`);
  }
}

console.log("hammingDistance");
assert(hammingDistance("0000000000000000", "0000000000000000") === 0, "identical hashes distance 0");
assert(hammingDistance("0000000000000001", "0000000000000000") === 1, "one bit flip distance 1");
assert(hammingDistance("ffffffffffffffff", "0000000000000000") === 64, "opposite hashes distance 64");

console.log("computeDHashFromGrayscale");
const checkerboard = Array.from({ length: 72 }, (_, i) => ((Math.floor(i / 9) + (i % 9)) % 2 === 0 ? 0 : 255));
const stripes = Array.from({ length: 72 }, (_, i) => ((i % 9) < 4 ? 20 : 200));
const hashA = computeDHashFromGrayscale(checkerboard);
const hashB = computeDHashFromGrayscale(stripes);
assert(typeof hashA === "string" && hashA.length === 16, "checkerboard produces 16-char hex");
assert(typeof hashB === "string" && hashB.length === 16, "stripes produces valid hex");
assert(hashA !== hashB, "different patterns produce different hashes");

const noisyStripes = stripes.map((v, i) => v + (i % 7 === 0 ? 1 : 0));
const hashC = computeDHashFromGrayscale(noisyStripes);
const dist = hammingDistance(hashB, hashC);
assert(dist >= 0 && dist <= 12, `lightly noisy stripes distance ${dist} in expected range`);
assert(hammingDistance(hashB, hashB) === 0, "identical stripe hashes distance 0");

console.log("\n---");
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
  process.exit(0);
}
console.error(`${failed} test(s) failed, ${passed} passed.`);
process.exit(1);
