const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
//jwt.sign / jwt.verify
const cuid = require('cuid');
const bcrypt = require('bcryptjs');
// const validator = require('validator');
const {hex_md5} = require('../helper/md5');
const {b64_sha256} = require('../helper/sha256');
const {checkPass} = require('../helper/utils');
const _ = require('lodash');
const ConvertUTCTimeToLocalTime = require('../helper/timezone');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
const schema = new mongoose.Schema({
  /*-----------------------------------------------
    Basic feilds
  -------------------------------------------------*/ 
  UID: {
    type: String,
    unique: true,
    required: true
  },
  username: { type: String, trim: true},
  nameForCheck: { type: String, uppercase: true, trim: true},
  password: {
    value: { type: String, required: true },
    secure: { type: Number, required: true} // 1,2,3
  },
  email: { type: String, defalut: '', lowercase: true, trim: true },
  phone: { type: String, defalut: '', trim: true},
  pic: {type: String, default: null},
  address: [
    {
      id: {type: String, require: true},
      recent: {type: Boolean, default: false},
      country: {type: String},
      state: {type: String},
      city: {type: String},
      area: {type: String}, //district
      detail: {type: String},
      zip: {type: String}
    }
  ],
  verification: {
    submit: {type: Date, defalut: null},
    verifiedAt: {type: Date, defalut: null},
    verified: {type: Number, defualt: 0}, // 0 - false, 1 - in-process, 2 - true
    by: {type: String, defalut: null},    // verified under whose authority {UID}
    idPhotoA: {type: String, defualt: ''},
    idPhotoB: {type: String, defualt: ''},
    name: {type: String, defualt: null},
    idno: {type: String, defalut: null}, // id number
    gender: {type: Boolean, default: null},
    dob: {type: Date, default: null},
    location: {type: String, defalut: null},
    phone: {type: String, defalut: null},
    expires: {type: Date, defalut: null},
  },
  /*-----------------------------------------------
    show other public feilds
  -------------------------------------------------*/ 
  /**
   * @param {Number} auth
   *   (0 - SELF)
   *    1 - USER
   *    2 - ADMIN
   *    3 - SUPER
   *    4 - OWNER
   */
  person: {
    auth: { type: String, default: 1 },
    level: {type: Number, defalut: 1, get: v => Math.floor(v)},
    exp: {type: Number, defalut: 0, get: v => Math.floor(v)}
  },
  buyer: {
    is: {type: Boolean, default: true},
    level: {type: Number, defalut: 1, get: v => Math.floor(v)},
    exp: {type: Number, defalut: 0, get: v => Math.floor(v)},
    credit: {type: Number, defalut: 0, get: v => Math.floor(v)},
  },
  seller: {
    is: {type: Boolean, default: false},
    shopID: {type: String, default: ''}, 
    level: {type: Number, defalut: 1, get: v => Math.floor(v)},
    exp: {type: Number, defalut: 0, get: v => Math.floor(v)},
    credit: {type: Number, defalut: 0, get: v => Math.floor(v)},
  },
  /* finance */
  balance: {
    total: {type: Number, defalut: 0, get: v => Math.floor(v)},
    onhold: {type: Number, defalut: 0, get: v => Math.floor(v)}
  },
  magicCoin: {
    total: {type: Number, defalut: 100, get: v => Math.floor(v)},
    onhold: {type: Number, defalut: 100, get: v => Math.floor(v)}
  },
  /*-----------------------------------------------
    System feilds
  -------------------------------------------------*/ 
  registerDetails: { 
    ip: {type: String},
    client: {type: String},
    time: {type: Date, default: ConvertUTCTimeToLocalTime(true)}
  },
  lastVisit: {
    ip: {type: String},
    client: {type: String},
    time: {type: Date, default: ConvertUTCTimeToLocalTime(true)}
  },
  records: [
    { //{register, update, upgrade, downgrade, upSeller, downSeller}
      event: { type: String, required: true },
      log: { type: String, required: true },
      date: { type: Date, required: true },
      by: { type: String, required: true }
    }
  ],
  /*-----------------------------------------------
    login tokens
  -------------------------------------------------*/   
  tokens: [
    {
      loginTime: { type: Date, defalut: ConvertUTCTimeToLocalTime(true)},
      location: {type: String, defalut: ''},
      access: { type: String, required: true },
      token: { type: String, required: true },
      expires: { type: Date, required: true }
    }
  ],
  
  /*-----------------------------------------------
    Optional feilds
  -------------------------------------------------*/   
  // after upload(ed) a file
  upload: [
    {
      uploadDate: {type: Date, required: true}, // record upload success timestamp
      hash: {type: String, required: true},     // record file hash
      stage: {type: Number, required: true},    // record upload stage 0-uploading 1-uploaded 2-converted 3-manifest 4-done
      ext: {type: String, required: true},      // record original file's extension
      info: {type: Object},                     // record file metadata like quality and bitrate
      task_id: {type: Number}
    }
  ], 
  // enter upload page
  uploadMonitor: {
    lastRequest: {type: Date},  // record last uploading request timestamp (detecting over requesting)
    permit: {type: String},     // store a permit string for client upload
    inProcess: {type: Boolean}
  }
}); 


