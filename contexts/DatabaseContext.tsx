import React, { createContext, useContext, useState, useEffect } from 'react';
import { Marker } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DatabaseContextType {
  markers: Marker[];
  addMarker: (marker: Omit<Marker, 'id' | 'createdAt'>) => Promise<void>;
  deleteMarker: (id: number) => Promise<void>;
  loadMarkers: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [markers, setMarkers] = useState<Marker[]>([]);

  const loadMarkers = async () => {
    try {
      const savedMarkers = await AsyncStorage.getItem('markers');
      if (savedMarkers) {
        const parsed = JSON.parse(savedMarkers);
        setMarkers(parsed.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })));
      }
    } catch (error) {
      console.error('Ошибка загрузки меток:', error);
    }
  };

  const addMarker = async (markerData: Omit<Marker, 'id' | 'createdAt'>) => {
    try {
      const newMarker: Marker = {
        ...markerData,
        id: Date.now(),
        createdAt: new Date(),
      };
      
      const updatedMarkers = [...markers, newMarker];
      setMarkers(updatedMarkers);
      await AsyncStorage.setItem('markers', JSON.stringify(updatedMarkers));
      console.log('Метка добавлена:', newMarker);
    } catch (error) {
      console.error('Ошибка добавления метки:', error);
      throw error;
    }
  };

  const deleteMarker = async (id: number) => {
    try {
      const updatedMarkers = markers.filter(marker => marker.id !== id);
      setMarkers(updatedMarkers);
      await AsyncStorage.setItem('markers', JSON.stringify(updatedMarkers));
      console.log('Метка удалена:', id);
    } catch (error) {
      console.error('Ошибка удаления метки:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadMarkers();
  }, []);

  return (
    <DatabaseContext.Provider value={{ markers, addMarker, deleteMarker, loadMarkers }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};