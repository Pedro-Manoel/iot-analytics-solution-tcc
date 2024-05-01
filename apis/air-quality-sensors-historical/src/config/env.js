export const ENV = {
  app : {
    port: process.env.APP_PORT,
    number_reading_lines_csv: process.env.APP_NUMBER_READING_LINES_CSV,
    number_spaces_before_line_numbers: process.env.APP_NUMBER_SPACES_BEFORE_LINE_NUMBERS,
  },
  data: {
    historical_csv_file_name: process.env.HISTORICAL_CSV_FILE_NAME,
  },
};