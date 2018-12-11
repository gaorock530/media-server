/**
 * -----------------------------------------
 * OBS initialize
 * -----------------------------------------
 */
const fs = require('fs');
const bucket = 'obs-b704';
// 引入obs库
const OBS = require('../obs/lib/obs');

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

async function saveFile (key, source) {
  return new Promise((resolve, reject) => {
    obsClient.putObject({
      Bucket: bucket,
      Key: key,   // path for original file
      Body: fs.ReadStream(source),
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    })
  })
}

async function getFile(key) {
  return new Promise((resolve, reject) => {
    obsClient.getObject({
      Bucket: bucket,
      Key: key, //req.params.file,
      SaveAsStream: true
    }, (err, result) => {
      if (err) reject(err);
      else {
        if(result.CommonMsg.Status < 300) {
          resolve(result.InterfaceResult.Content)
        }else {
          reject({
            code: result.CommonMsg.Code,
            err: result.CommonMsg.Message
          })
        }
      }
    })
  })
}

module.exports = {
  saveFile,
  getFile
};