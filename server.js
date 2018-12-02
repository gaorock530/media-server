const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 8000;

const options = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'media.mofaqua.com.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'media.mofaqua.com.crt'))
}

// WebSocket Plugin
const server = https.createServer(options, app);

const bucketUrl = 'obs-b704.obs.cn-north-1.myhwclouds.com'
// 引入obs库
var ObsClient = require('./obs/lib/obs');

// 创建ObsClient实例
var obsClient = new ObsClient({
       access_key_id: 'GV7WGSYA1WGPVIZO8RC3',
       secret_access_key: 'LSs1AfwNFH6onTpyfW2GmKRYCXWQP9Q3FOVZPPEk',
       server : 'https://media.mofaqua.com'
});

// 使用访问OBS

// 关闭obsClient
obsClient.close();


server.listen(PORT, (err) => {
  console.log(err || `Media Server is running on PORT: ${PORT}`);
})