import { ENV } from '../config/env.js';
import log from '../libs/logger.js';

export const getNextBlockData = async (jsonData, lastLine) => {
  const data = jsonData.splice(0, ENV.app.number_reading_lines_csv);
  
  if (data.length > 0) {
    const startLine = lastLine + 1;
    const formattedStartLine = `${startLine}`.padStart(ENV.app.number_spaces_before_line_numbers, ' '); 
    const formattedLastLine = `${lastLine + data.length}`.padStart(ENV.app.number_spaces_before_line_numbers, ' '); 
    
    log.Info(`read ${formattedStartLine} - ${formattedLastLine } lines`);
  } else {
    log.Info(`No more data to read`)
  }

  return data;
}