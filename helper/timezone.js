/**
 * 
 * @param {Boolean} timeStamp determine output: True - timeStamp / False - timeString
 * @param {timeString | timeStamp} UTCDateString use given time to get String or Stamp
 * @param {Number} expires_min minutes to expire
 * @returns {String | timeStamp}
 */

const ConvertUTCTimeToLocalTime = (timeStamp, UTCDateString, expires_min) =>
{
  const now = UTCDateString || Date.now();
  const expires = (expires_min && expires_min > 0) ? expires_min : 0;
  const convertdLocalTime = new Date(now);
  const minOffset = convertdLocalTime.getTimezoneOffset();

  convertdLocalTime.setMinutes( convertdLocalTime.getMinutes() - minOffset + expires ); 
  // console.log(`now: ${new Date(now)}, expires: ${convertdLocalTime}`);
  return timeStamp? convertdLocalTime.getTime() : convertdLocalTime;
}

module.exports = ConvertUTCTimeToLocalTime;