const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

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

app.get('/', (req, res) => {
  console.log(req)
  res.status(200).send();
})

server.listen(PORT, (err) => {
  console.log(err || `Media Server is running on PORT: ${PORT}`);
})

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
       server : 'https://media.mofaqua.com:8000', // 连接OBS的服务地址。可包含协议类型、域名、端口号
      //  server: 'https://123.15.210.248:8000',
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
// obsClient.listBuckets({QueryLocation: true},(err, result) => {
//   if(err){
//     console.error('Error-->' + err);
//   }else{
//     if(result.CommonMsg.Status < 300){ 
//       console.log('RequestId-->' + result.InterfaceResult.RequestId); 
//       console.log('Owner:');
//       console.log('ID-->' + result.InterfaceResult.Owner.ID); 
//       console.log('Name-->' + result.InterfaceResult.Owner.Name); 
//       console.log('Buckets:'); 
//       for(let i=0;i<result.InterfaceResult.Buckets.Bucket.length;i++){ 
//         console.log('Bucket[' + i + ']:');
//         console.log('BucketName-->' + result.InterfaceResult.Buckets[i].BucketName); 
//         console.log('CreationDate-->' + result.InterfaceResult.Buckets[i].CreationDate);
//         console.log('Location-->' + result.InterfaceResult.Buckets[i].Location); 
//       } 
//     }else{
//       console.log('Code-->' + result.CommonMsg.Code);
//       console.log('Message-->' + result.CommonMsg.Message); 
//     }
//   }
// });




// 使用访问OBS

// 关闭obsClient
obsClient.close();


