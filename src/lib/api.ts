import axios from 'axios'

export const api = axios.create({
  baseURL: 'https://upload-ai-api-116e.onrender.com',
})