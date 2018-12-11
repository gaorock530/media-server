/**
 * @description Stage - 2 : Converting
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const USER = require('../models/users');
// const ref = {
//   '480p': 84477,
//   '720p': 84476,
//   '1080p': 84475
// }
const ref = {
  '480p': 86546,
  '720p': 88916,
  '1080p': 86549
}


module.exports = async (req, res) => {
  if (req.files || !req.body.hash) return res.status(401).send({err: 's2'});
  console.log('-----------------stage 2----------------')
  console.log(req.body)
  // if user existence and permit
  let user;
  try {
    user = await USER.findOne({UID: req.body.uid});
    if (!user.uploadMonitor || user.uploadMonitor.permit !== req.body.permit) return res.status(401).send();
  }catch(e) {
    // no such user exists(invaild UID)
    return res.status(401).send({err: 'user not found'});
  }
  // tracking current file uploading stage
  const file = await user.uploadTracking(req.body.hash, 2);
  console.log(file);
  const input = `/original/${req.body.hash}.${file.ext}`;
  // const output = `/converted/${req.body.hash}.mp4`;
  const output = `/manifest/${req.body.hash}/${file.info.quality}`;
  const quality = ref[file.info.quality];
  console.log(quality);
  try {
    const result = await transcode(input, output, quality);
    await user.uploadTracking(req.body.hash, 3, null, 1123123);//result.task_id
    await user.uploadTracking(req.body.hash, 4);
    res.status(200).send(result);
  }catch(e) {
    console.log(e)
    res.status(200).send({err: '转码失败'});
  }
  
}

function transcode (input, output, quality) {
  const body = JSON.stringify({
    "input": {
             "bucket": "obs-b704",
             "location": "cn-north-1",
             "object": input  //"/Chasing.Coral-720.mp4"
      },
    "output": {
             "bucket": "obs-b704",
             "location": "cn-north-1",
             "object": output // "/VOD/output1/"
      },
    "trans_template_id": [quality],
  });
  const commend = `-jar /Users/magic/Documents/java/signapi/out/artifacts/signapi_jar/signapi.jar ${body}`;
  console.log(commend);
  let count = 0;
  return new Promise((resolve, reject) => {
    const transcodeProcess = spawn('java', commend.split(' '));
    transcodeProcess.stdout.on('data', (data) => {
      const outspan = data.toString();
      console.log('transcode res', outspan, ++count);
      let json;
      try {
        json = JSON.parse(outspan);
      }catch(e) {
        json = outspan;
      }
      console.log('--------transcode data----------');
      if (json['task_id']) {
        console.log('transcoding Success!');
        console.log(json)
        resolve(json);
      }else {
        console.log('transcoding Failed!');
        reject(json)
      }
    });
    transcodeProcess.stderr.on('data', (data) => {
      console.log('--------transcode error----------');
      console.log(data.toString());
      reject(data.toString())
    });
  });

  
}

function checking (id) {
  const commend = `-jar /Users/magic/Documents/java/getstatus/out/artifacts/getstatus_jar/getstatus.jar ${id}`;
  const check = () => {
    console.log('--------checking----------');
    const transcode = spawn('java', commend.split(' '));
    transcode.stdout.on('data', (data) => {
      const res = data.toString();
      console.log('checking res', res);
      const json = JSON.parse(res);
      console.log('--------checking data----------');
      console.log('checking json',json);
      if (json.task_array[0].status === 'SUCCEEDED') return json;
      if (json.task_array[0].status === 'FAILED') return 'FAILED';
      setTimeout(() => {check()}, 5000);
    });
    transcode.stderr.on('data', (data) => {
      console.log('--------checking error----------');
      console.log(data.toString());
      return 'FAILED';
    });

  }
  return new Promise((resolve, reject) => {
    const result = check();
    if (typeof result === 'object') {
      return resolve(result);
    }
    reject('FAILED')
  });
}