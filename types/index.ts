import { LocationObject } from 'expo-location';

export interface Marker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  images?: string[];
  createdAt: Date;
}

export interface LocationState {
  location: LocationObject | null;
  errorMsg: string | null;
}

export interface ActiveNotification {
  markerId: number;
  notificationId: string;
  timestamp: number;
}

export interface LocationConfig {
  accuracy: number;
  timeInterval: number;
  distanceInterval: number;
}

export const PROXIMITY_THRESHOLD = 50; // метров