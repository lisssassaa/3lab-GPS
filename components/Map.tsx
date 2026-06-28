import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import MapView, { Marker as MapMarker, PROVIDER_GOOGLE, Region, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Marker, PROXIMITY_THRESHOLD } from '../types';
import { 
  requestLocationPermissions, 
  startLocationUpdates, 
  calculateDistance 
} from '../services/location';
import { NotificationManager } from '../services/notifications';

const notificationManager = new NotificationManager();

interface MapComponentProps {
  markers: Marker[];
  onMarkerPress: (marker: Marker) => void;
  onAddMarker?: (latitude: number, longitude: number) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({ 
  markers, 
  onMarkerPress,
  onAddMarker 
}) => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const setupLocation = async () => {
      try {
        setLoading(true);
        
        // Запрос разрешений на уведомления
        try {
          await notificationManager.requestPermissions();
        } catch (notifError) {
          console.log('Уведомления не разрешены:', notifError);
        }
        
        // Запрос разрешений на местоположение
        await requestLocationPermissions();
        
        // Получение текущего местоположения
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
        
        // Запуск обновлений местоположения
        locationSubscription.current = await startLocationUpdates((newLocation) => {
          setUserLocation(newLocation);
          checkProximity(newLocation, markers);
        });
        
        setLoading(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка получения местоположения';
        setErrorMsg(message);
        setLoading(false);
        
        if (message.includes('не разрешён')) {
          Alert.alert(
            'Доступ запрещён',
            'Разрешите доступ к местоположению в настройках телефона'
          );
        } else {
          Alert.alert('Ошибка', message);
        }
      }
    };

    setupLocation();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      // Очищаем уведомления при размонтировании
      notificationManager.clearAllNotifications();
    };
  }, []);

  // Проверка приближения при изменении маркеров
  useEffect(() => {
    if (userLocation) {
      checkProximity(userLocation, markers);
    }
  }, [markers, userLocation]);

  const checkProximity = (location: Location.LocationObject, markersList: Marker[]) => {
    markersList.forEach(marker => {
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        marker.latitude,
        marker.longitude
      );

      if (distance <= PROXIMITY_THRESHOLD) {
        notificationManager.showNotification(marker);
      } else {
        notificationManager.removeNotification(marker.id);
      }
    });
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      const region: Region = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  const handleMapPress = (event: any) => {
    if (onAddMarker) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onAddMarker(latitude, longitude);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка местоположения...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setLoading(true);
            setErrorMsg(null);
            // Перезапускаем
            window.location.reload();
          }}
        >
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={handleMapPress}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 55.7558,
                longitude: 37.6173,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
      >
        {markers.map((marker) => (
          <React.Fragment key={marker.id}>
            <Circle
              center={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              radius={PROXIMITY_THRESHOLD}
              strokeWidth={2}
              strokeColor="rgba(0, 150, 255, 0.5)"
              fillColor="rgba(0, 150, 255, 0.1)"
            />
            <MapMarker
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.title}
              description={marker.description}
              onPress={() => onMarkerPress(marker)}
            />
          </React.Fragment>
        ))}
      </MapView>
      
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Text style={styles.centerButtonText}>★</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerButtonText: {
    fontSize: 24,
  },
});