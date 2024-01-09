import axios from 'axios'
import { ApiClient } from './api.client'
import { environment } from '../environment'

export const http = axios.create()

export const apiClient = new ApiClient(environment.baseUrl, http)
