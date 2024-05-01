import log from 'node-file-logger';

log.SetUserOptions({
  timeZone: 'America/Sao_Paulo',
  folderPath: './logs/',
  dateBasedFileNaming: true,
  fileNamePrefix: 'purpleair-token-',
  fileNameExtension: '.log',
  dateFormat: 'DD-MM-YYYY',
  timeFormat: 'HH:mm:ss',
  logLevel: 'debug',
  onlyFileLogging: false
});

export default log;