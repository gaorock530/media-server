function checkPass (password) {
  let secureLevel = 0;
  // Minimum eight characters, at least one letter and one number:
  if (password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,128}$/)) secureLevel = 1;
  // Minimum eight characters, at least one letter, one number and one special character
  if (password.match(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,128}$/) || 
  // Minimum eight characters, at least one uppercase letter, one lowercase letter and one number
  password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,128}$/)) secureLevel = 2;
  // Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special characte
  // /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/
  if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W])[A-Za-z\d\W]{8,128}$/) ||
  // Minimum eight and maximum 10 characters, at least one uppercase letter, one lowercase letter, one number and one special character
      password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W])[A-Za-z\d\W]{8,128}$/)) secureLevel = 3;
  return secureLevel;
}

module.exports = {
  checkPass
}