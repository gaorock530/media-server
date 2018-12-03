const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');

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
httpServer.listen(8080, (err) => {console.log(err || `http serveris running on port: 8080`)});



/**
 * -----------------------------------------
 * OBS initialize
 * -----------------------------------------
 */
const bucket = 'obs-b704';
// 引入obs库
const OBS = require('./obs/lib/obs');

// 创建ObsClient实例
const obsClient = new OBS({
       access_key_id: 'GV7WGSYA1WGPVIZO8RC3',
       secret_access_key: 'LSs1AfwNFH6onTpyfW2GmKRYCXWQP9Q3FOVZPPEk',
       server : 'https://obs.cn-north-1.myhwclouds.com', // 连接OBS的服务地址。可包含协议类型、域名、端口号
      //  server: 'https://localhost:8000',
       max_retry_count: 5,
       timeout: 120,
       ssl_verify: false,
       long_conn_param: 0 //长连接模式参数（单位：秒）。当该参数大于等于0时，开启长连接模式，并将该参数作为TCP Keep-Alive数据包的初始延迟。

});
// 1.1 	日志初始化
const parameter = {
  name: 'obs_woking_log', 
  file_full_path:'./logs/OBS-SDK.log', 
  max_log_size:20480, 
  backups:10, 
  level:'info',
  log_to_console:false 
}
obsClient.initLog(parameter);

// find Bucket
obsClient.headBucket({Bucket: bucket}, (err, result) => {
  if (err) {
    console.error('Error-->' + err);
  }else {
    if(result.CommonMsg.Status < 300){
      console.log('Bucket exists'); 
    }else if(result.CommonMsg.Status === 404){
      console.log('Bucket does not exist'); 
    } 
      
  }
})



// listBuckets
obsClient.listBuckets({QueryLocation: true},(err, result) => {
  if(err){
    console.error('Error-->' + err);
  }else{
    if(result.CommonMsg.Status < 300){ 
      console.log('RequestId-->' + result.InterfaceResult.RequestId); 
      console.log('Owner:');
      console.log('ID-->' + result.InterfaceResult.Owner.ID); 
      console.log('Name-->' + result.InterfaceResult.Owner.Name); 
      console.log('Buckets:'); 
      for(let i=0;i<result.InterfaceResult.Buckets.length;i++){ 
        console.log('Bucket[' + i + ']:');
        console.log('BucketName-->' + result.InterfaceResult.Buckets[i].BucketName); 
        console.log('CreationDate-->' + result.InterfaceResult.Buckets[i].CreationDate);
        console.log('Location-->' + result.InterfaceResult.Buckets[i].Location); 
      } 
    }else{
      console.log('Code-->' + result.CommonMsg.Code);
      console.log('Message-->' + result.CommonMsg.Message); 
    }
  }
});
app.use(cors());
app.disable('etag')
app.disable('x-powered-by');

app.get('/:id/manifest/:file', (req, res) => {

  obsClient.getObject({
    Bucket: bucket,
    Key: `obs-manifest/${req.params.id}/${req.params.file}`, //req.params.file,
    SaveAsStream: true
  }, (err, result) => {
    if (err) return res.status(404).send(err);
    else {
      if(result.CommonMsg.Status < 300) {
        // res.status(200).send();
        result.InterfaceResult.Content.pipe(res);
        // console.log(result.InterfaceResult.Content)
      }else {
        res.status(403).send({
          code: result.CommonMsg.Code,
          err: result.CommonMsg.Message
        })
      }
    }
  })
})

app.get('/video/:file', (req, res) => {

  obsClient.getObject({
    Bucket: bucket,
    Key: `${req.params.file}`, //req.params.file,
    SaveAsStream: true
  }, (err, result) => {
    if (err) return res.status(404).send(err);
    else {
      if(result.CommonMsg.Status < 300) {
        // res.status(200).send();
        result.InterfaceResult.Content.pipe(res);
        // console.log(result.InterfaceResult.Content)
      }else {
        res.status(403).send({
          code: result.CommonMsg.Code,
          err: result.CommonMsg.Message
        })
      }
    }
  })
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




// // 使用访问OBS

// // 关闭obsClient
// obsClient.close();


