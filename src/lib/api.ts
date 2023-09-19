import axios from 'axios'

export const api = axios.create({
  baseURL: 'https://facilita-ai-api.onrender.com',
})