//Global variables
const appName = 'Flashboys Connect'
const url = 'http://wizzlebridge.herokuapp.com/'
let web3 = new Web3('https://ropsten.infura.io')
var sharedKey, sessionId
var addresses = []
socket = io(url)


///Web3 helpers

/**
 * Method for setting the default account in web3
 * @param {string} address Account address provided by wallet
 */
function setDefaultAccount(address) {
    web3.eth.defaultAccount = address
}

/**
 * Prepares the transaction data to be sent to the wallet for signing
 * @param {string} to Address of the receiver
 * @param {string} amount Amount to send from the wallet address
 */
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

/**
 * Method for sending the signed transaction
 * @param {string} txData Signed transaction data
 */
async function sendSignedTransaction(txData) {
    return web3.eth.sendSignedTransaction(txData).on('transactionHash', (hash) => {
        ///TODO test this; it should not work :-|
        console.log(`Hash ${hash}`)
        return hash
    })
}

/**
 * Get the balance of the default account.
 * Return the value in ETH
 */
async function getBalance() {

    if (web3.eth.defaultAccount === null)
        throw new Error('Default account has not been set. Cannot get the balance of the empty account.')

    let balance = await web3.eth.getBalance(web3.eth.defaultAccount)
    return web3.utils.fromWei(balance)
}


/// utils

/**
 * https://www.npmjs.com/package/crypto-js
 * Helper method for encrypting data
 * @param {object} data - Object to be encrypted
 */
function encrypt(data) {
    return CryptoJS.AES.encrypt(data, sharedKey).toString()
}

/**
 * https://www.npmjs.com/package/crypto-js
 * Helper method for encrypting data
 * @param {object} data - Object to be decrypted
 */
function decrypt(data) {
    let bytes = CryptoJS.AES.decrypt(data.toString(), sharedKey)
    return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * https://www.npmjs.com/package/qrcode-generator
 * 
 * @param {object} data Object to be scanned by mobile wallet. {sessionId: data.sessionId, dappName: dappName, socketUrl: url, sharedKey: sharedKey}
 */
function showQrCode(data) {
    let placeHolder = document.getElementById('qr') // get the element where u want ot show the qr code
    const typeNumber = 0
    const errorCorrectionLevel = 'L'
    let qr = qrcode(typeNumber, errorCorrectionLevel)
    qr.addData((JSON.stringify(data)))
    qr.make()
    placeHolder.innerHTML = qr.createImgTag(4)

}


///socket.io events and methods

///Socket.io Events
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

socket.on('wallet-connected', data => {
    if (data.connected) {
        //Mobile wallet has connected to dapp via bridge
        console.log('wallet connected', data.connected)
    }
    else {
        throw new Error('Something went wrong with connecting to mobile wallet....')
    }
})

socket.on('response-address', data => {
    //response data is in the following format: {sessionId: sessionId, data: encryptedData(wallet address encrypted)}
    let address = decrypt(data.data)
    //set the default account in web3
    setDefaultAccount(address)
})

socket.on('response-new-address', data => {
        //response data is in the following format: {sessionId: sessionId, data: encryptedData(wallet address encrypted)}
        let address = decrypt(data.data)
        //add the address in the array
        addresses.push(address)
})

socket.on('response-signed-transaction', async (data) => {
    let signedTx = decrypt(data.data)
    let res = await sendSignedTransaction(JSON.parse(signedTx))
    console.log(`Res hash: ${res.transactionHash}`)
})

/**
 * 
 * @param {string} chain Request address for specific blockchain
 */
function requestPrimaryAddress(chain) {
    // for further modification chain could indicate do we need a BTC, ETH etc addresses
    socket.emit('request-address', {sessionId: sessionId, data: encrypt(chain)})
} 

/**
 * 
 * @param {string} to Address of the receiver
 * @param {number | string} amount Amount to send
 */
async function requestNewSignedTransction(to, amount) {
    let tx = await prepareTransaction(to, amount)
    socket.emit('request-signed-transaction', {sessionId: sessionId, data: encrypt(JSON.stringify(tx))})
}

/**
 * 
 * @param {string} chain Request a new address for specific blockchain
 */
function requestNewAddress(chain) {
    socket.emit('request-new-address', {sessionId: sessionId, data: encrypt(chain)})
}