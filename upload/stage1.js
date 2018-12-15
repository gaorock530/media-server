/**
 * @description Stage - 1 : Uploading
 * @emits 1. checking file mimetype and extension
 * @emits 2. checking file size
 * @emits 3. checking video duration
 * @emits 4. checking video quality
 * @emits 5. generating video screenshot
 * @emits 6. uploading video and screenshot to OBS
 */
const path = require('path');
const fs = require('fs');
const USER = require('../models/users');
const mimeType = ['video'];           // define accepted mimetype
const ext = ['ts', 'mp4', 'wmv', 'mpg', 'mov', 'mxf', 'flv'];   
const maxDuration = 10 * 60;          // define accepted max video duration(sec)
const maxSize = 200;                  // define accepted max video file size(Mb)
const { spawn } = require('child_process');
const md5 = require('../helper/md5').hex_md5;
const obs = require('../helper/obs');

const basePath = path.join(__dirname, '../videos');
module.exports = async (req, res) => {
  console.log('-----------------stage 1----------------')
  console.log(req.body)
  // define temp file upload path - temporary folder called 'videos'
  
  const file = req.files.file;
  console.log(file);
  // define file unique hash as filename
  const hash = md5(file.data.slice(0,1000).toString());
  // define file uploaded path and file name as destination
  const filename = file.name.split('.');
  const extension = filename[filename.length-1].toLowerCase();
  const nameForCopy = `${hash}.${extension}`;
  const dest = `${basePath}/${nameForCopy}`;
  let fileExist = false;
  console.log(dest);
  // check if the file exists
  try{
    fileExist = fs.statSync(dest).isFile();
    console.log('file exist: ', fileExist);
    if (fileExist) return res.status(200).send({err: 'file exists'});
  }catch(e) {
    fileExist = false;
  }
  // 1. check file mimetype and extension
  if (!~ext.indexOf(extension)) return res.status(200).send({err: 'upload file type error'});
  if (!~mimeType.indexOf(file.mimetype.split('/')[0])) return res.status(200).send({err: 'upload file MIMEtype error'});
  // 2. check file size
  if (file.data.length > maxSize * 1024 * 1024 ) return res.status(200).send({err: `video Size ${Math.floor(file.data.length/1000000)}Mb excceds ${maxSize}Mb.`});
  // 2.1 record uploading status
  // if user existence and permit
  let user;
  try {
    user = await USER.findOne({UID: req.body.uid});
    if (!user.uploadMonitor || user.uploadMonitor.permit !== req.body.permit) return res.status(401).send({err: 'no permit'});
    if (user.uploadMonitor.inProcess) return res.status(200).send({err: 'uploading in process'});
  }catch(e) {
    // no such user exists(invaild UID)
    return res.status(401).send({err: 'no user found'});
  }
  // tracking current file uploading stage
  const notexist = await user.uploadTracking(hash, 0, extension);
  // file record exists in database throw error
  if (!notexist) return res.status(200).send({err: 'file exists at stage 0'});

  // 3. uploading file
  file.mv(dest, async (err) => {
    if (err) return res.status(200).send({err: 'file path error'});
    // 4. get video metadata via FFprobe
    const meta = await getVideoInfo(dest);
    console.log(meta);
    // 4.1 check video duration 
    if (meta.video_duration > maxDuration) {//  || meta.video_duration < 10
      fs.unlink(dest, () => {});
      return res.status(200).send({err: 'video Duration excceds 10 minutes or less than 10 seconds.'});
    }
    // 4.2 check video bitrate
    if (!meta.video_bitRate) {
      fs.unlink(dest, () => {});
      return res.status(200).send({err: 'video Bit-Rate is invalid.'});
    }
    // 5. verify video quality
    const analysed = analyseVideo(meta);
    console.log(analysed);
    try{
      const screenshotPath = await screenshot(dest, hash);
      // 6. copy file to OBS cloud storage
      await obs.saveFile(`original/${nameForCopy}`, dest);
      await obs.saveFile(`screenshots/${hash}.jpg`, screenshotPath);
      // update uploading stage
      await user.uploadTracking(hash, 1, null, {quality: analysed.type, bitrate: meta.video_bitRate});
      fs.unlink(dest, () => {});
      fs.unlink(screenshotPath, () => {});
      return res.status(200).send({hash});
    }catch(e) {
      console.log('error', e);
      return res.status(200).send({err: e})
    }
  })
}