/**
 * @description Class methods on USER
 */


schema.methods.uploadTracking = async function (hash, stage, extension, info) {
  console.log(extension || 'not stage 1')
  const user = this;
  let record = null;
  
  switch(stage) {
    case 0: // before uploading to obs
      let exist = false;
      user.upload.map(upload => {
        if (upload.hash && upload.hash === hash) {
          exist = true;
        }
        return upload;
      });
      if (exist) return false;
      user.upload.push({
        uploadDate: ConvertUTCTimeToLocalTime(),
        hash,
        stage,      // 0
        ext: extension
      });
      user.uploadMonitor.inProcess = true;
      return user.save();
    case 1: // after uploaded to obs
      user.upload = user.upload.map(upload => {
        if (upload.hash && upload.hash === hash) {
          upload.info = {...info};
          upload.stage = stage; // 1
        }
        return upload;
      });
      return user.save();
    case 2: // before start making manifest task
      user.upload = user.upload.map(upload => {
        if (upload.hash && upload.hash === hash) {
          upload.stage = stage; // 2
          record = upload;
        }
        return upload;
      });
      console.log('record:', record)
      await user.save();
      return record._doc;
      
    case 3: // after start making manifest task
      user.upload = user.upload.map(upload => {
        if (upload.hash && upload.hash === hash) {
          upload.stage = stage; // 3
          upload.task_id = info; // info is equals task_id
        }
        return upload;
      });
      user.uploadMonitor.inProcess = false;
      return user.save();
    // when transcoding is all done, delete record
    default:
      return user.updateOne({
        $pull: {
          upload: {hash}
        }
      });
  }
}


/**
 * @description Static methods on USER
 */

schema.statics.verifyToken = async function (token = '', ip, client) {
  const users = this;
  try {
    // decode token into payload
    const payload = await jwt.verify(token, process.env.JWT_SECRET);
    // use payload info find user
    const user = await users.findOne({
      '_id': payload._id,
      'tokens.token': token,
      'tokens.access': payload.access 
    });
    // check if user exists
    if (!user) {
      console.log('user not found || token removed');
      return false;
    }
    // check if token expires
    if (payload.expires < ConvertUTCTimeToLocalTime(true)) {
      //remove expired token
      const cb = await user.update({ $pull: { tokens: {token} } });
      console.log({cb ,msg: 'token expired and will be removed'})
      return false; 
    }
    // check if this token is generated by the same client (IP + Client)
    const hash = b64_sha256(hex_md5(ip + client));
    if (hash !== payload.hash) {
      console.log('not same client');
      return false;
    }
    return user;
  }catch(e) {
    console.warn('error from user.js Catch(e)', e);
    return false;
  }
}




// Pre 'save' middleware
schema.pre('save', function (next) {
  console.log('saving document');
  const user = this;
  if (user.isNew) {
    user.verification.verified = false;
    user.person = {level: 1, exp: 0};
    user.buyer = {level: 1, exp: 0, credit: 1000};
    user.seller = {level: 1, exp: 0, credit: 1000};
    user.balance = {total: 0, onhold: 0};
    user.magicCoin = {total: 100, onhold: 0};
    // user.nameForCheck = user.username;
  }
  if (user.isModified('username')) {
    // Capitalize username for checking unique
    user.nameForCheck = user.username;
  }

  // only save password when it's created or changed
  if (user.isModified('password.value')) {
    console.log('saving password...')
    // hashing password using bcrypt with 10 rounds of salting (~10 hashes / sec)
    const salt = bcrypt.genSaltSync(10);
      // actual hashing 
    const hash = bcrypt.hashSync(user.password.value, salt);
    console.log('saving password: ', hash)
    user.password.value = hash;
  }
  next();
});

const User = mongoose.model('User', schema);

module.exports = User;