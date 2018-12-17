'use strict';
/**
 * @name ReefMagic-MediaServer
 * @author Magic
 * @description the main entry file, starts server
 * @version 0.0.1
 */
// load config.json
require('./config');

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
const upload = require('express-fileupload');
const bodyParser = require('body-parser');


app.disable('etag');
app.disable('x-powered-by');
// solve cross origin control
var whitelist = ['http://localhost:3000', 'http://websocket.mofaqua.com', 'https://www.mofaqua.com', 'https://mofaqua.com'];
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback('Not allowed by CORS')
    }
  }
}
app.use(cors(corsOptions));
// parse post body
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
/**
 * -----------------------------------------
 * Server setup
 * -----------------------------------------
 */
const PORT = process.env.PORT || 8000;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'media.mofaqua.com.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'media.mofaqua.com.crt'))
}

// WebSocket Plugin
const server = https.createServer(options, app);

// Secondary http app
var httpApp = express();
var httpRouter = express.Router();
httpApp.use('*', httpRouter);
httpRouter.get('*', function(req, res){
  console.log('redirect');
    var host = req.get('Host');
    // replace the port in the host
    // host = host.replace(/:\d+$/, ":"+app.get('port'));
    host = host.replace(/:\d+$/, ":8000");
    console.log(host)
    // determine the redirect destination
    var destination = ['https://', host, req.url].join('');
    return res.status(301).redirect(destination);
});
var httpServer = http.createServer(httpApp);
httpServer.listen(8080, (err) => {console.log(err || `http server is running on port: 8080`)});


const obs = require('./helper/obs');

// get manifest
app.get('/manifest/:quality/:hash/:file', async (req, res) => {
  try{
    // ???????? should add quality control
    const file = await obs.getFile(`manifest/${req.params.hash}/${req.params.quality}/${req.params.file}`);
    file.pipe(res);
  }catch(e) {
    res.status(200).send({err: e});
  }
})



// get video screenshot
app.get('/cover/:hash', async (req, res) => {
  console.log('referer:', req.headers.referer || 'no referer');

  try{
    const file = await obs.getFile(`screenshots/${req.params.hash}.jpg`);
    res.setHeader('Server', 'Magic');
    res.setHeader('Content-Type', 'image/jpeg');
    file.pipe(res);
  }catch(e) {
    res.status(200).send({err: e});
  }
})



/**
 * @description handle upload videos
 * @method POST
 * 
 */
app.post('/videoupload', upload({createParentPath: true}), (req, res) => {
  if (!req.body.uid || !req.body.permit || !req.body.stage || (req.body.stage.toString() === '1' && !req.files))
  return res.status(401).send({err: 'body'});
  console.log('coming POST request on Upload')
  switch(req.body.stage.toString()) {
    case '1':
      return require('./upload/stage1')(req, res);
    case '2':
      return require('./upload/stage2')(req, res);
    case '3':
      return require('./upload/stage3')(req, res);
    default:
      return res.status(401).send({err: 'stage not valid'});
  }
})



app.get('/', (req, res) => {
  console.log('**https request: ')
  console.log(req.get('Host'))
  console.log(req.url)
  res.status(200).send('ok');
})

server.listen(PORT, (err) => {
  console.log(err || `Media Server is running on PORT: ${PORT}`);
})







// 使用访问OBS

// 关闭obsClient
// obsClient.close();