function getVideoInfo (path) {
  let output = '';
  return new Promise((resolve, reject) => {
    const commend = `-v error -show_streams -of json ${path}`;
    const analyse = spawn('ffprobe', commend.split(' '));
    const index = {}
    
    analyse.stdout.on('data', (data) => {
      output += data.toString();
    });
  
    analyse.stderr.on('data', (data) => {
      reject(data.toString());
    });
  
    analyse.on('exit', (code) => {
      const video = JSON.parse(output);
      if (Object.keys(video).length === 0) reject();
      for (let stream of video.streams) {
          index[stream.codec_type] = stream.index;
      }
      const meta = {
        video_codec: video.streams[index.video].codec_name,
        video_width: video.streams[index.video].width,
        video_height: video.streams[index.video].height,
        video_duration: parseInt(video.streams[index.video].duration, 10),
        video_frame_rate: video.streams[index.video].r_frame_rate,
        video_display_aspect_ratio: video.streams[index.video].display_aspect_ratio,
        video_bitRate: video.streams[index.video].bit_rate || null,
        audio_codec: video.streams[index.audio].codec_name,
        audio_bitRate: video.streams[index.audio].bit_rate || null,
        audio_sample_rate: video.streams[index.audio].sample_rate,
      }
      resolve(meta);
    });
  })
}

function analyseVideo (data) {
  const encodeingGuide = {
    '2160p': {
      pixel: 3840 * 2160,
      bitrate: 35 // [35, 45]
    },
    '1440p': {
      pixel: 2560 * 1440,
      bitrate: 16
    },
    '1080p': {
      pixel: 1920 * 1080,
      bitrate: 8
    },
    '720p': {
      pixel: 1280 * 720,
      bitrate: 5
    },
    '480p': {
      pixel: 854 * 480,
      bitrate: 2.5
    },
    '360p': {
      pixel: 426 * 240,
      bitrate: 1
    },
  }
  const size = data.video_width * data.video_height;
  let support = [], type, diff;
  for (let t in encodeingGuide) {
    const temp = Math.abs(encodeingGuide[t].pixel - size);
    if (typeof diff === 'undefined' || temp < diff) {
      diff = temp;
      type = t;
    }
    if (size >= encodeingGuide[t].pixel) support.push(t);
  }
  // not support 1440p and 2160p yet
  if (type === '1440p' || type === '2160p') type = '1080p';
  const bitrateDiff = (parseInt(data.video_bitRate, 10) / 1000000) - encodeingGuide[type].bitrate;
  return {type, support, bitrateDiff}
}


// ffmpeg -y -i 12.mp4 -ss 2 -qscale:v 4 -frames:v 1 1.jpg
function screenshot (video, hash) {
  const commend = `-v error -y -i ${video} -ss 2 -vf scale=\'-1:720\' -qscale:v 4 -frames:v 1 ${basePath}/${hash}.jpg`;
  console.log(commend);
  return new Promise((resolve, reject) => {
    const analyse = spawn('ffmpeg', commend.split(' '));
  // ffmpeg -y -i IMG_0434.MOV -ss 2 -qscale:v 4 -vf "scale=-1:720" -frames:v 1 1.jpg
    analyse.stderr.on('data', (data) => {
      console.log('--------------ffmpeg===============')
      reject(data.toString());
    });
  
    analyse.on('exit', (code) => {
      resolve(`${basePath}/${hash}.jpg`);
    });
  })
}