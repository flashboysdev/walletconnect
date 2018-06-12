let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let uuid = require('uuid4');
let crypto = require('crypto')
let token = crypto.randomBytes(64).toString('hex');

console.log(token);
const PORT = process.env.PORT || 3000;

// CORS
app.use( (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ORIGINS
io.origins(['*:*']) 


io.on('connection', (socket) => {

    ///dapp connected
    socket.emit('on-connection', {connected: true})

    ///socket options for dapp connection
    socket.on('connect-dapp', (data) => {
        let uiid = uuid()
        console.log(`New socket id : ${uiid}`)
        socket.join(uiid)
        io.in(uiid).emit('dapp-connected', {sessionId: uiid, sharedKey: token})
    })

    ///connect the wallet to server and notify the dapp
    socket.on('connect-wallet', (data) => {
        socket.join(data.sessionId)
        console.log('Wallet connected');
        console.log(`session id ${data.sessionId}`)
        socket.to(data.sessionId).emit('wallet-connected', {connected: true})
    })

    ///address events
    socket.on('request-address', (data) => {
        socket.to(data.sessionId).emit('request-address', data)
    })
    
    socket.on('response-address', (data) => {
        socket.to(data.sessionId).emit('response-address', data)
    })

    socket.on('request-new-address', (data) => {
        socket.to(data.sessionId).emit('request-new-address', data)
    })

    socket.on('response-new-address', (data) => {
        socket.to(data.sessionId).emit('response-new-address', data)
    })


    ///transcation events

    socket.on('request-signed-transaction', (data) => {
        socket.to(data.sessionId).emit('request-signed-transaction', data)
    })

    socket.on('response-signed-transaction', (data) => {
        console.log(`sessionId ${data.sessionId}`)
        socket.to(data.sessionId).emit('response-signed-transaction', data)
    })
});

http.listen(PORT, () => {
  console.log('listening on *:3000');
});