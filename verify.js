const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

// Configuration
const CONTRACT_ADDRESS = '0x1D283b668F947E03E8ac8ce8DA5505020434ea0E';
const API_KEY = 'WTPG4BQT475ETANPFF27MQ17VDXMXJWN1C';
const COMPILER_VERSION = 'v0.8.28+commit.7893614a';
const OPTIMIZATION = 1;
const RUNS = 1;

// Constructor arguments (ABI encoded)
const CONSTRUCTOR_ARGS = '0x0000000000000000000000004933134f4a1bd5abf0116ebaf770498d95a59bfe00000000000000000000000000000000000000000000000000000000000000000000000000000000000000004933134f4a1bd5abf0116ebaf770498d95a59bfe';

// Read contract files
const userVaultFactorySource = fs.readFileSync(
    path.join(__dirname, 'contracts', 'UserVaultFactory.sol'),
    'utf8'
);

const userVaultV3Source = fs.readFileSync(
    path.join(__dirname, 'contracts', 'userVaultV3Final.sol'),
    'utf8'
);

// Read interface files
const interfacesPath = path.join(__dirname, 'contracts', 'Interfaces');
const IAerodromeSource = fs.readFileSync(path.join(interfacesPath, 'IAerodrome.sol'), 'utf8');
const IMetaMorphoSource = fs.readFileSync(path.join(interfacesPath, 'IMetaMorpho.sol'), 'utf8');
const IBundlerSource = fs.readFileSync(path.join(interfacesPath, 'IBundler.sol'), 'utf8');
const IERC20ExtendedSource = fs.readFileSync(path.join(interfacesPath, 'IERC20Extended.sol'), 'utf8');
const IMerklDistributorSource = fs.readFileSync(path.join(interfacesPath, 'IMerklDistributor.sol'), 'utf8');

// Create the full source code with all files
const sourceCode = {
    language: 'Solidity',
    sources: {
        'contracts/UserVaultFactory.sol': {
            content: userVaultFactorySource
        },
        'contracts/userVaultV3Final.sol': {
            content: userVaultV3Source
        },
        'contracts/Interfaces/IAerodrome.sol': {
            content: IAerodromeSource
        },
        'contracts/Interfaces/IMetaMorpho.sol': {
            content: IMetaMorphoSource
        },
        'contracts/Interfaces/IBundler.sol': {
            content: IBundlerSource
        },
        'contracts/Interfaces/IERC20Extended.sol': {
            content: IERC20ExtendedSource
        },
        'contracts/Interfaces/IMerklDistributor.sol': {
            content: IMerklDistributorSource
        },
        '@openzeppelin/contracts/utils/ReentrancyGuard.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'ReentrancyGuard.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/access/Ownable.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'access', 'Ownable.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/utils/Pausable.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'Pausable.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/token/ERC20/IERC20.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'token', 'ERC20', 'IERC20.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'token', 'ERC20', 'utils', 'SafeERC20.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/utils/Context.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'Context.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'token', 'ERC20', 'extensions', 'IERC20Permit.sol'),
                'utf8'
            )
        },
        '@openzeppelin/contracts/utils/Address.sol': {
            content: fs.readFileSync(
                path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'Address.sol'),
                'utf8'
            )
        }
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: RUNS
        },
        evmVersion: 'cancun',
        viaIR: true,
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers']
            }
        }
    }
};

// Prepare the request data
const postData = querystring.stringify({
    apikey: API_KEY,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: CONTRACT_ADDRESS,
    sourceCode: JSON.stringify(sourceCode),
    codeformat: 'solidity-standard-json-input',
    contractname: 'contracts/UserVaultFactory.sol:UserVaultFactory',
    compilerversion: COMPILER_VERSION,
    constructorArguements: CONSTRUCTOR_ARGS
});

console.log('📝 Submitting contract verification to BaseScan...');
console.log('Contract Address:', CONTRACT_ADDRESS);
console.log('Compiler Version:', COMPILER_VERSION);
console.log('Optimization:', OPTIMIZATION);
console.log('Runs:', RUNS);
console.log('');

// Make the API request using V2 endpoint
const options = {
    hostname: 'api.basescan.org',
    path: '/v2/api',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const response = JSON.parse(data);
        console.log('Response:', JSON.stringify(response, null, 2));

        if (response.status === '1') {
            console.log('✅ Contract verification submitted successfully!');
            console.log('GUID:', response.result);
            console.log('');
            console.log('⏳ Checking verification status...');

            // Check status after a delay
            setTimeout(() => {
                checkStatus(response.result);
            }, 5000);
        } else {
            console.log('❌ Verification submission failed:', response.result);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error);
});

req.write(postData);
req.end();

// Function to check verification status
function checkStatus(guid) {
    const statusOptions = {
        hostname: 'api.basescan.org',
        path: `/v2/api?module=contract&action=checkverifystatus&guid=${guid}&apikey=${API_KEY}`,
        method: 'GET'
    };

    const statusReq = https.request(statusOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            const response = JSON.parse(data);
            console.log('Status Response:', JSON.stringify(response, null, 2));

            if (response.result.includes('Pending')) {
                console.log('⏳ Still pending... Checking again in 5 seconds...');
                setTimeout(() => checkStatus(guid), 5000);
            } else if (response.result.includes('Pass')) {
                console.log('✅ Contract verified successfully!');
                console.log(`View at: https://basescan.org/address/${CONTRACT_ADDRESS}#code`);
            } else {
                console.log('❌ Verification failed:', response.result);
            }
        });
    });

    statusReq.on('error', (error) => {
        console.error('❌ Error checking status:', error);
    });

    statusReq.end();
}