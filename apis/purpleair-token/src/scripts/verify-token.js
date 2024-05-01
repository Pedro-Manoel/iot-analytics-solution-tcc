import axios from 'axios';

import { ENV } from '../config/env.js';

export const verifyToken = async (token) => {  
  if (!token) return false;
  
  try {
    const { data } = await axios.get(`${ENV.token.verifyUrl}`, {
      params: {
        token: decodeURIComponent(token),
      } 
    });

    return Boolean(data.api_key_type);  
  } catch (error) {
    return false;
  } 
};


