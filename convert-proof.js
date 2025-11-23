const fs = require('fs');
const { ethers } = require('ethers');

// Read and convert proof to bytes
const proofHex = fs.readFileSync('./target/proof').toString('hex');
const proof = '0x' + proofHex;

// Convert proof hex string to bytes array
const proofBytes = ethers.getBytes(proof);

console.log('Proof (hex):', proof);
console.log('Proof (bytes length):', proofBytes.length);

// Read public inputs from Prover.toml
const proverToml = fs.readFileSync('./Prover.toml', 'utf8');
const opMatch = proverToml.match(/op\s*=\s*"(\d+)"/);
const thresholdMatch = proverToml.match(/threshold\s*=\s*"(\d+)"/);

const op = opMatch ? parseInt(opMatch[1]) : 0;
const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : 0;

// Convert public inputs to bytes32 format
const publicInputs = [
  ethers.zeroPadValue(ethers.toBeHex(op), 32),        // op as bytes32
  ethers.zeroPadValue(ethers.toBeHex(threshold), 32)  // threshold as bytes32
];

console.log('\nPublic Inputs (bytes32[]):');
console.log('op:', publicInputs[0]);
console.log('threshold:', publicInputs[1]);

// Export formatted data for Solidity
console.log('\n=== For Contract Verification (Copy these values) ===');
console.log('\nproof (bytes):');
console.log(proof);

console.log('\npublicInputs (bytes32[] - NO COMMENTS):');
console.log('[');
console.log('  "' + publicInputs[0] + '",');
console.log('  "' + publicInputs[1] + '"');
console.log(']');

console.log('\n=== Alternative - Comma separated ===');
console.log('["' + publicInputs[0] + '", "' + publicInputs[1] + '"]');

console.log('\n=== For Solidity Code ===');
console.log('bytes memory proof = hex"' + proofHex + '";');
console.log('\nbytes32[] memory publicInputs = new bytes32[](2);');
console.log('publicInputs[0] = ' + publicInputs[0] + '; // op = ' + op);
console.log('publicInputs[1] = ' + publicInputs[1] + '; // threshold = ' + threshold);
