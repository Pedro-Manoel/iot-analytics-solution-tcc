export const dateInTimestamp = (subDay = 0) => {
  const date = new Date();

  date.setDate(date.getDate() - subDay);
  
  return Math.floor(date.getTime() / 1000);
}
