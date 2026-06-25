import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with actual API base URL from env if needed
const BASE_URL = 'https://ai-project-j1x5.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let on401Callback: (() => void) | null = null;

export const set401Callback = (callback: () => void) => {
  on401Callback = callback;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request detected (401). Clearing session...');
      if (on401Callback) {
        on401Callback();
      } else {
        // Fallback: just clear storage
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authService = {
  sendOTP: async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const response = await api.post('/auth/signin/send-otp', { phone: formattedPhone });
    return response.data;
  },
  verifyOTP: async (phone: string, otp: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const response = await api.post('/auth/signin/verify-otp', { phone: formattedPhone, otp });
    return response.data;
  },
  signupSendOTP: async (name: string, phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '.';
    const response = await api.post('/auth/signup/send-otp', { 
      firstName, 
      lastName, 
      phone: formattedPhone, 
      name 
    });
    return response.data;
  },
  signupVerifyOTP: async (name: string, phone: string, otp: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '.';
    const response = await api.post('/auth/signup/verify-otp', { 
      firstName, 
      lastName, 
      phone: formattedPhone, 
      otp, 
      name 
    });
    return response.data;
  },
  signout: async () => {
    try {
      await api.post('/auth/signout');
    } catch (e) {
      console.warn('Signout request failed', e);
    }
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
  },
};

export const recordService = {
  uploadRecord: async (formData: FormData) => {
    const response = await api.post('/records/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getMyProfile: async () => {
    const response = await api.get('/user/me');
    return response.data;
  },
  getUserFullProfile: async (userId: string) => {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },
  getUserFolders: async () => {
    try {
      const response = await api.get('/folders');
      return response.data.folders || [];
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  },
  getFolders: async () => {
    const response = await api.get('/folders');
    return response.data.folders;
  },
  deleteRecord: async (recordId: string) => {
    const response = await api.delete(`/records/${recordId}`);
    return response.data;
  },
  deleteFolder: async (folderId: string) => {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
  },
  createFolder: async (name: string) => {
    const response = await api.post('/folders/create', { name });
    return response.data;
  },
  summarize: async (formData: FormData) => {
    const response = await api.post('/ai/summarize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getAiJobStatus: async (jobId: string) => {
    const response = await api.get(`/ai/status/${jobId}`);
    return response.data;
  },
};

export const qrService = {
  generateQR: async (recordIds: string[], expiresIn: number = 3600, shareOption: string = 'all') => {
    const response = await api.post('/qr/generate', { 
      record_ids: recordIds, 
      expires_in: expiresIn,
      share_option: shareOption
    });
    return response.data;
  },
  getQRData: async (token: string) => {
    const response = await api.get(`/qr/${token}`);
    return response.data;
  },
};

export const aiService = {
  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/ai/status/${jobId}`);
    return response.data;
  },
  summarizeSummaries: async (summaries: any[]) => {
    const response = await api.post('/ai/summarize-summaries', {
      summaryData: summaries
    });
    return response.data.data;
  },
};

export const appointmentService = {
  getAvailableDoctors: async () => {
    const response = await api.get('/appointments/doctors');
    return response.data;
  },
  requestAppointment: async (payload: { doctor_id: string, hospital_id: string, appointment_date: string, time_slot: string }) => {
    const response = await api.post('/appointments/request', payload);
    return response.data;
  },
  getPatientAppointments: async () => {
    const response = await api.get('/appointments/patient');
    return response.data;
  }
};
