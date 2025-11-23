# Zero-Knowledge Proof: Private Expense Verification

A privacy-preserving zero-knowledge proof system for verifying quarterly expense statements without revealing the actual amounts. Built with Noir, Barretenberg, and deployed on Lisk Sepolia.

## 🎯 Overview

This project demonstrates how a company can prove statements about their quarterly expenses to investors without revealing the actual expense amounts:

- **Private Data**: Q1, Q2, Q3, Q4 quarterly expenses (kept secret)
- **Public Data**: Operation type and threshold value
- **Proof**: Cryptographic proof that `sum(Q1+Q2+Q3+Q4) ≥ threshold` or `sum ≤ threshold`

### Use Case Example

A company wants to prove to investors that their total expenses are below $110M without revealing:
- Individual quarterly breakdowns
- Exact total amount
- Department-specific spending

The investor only sees: "✅ Total expenses ≤ $110M" with cryptographic proof of validity.

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │─────▶│  Node Server │─────▶│  Noir Circuit   │
│   (UI)      │      │  (Express)   │      │   (main.nr)     │
└─────────────┘      └──────────────┘      └─────────────────┘
       │                     │                       │
       │                     ▼                       ▼
       │              ┌──────────────┐      ┌─────────────────┐
       │              │ Barretenberg │◀─────│  Witness File   │
       │              │ (bb prove)   │      │  (hello_world)  │
       │              └──────────────┘      └─────────────────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       └─────────────▶│   Contract   │
                      │ (Lisk Sepolia)│
                      └──────────────┘
```

### Components

1. **Noir Circuit** (`src/main.nr`): Zero-knowledge proof logic
2. **Node.js Server** (`server.js`): Proof generation API
3. **Web Frontend** (`index.html`, `app.js`): User interface
4. **Smart Contract**: On-chain HonkVerifier (UltraHonk proof system)

## 📋 Prerequisites

- **Noir** v1.0.0-beta.2 or higher
- **Barretenberg** (bb CLI)
- **Node.js** v18+ and npm
- **Lisk Sepolia Testnet** access with funded wallet

## 🚀 Installation

### 1. Clone and Install Dependencies

```bash
cd hello_world
npm install
```

### 2. Install Noir and Barretenberg

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Verify installation
nargo --version

# Barretenberg should be available as 'bb'
bb --version
```

### 3. Configure Environment

Create a `.env` file:

```env
VERIFIER_ADDRESS=0x9E7C8251F45C881D42957042224055d32445805C
LISK_SEPOLIA_RPC=https://rpc.sepolia-api.lisk.com
LISK_SEPOLIA_CHAIN_ID=4202
PRIVATE_KEY=your_private_key_here
```

⚠️ **Security**: Never commit `.env` to version control. The private key should have testnet funds only.

## 🔧 Project Structure

```
hello_world/
├── src/
│   └── main.nr              # Noir circuit (ZK proof logic)
├── target/
│   ├── hello_world.json     # Compiled circuit bytecode
│   └── Verifier.sol         # Generated Solidity verifier
├── Prover.toml              # Input values for proof generation
├── Nargo.toml               # Noir project config
├── server.js                # Express server (proof generation API)
├── app.js                   # Frontend logic (wallet, verification)
├── index.html               # Web UI
├── convert-proof.js         # Utility: Format proof for Solidity
├── .env                     # Environment configuration
└── README.md
```

## 💻 Usage

### Compile the Circuit

```bash
nargo compile
```

This generates `target/hello_world.json` bytecode.

### Run Tests

```bash
nargo test
```

Tests verify the circuit logic with sample inputs.

### Start the Server

```bash
node server.js
```

Server runs on `http://localhost:3000`

### Open the Web Interface

Navigate to `http://localhost:3000` in your browser.

### Generate and Verify a Proof

1. **Select Operation**:
   - `≥` (Greater or Equal): Prove sum ≥ threshold
   - `≤` (Less or Equal): Prove sum ≤ threshold

2. **Enter Threshold**: Public value to compare against (e.g., 100000000)

3. **Click "Generate Proof & Verify"**:
   - Server updates `Prover.toml` with inputs
   - Runs `nargo execute` to generate witness
   - Runs `bb prove` to create UltraHonk proof (~60 seconds)
   - Formats proof for Solidity contract
   - Calls on-chain `verify()` function
   - Displays result ✅ or ❌

## 🔐 Circuit Logic

### Private Inputs (Hidden)

```javascript
const dummydata = {
    q1: "50000000",  // Q1 expenses
    q2: "30000000",  // Q2 expenses
    q3: "20000000",  // Q3 expenses
    q4: "10000000"   // Q4 expenses
}
// Sum = 110,000,000
```

### Public Inputs (Visible to Verifier)

- **op**: Operation type (0 = ≥, 1 = ≤)
- **threshold**: Comparison value

### Noir Circuit (`src/main.nr`)

```noir
fn main(q1: u64, q2: u64, q3: u64, q4: u64, op: pub u64, threshold: pub u64) {
    let sum: u64 = q1 + q2 + q3 + q4;

    if op == 0 {
        assert(sum >= threshold);  // Prove sum ≥ threshold
    } else {
        assert(sum <= threshold);  // Prove sum ≤ threshold
    }
}
```

### Constraint Satisfaction

- **Assertion passes** → Proof generated → On-chain verification returns `true` ✅
- **Assertion fails** → No proof generated → Server returns `{success: false, valid: false}` ❌

## 🔄 API Endpoints

### POST `/generate-proof`

Generates a zero-knowledge proof for given inputs.

**Request Body:**
```json
{
  "q1": "50000000",
  "q2": "30000000",
  "q3": "20000000",
  "q4": "10000000",
  "op": "0",
  "threshold": "100000000"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "proof": "0x...",
  "publicInputs": [
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000005f5e100"
  ]
}
```

**Constraint Failure (200):**
```json
{
  "success": false,
  "valid": false,
  "message": "Statement is false: The constraint could not be satisfied with the given inputs."
}
```

### GET `/config`

Returns blockchain configuration.

**Response:**
```json
{
  "verifierAddress": "0x9E7C8251F45C881D42957042224055d32445805C",
  "rpcUrl": "https://rpc.sepolia-api.lisk.com",
  "chainId": 4202,
  "privateKey": "0x..."
}
```

## 🛠️ Manual Proof Generation

For debugging or testing without the web interface:

### 1. Edit Prover.toml

```toml
q1 = "50000000"
q2 = "30000000"
q3 = "20000000"
q4 = "10000000"
op = "0"
threshold = "100000000"
```

### 2. Generate Witness

```bash
nargo execute
```

Creates `target/hello_world.gz` witness file.

### 3. Generate Proof

```bash
bb prove -b ./target/hello_world.json -w ./target/hello_world.gz -o ./target/proof
```

Generates `target/proof` file (~60 seconds).

### 4. Format Proof for Solidity

```bash
node convert-proof.js
```

Outputs formatted proof and public inputs as JSON array.

### 5. Verify On-Chain (Optional)

Use the web interface or call the contract directly with ethers.js:

```javascript
const result = await verifier.verify(proofBytes, publicInputsBytes32);
console.log('Valid:', result); // true or false
```

## 🔍 Understanding the Proof

### What Gets Proven?

✅ **Proven**: The relationship between hidden sum and public threshold  
❌ **Not Revealed**: Q1, Q2, Q3, Q4 values or exact sum

### Example Scenarios

| Q1 | Q2 | Q3 | Q4 | Sum | Op | Threshold | Result |
|----|----|----|----|----|----|-----------| -------|
| 50M | 30M | 20M | 10M | 110M | ≥ | 100M | ✅ TRUE |
| 50M | 30M | 20M | 10M | 110M | ≥ | 150M | ❌ FALSE |
| 50M | 30M | 20M | 10M | 110M | ≤ | 120M | ✅ TRUE |
| 50M | 30M | 20M | 10M | 110M | ≤ | 100M | ❌ FALSE |

## 📊 Performance

- **Proof Generation**: ~60 seconds (UltraHonk backend)
- **On-chain Verification**: ~500ms (view function, no gas cost for queries)
- **Proof Size**: ~2.5KB

## 🔒 Security Considerations

### Privacy Guarantees

- ✅ Private inputs (Q1-Q4) never leave the prover's machine
- ✅ Proof reveals no information about private values
- ✅ Zero-knowledge property: Verifier learns only the statement truth

### Best Practices

1. **Never log private inputs** in production
2. **Secure the private key** - use hardware wallets for mainnet
3. **Validate inputs** before proof generation
4. **Rate limit** the API endpoint to prevent DoS
5. **Use HTTPS** in production

## 🌐 Deployment

### Deploy Verifier Contract

```bash
# Generate Solidity verifier
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol

# Deploy using Remix, Hardhat, or Foundry
```

Update `VERIFIER_ADDRESS` in `.env` with deployed contract address.

### Production Checklist

- [ ] Remove or secure all private keys
- [ ] Enable HTTPS with SSL certificate
- [ ] Add authentication to API endpoints
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Use environment-specific configs
- [ ] Test with mainnet before launch

## 🧪 Testing

### Unit Tests

```bash
nargo test
```

### Integration Test Flow

1. Start server: `node server.js`
2. Open browser: `http://localhost:3000`
3. Test true statement: sum=110M, threshold=100M, op=≥ → ✅
4. Test false statement: sum=110M, threshold=150M, op=≥ → ❌
5. Verify on-chain verification works

## 🐛 Troubleshooting

### Proof Generation Fails

```
Error: Failed constraint
```

**Solution**: The assertion failed. Check if your inputs satisfy the constraint (sum op threshold).

### Nargo Not Found

```
nargo: command not found
```

**Solution**: Install Noir with noirup, then restart terminal.

### BB Not Found

```
bb: command not found
```

**Solution**: Install Barretenberg CLI or ensure it's in PATH.

### Contract Call Fails

```
Error: insufficient funds for gas
```

**Solution**: Fund your wallet with Lisk Sepolia testnet ETH from a faucet.

### Server Port Already in Use

```
Error: listen EADDRINUSE :::3000
```

**Solution**: Kill existing process: `pkill -f "node server.js"` or use different port.

## 📚 Additional Resources

- [Noir Documentation](https://noir-lang.org/)
- [Barretenberg](https://github.com/AztecProtocol/barretenberg)
- [Lisk Sepolia Faucet](https://sepolia-faucet.lisk.com/)
- [Lisk Sepolia Explorer](https://sepolia-blockscout.lisk.com/)

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with Noir** 🖤 | **Verified on Lisk Sepolia** 🔗
