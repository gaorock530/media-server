const env = process.env.NODE_ENV || 'development';
console.log('Running Environment: ' + env);

if ( env === 'production' || env === 'development'){
  const config = require('./config.json');
  const envConfig = config[env];
  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
}