import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DatabaseProvider, useDatabase } from '../contexts/DatabaseContext';
import { MapComponent } from '../components/Map';
import { AddMarkerModal } from '../components/AddMarkerModal';
import { Marker } from '../types';

const Stack = createNativeStackNavigator();

const HomeScreen = () => {
  const { markers, addMarker } = useDatabase();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleAddMarker = (latitude: number, longitude: number) => {
    setSelectedLocation({ lat: latitude, lng: longitude });
    setModalVisible(true);
  };

  const handleSaveMarker = (title: string, description: string) => {
    if (selectedLocation) {
      addMarker({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        title,
        description,
      });
      setModalVisible(false);
      setSelectedLocation(null);
    }
  };

  const handleMarkerPress = (marker: Marker) => {
    // Здесь можно реализовать навигацию к деталям метки
    console.log('Метка нажата:', marker);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MapComponent 
        markers={markers} 
        onMarkerPress={handleMarkerPress}
        onAddMarker={handleAddMarker}
      />
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          // Центрируем на текущем местоположении и открываем модалку
          // Лучше использовать двойной тап по карте
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <AddMarkerModal
        visible={modalVisible}
        latitude={selectedLocation?.lat || 0}
        longitude={selectedLocation?.lng || 0}
        onClose={() => {
          setModalVisible(false);
          setSelectedLocation(null);
        }}
        onSave={handleSaveMarker}
      />
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <DatabaseProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Карта" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
  },
});

export default App;