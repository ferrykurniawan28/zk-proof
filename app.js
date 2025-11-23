import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.0/+esm';

// Contract ABI for HonkVerifier
const VERIFIER_ABI = [
    "function verify(bytes calldata, bytes32[] calldata) external view returns (bool)"
];

// Config loaded from server
let VERIFIER_ADDRESS;
let LISK_SEPOLIA_RPC;
let LISK_SEPOLIA_CHAIN_ID;
let PRIVATE_KEY;

const dummydata = {
    q1: "50000000",
    q2: "30000000",
    q3: "20000000",
    q4: "10000000",
}

let provider;
let signer;

// Load configuration from server
async function loadConfig() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        VERIFIER_ADDRESS = config.verifierAddress;
        LISK_SEPOLIA_RPC = config.rpcUrl;
        LISK_SEPOLIA_CHAIN_ID = config.chainId;
        PRIVATE_KEY = config.privateKey;
    } catch (error) {
        console.error('Failed to load config:', error);
        throw error;
    }
}

// Initialize wallet with private key
async function initWallet() {
    try {
        showStatus('Connecting to Lisk Sepolia...', 'loading');
        
        provider = new ethers.JsonRpcProvider(LISK_SEPOLIA_RPC);
        signer = new ethers.Wallet(PRIVATE_KEY, provider);
        
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        
        document.getElementById('walletAddress').textContent = 
            address.slice(0, 6) + '...' + address.slice(-4) + 
            ' (Balance: ' + ethers.formatEther(balance) + ' ETH)';
        
        showStatus('Wallet connected successfully!', 'success');
        console.log('Connected address:', address);
    } catch (error) {
        showStatus('Error connecting wallet: ' + error.message, 'error');
        console.error('Connection error:', error);
    }
}

// Verify on-chain
async function verifyOnChain() {
    if (!signer) {
        showStatus('Wallet not initialized!', 'error');
        return;
    }

    try {
        showStatus('Verifying proof on-chain...', 'loading');
        
        const proofInput = document.getElementById('proofInput').value.trim();
        const publicInput1 = document.getElementById('publicInput1').value.trim();
        const publicInput2 = document.getElementById('publicInput2').value.trim();
        
        if (!proofInput || !publicInput1 || !publicInput2) {
            showStatus('Please fill in all proof data fields!', 'error');
            return;
        }
        
        const verifier = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, signer);
        
        // Convert proof to bytes
        const proofBytes = proofInput.startsWith('0x') ? proofInput : '0x' + proofInput;
        
        // Public inputs array
        const publicInputsBytes32 = [
            publicInput1.startsWith('0x') ? publicInput1 : '0x' + publicInput1,
            publicInput2.startsWith('0x') ? publicInput2 : '0x' + publicInput2
        ];
        
        console.log('Proof:', proofBytes);
        console.log('Public Inputs:', publicInputsBytes32);
        console.log('Proof length:', proofBytes.length);
        
        // Call verify function
        const tx = await verifier.verify(proofBytes, publicInputsBytes32);
        console.log('Transaction sent:', tx);
        
        // For view functions, the result is returned directly
        const result = tx;
        
        document.getElementById('result').className = result ? 'info success' : 'info error';
        document.getElementById('result').innerHTML = 
            '<strong>Verification Result:</strong> ' + (result ? '✅ VALID' : '❌ INVALID') + '<br>' +
            '<strong>Proof verified on Lisk Sepolia!</strong>';
        
        document.getElementById('resultSection').style.display = 'block';
        showStatus('Verification complete!', 'success');
    } catch (error) {
        showStatus('Error verifying proof: ' + error.message, 'error');
        console.error(error);
        
        document.getElementById('result').className = 'info error';
        document.getElementById('result').innerHTML = 
            '<strong>Verification Failed:</strong><br>' + error.message;
        document.getElementById('resultSection').style.display = 'block';
    }
}

// Show status message
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}

// Generate proof and verify
async function generateAndVerify() {
    if (!signer) {
        showStatus('Wallet not initialized!', 'error');
        return;
    }

    try {
        // Use dummy data for private quarterly expenses
        const q1 = dummydata.q1;
        const q2 = dummydata.q2;
        const q3 = dummydata.q3;
        const q4 = dummydata.q4;
        
        // Get public inputs from user
        const op = document.getElementById('op').value;
        const threshold = document.getElementById('threshold').value;

        showStatus('Generating proof... This will take about a minute...', 'loading');

        // Call backend API to generate proof
        const response = await fetch('/generate-proof', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q1, q2, q3, q4, op, threshold })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const data = await response.json();
        
        const sum = parseInt(q1) + parseInt(q2) + parseInt(q3) + parseInt(q4);
        const opText = op == 0 ? '>=' : '<=';
        
        // Check if statement is false (constraint not satisfied)
        if (data.success === false || data.valid === false) {
            document.getElementById('result').className = 'info error';
            document.getElementById('result').innerHTML = 
                '<strong>Verification Result:</strong> ❌ FALSE<br>' +
                '<strong>The statement is false!</strong><br><br>' +
                'Sum: ' + q1 + ' + ' + q2 + ' + ' + q3 + ' + ' + q4 + ' = ' + sum + '<br>' +
                'Operation: ' + opText + '<br>' +
                'Threshold: ' + threshold + '<br><br>' +
                'Evaluation: ' + sum + ' ' + opText + ' ' + threshold + ' = <strong>FALSE</strong><br>' +
                '<em>Cannot generate a valid proof for a false statement.</em>';
            
            document.getElementById('resultSection').style.display = 'block';
            showStatus('Statement is false - no valid proof can be generated', 'error');
            return;
        }
        
        const { proof, publicInputs } = data;
        
        // Display proof
        document.getElementById('proofData').textContent = 
            'Proof: ' + proof.slice(0, 100) + '...\n' +
            'Public Inputs:\n  op: ' + publicInputs[0] + '\n  threshold: ' + publicInputs[1];
        
        document.getElementById('proofSection').style.display = 'block';
        
        showStatus('Proof generated! Now verifying on-chain...', 'loading');

        // Verify on-chain
        const verifier = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, signer);
        
        console.log('Proof:', proof);
        console.log('Public Inputs:', publicInputs);
        
        // Call verify function (it's a view function, returns boolean)
        const result = await verifier.verify(proof, publicInputs);
        
        // If valid, also send a transaction to record it on-chain (optional)
        let txLink = '';
        if (result) {
            try {
                // Send transaction by calling a write function if available
                // For now, just show the result without transaction
                txLink = '<br><em>Note: verify() is a view function (read-only, no transaction created)</em>';
            } catch (e) {
                txLink = '';
            }
        }
        
        document.getElementById('result').className = result ? 'info success' : 'info error';
        document.getElementById('result').innerHTML = 
            '<strong>Verification Result:</strong> ' + (result ? '✅ VALID' : '❌ INVALID') + '<br>' +
            '<strong>Proof verified on Lisk Sepolia!</strong><br><br>' +
            'Sum: ' + q1 + ' + ' + q2 + ' + ' + q3 + ' + ' + q4 + ' = ' + sum + '<br>' +
            'Operation: ' + opText + '<br>' +
            'Threshold: ' + threshold + '<br><br>' +
            'Evaluation: ' + sum + ' ' + opText + ' ' + threshold + ' = <strong>TRUE</strong>' + txLink;
        
        document.getElementById('resultSection').style.display = 'block';
        showStatus('Verification complete!', 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
        console.error(error);
        
        document.getElementById('result').className = 'info error';
        document.getElementById('result').innerHTML = 
            '<strong>Verification Failed:</strong><br>' + error.message;
        document.getElementById('resultSection').style.display = 'block';
    }
}

// Event listeners
document.getElementById('generateProof').addEventListener('click', generateAndVerify);

// Initialize wallet on page load
window.addEventListener('load', async () => {
    await loadConfig();
    await initWallet();
});
