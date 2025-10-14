const { ethers } = require('hardhat');

async function incrementNonce() {
    // Use environment variable for security
    const privateKey = process.env.PRIVATE_KEY;
    const provider = new ethers.JsonRpcProvider("https://mainnet.optimism.io");
    const signer = new ethers.Wallet(privateKey, provider);
    const currentNonce = await signer.getNonce();
    
    console.log(`Current nonce: ${currentNonce}`);
    console.log(`Target nonce: 19`);
    
    const transactionsNeeded = 19 - currentNonce;
    
    if (transactionsNeeded <= 0) {
        console.log('Already at or past target nonce');
        return;
    }
    
    console.log(`Need ${transactionsNeeded} transactions`);
    
    // Send minimal value transactions to yourself (cheapest option)
    for (let i = 0; i < transactionsNeeded; i++) {
        const tx = {
            to: signer.address,  // Send to yourself
            value: 0,           // No ETH transfer
            gasLimit: 21000,    // Minimum gas for basic transfer
            gasPrice: ethers.parseUnits('0.001', 'gwei') // Very low gas price
        };
        
        console.log(`Sending transaction ${i + 1}/${transactionsNeeded}...`);
        const txResponse = await signer.sendTransaction(tx);
        
        console.log(`Waiting for transaction ${i + 1} to be confirmed...`);
        await txResponse.wait(); // Wait for this transaction to be mined before sending next
        
        console.log(`Transaction ${i + 1} confirmed!`);
    }
    
    const finalNonce = await signer.getNonce();
    console.log(`Final nonce: ${finalNonce}`);
    console.log('Done! You can now deploy your factory at nonce 19');
}

incrementNonce()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });