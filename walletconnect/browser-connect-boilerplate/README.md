# About

Basic functionality implemented as an example for communication with bridge-server. 


This boilerplate uses:

1. [web3](https://web3js.readthedocs.io/en/1.0/web3.html) for communication with blockchain (fethcing the balance of the account, creating a transaction, sending the signed transaction to the blockchain.....)

2. (crypto-js)[https://github.com/brix/crypto-js] for encrypting and decrypting data payload between dapps and mobile wallets.

3. [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for generating qr code with necessary details for mobile wallet to connect.


# Functionality

*Basic flow*

1. Once the index.html is opened "dapp" is automatically connected to bridge server. 
```
const url = 'url:to:bridge'
socket = io(url)
```

2. Afer that dapp emits the event to bridge server and request a new *sessionId* and *sharedKey (used for encrypting and decrypting)* and we can generate a QR code for mobile wallet

```
socket.on('on-connection', data => {
    if (data.connected) {
        socket.emit('connect-dapp')
    }
    else {
        throw new Error('Something went wrong with connecting to socket..')
    }
})

socket.on('dapp-connected', data => {
    // we receive the sharedKey and sessionId
    sharedKey = data.sharedKey
    sessionId = data.sessionId
    showQrCode({sharedKey: sharedKey, sessionId: sessionId, dappName: appName, socketUrl: url})
})

function showQrCode(data) {
    let placeHolder = document.getElementById('qr') // get the element where u want ot show the qr code
    const typeNumber = 0
    const errorCorrectionLevel = 'L'
    let qr = qrcode(typeNumber, errorCorrectionLevel)
    qr.addData((JSON.stringify(data)))
    qr.make()
    placeHolder.innerHTML = qr.createImgTag(4)

}
```
3. Daps request a primary address (public key) from the wallet and sets it in web3.

```
function requestPrimaryAddress(chain) {
    // for further modification chain could indicate do we need a BTC, ETH etc addresses
    socket.emit('request-address', {sessionId: sessionId, data: encrypt(chain)})
} 


socket.on('response-address', data => {
    //response data is in the following format: {sessionId: sessionId, data: encryptedData(wallet address encrypted)}
    let address = decrypt(data.data)
    //set the default account in web3
    setDefaultAccount(address)
})

function setDefaultAccount(address) {
    web3.eth.defaultAccount = address
}
```

4. Last thing to do is to create a new transaction (currently only sending eth from the requestedAddress to other one) and send the signed transaction
```
async function requestNewSignedTransction(to, amount) {
    let tx = await prepareTransaction(to, amount)
    socket.emit('request-signed-transaction', {sessionId: sessionId, data: encrypt(JSON.stringify(tx))})
}

async function prepareTransaction(to, amount) {

    if (web3.eth.defaultAccount === null) {
        throw new Error('Default account has not been set')
    }

    let nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount)
    let chainId = await web3.eth.net.getId()
    let gasPrice = web3.utils.toHex(await web3.eth.getGasPrice())
    let gasLimit = web3.utils.toHex('21000')

    return {
        from: web3.eth.defaultAccount,
        nonce: nonce,
        chain: chainId,
        to: to,
        data: '',
        value: web3.utils.toHex(web3.utils.toBN(web3.utils.toWei(amount))),
        gasPrice: gasPrice,
        gasLimit: gasLimit
    }
}

socket.on('response-signed-transaction', async (data) => {
    let signedTx = decrypt(data.data)
    let res = await sendSignedTransaction(JSON.parse(signedTx))
    console.log(`Res hash: ${res.transactionHash}`)
})

async function sendSignedTransaction(txData) {
    return web3.eth.sendSignedTransaction(txData).on('transactionHash', (hash) => {
        ///TODO 
        console.log(`Hash ${hash}`)
        return hash
    })
}
```