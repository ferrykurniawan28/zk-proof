const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ethers } = require('ethers');
require('dotenv').config();

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css'
};

const server = http.createServer((req, res) => {
    // Handle config API
    if (req.url === '/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            verifierAddress: process.env.VERIFIER_ADDRESS,
            rpcUrl: process.env.LISK_SEPOLIA_RPC,
            chainId: parseInt(process.env.LISK_SEPOLIA_CHAIN_ID),
            privateKey: process.env.PRIVATE_KEY
        }));
        return;
    }
    
    // Handle proof generation API
    if (req.url === '/generate-proof' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { q1, q2, q3, q4, op, threshold } = JSON.parse(body);
                
                // Update Prover.toml
                const proverToml = `op = "${op}"\nq1 = "${q1}"\nq2 = "${q2}"\nq3 = "${q3}"\nq4 = "${q4}"\nthreshold = "${threshold}"\n`;
                fs.writeFileSync('./Prover.toml', proverToml);
                
                // Execute nargo
                console.log('Executing nargo...');
                try {
                    execSync('nargo execute', { cwd: __dirname, stdio: 'pipe' });
                } catch (nargoError) {
                    // Check if it's a constraint failure
                    const errorMsg = nargoError.stderr ? nargoError.stderr.toString() : nargoError.message;
                    if (errorMsg.includes('Failed constraint') || errorMsg.includes('Cannot satisfy constraint')) {
                        console.log('Constraint not satisfied - statement is false');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: false,
                            valid: false,
                            message: 'Statement is false: The constraint could not be satisfied with the given inputs.'
                        }));
                        return;
                    }
                    throw nargoError;
                }
                
                // Generate proof with bb
                console.log('Generating proof with bb...');
                execSync('bb prove -b ./target/hello_world.json -w ./target/hello_world.gz -o ./target --oracle_hash keccak', { cwd: __dirname });
                
                // Read proof
                const proofHex = fs.readFileSync('./target/proof').toString('hex');
                const proof = '0x' + proofHex;
                
                // Format public inputs
                const publicInputs = [
                    ethers.zeroPadValue(ethers.toBeHex(parseInt(op)), 32),
                    ethers.zeroPadValue(ethers.toBeHex(parseInt(threshold)), 32)
                ];
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true,
                    proof, 
                    publicInputs 
                }));
            } catch (error) {
                console.error('Error generating proof:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error generating proof: ' + error.message);
            }
        });
        return;
    }

    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Open this URL in your browser to use the Noir verifier');
});
