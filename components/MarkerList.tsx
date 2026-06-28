import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { Marker } from '../types';
import { useDatabase } from '../contexts/DatabaseContext';

interface MarkerListProps {
  markers: Marker[];
  onMarkerSelect: (marker: Marker) => void;
}

export const MarkerList: React.FC<MarkerListProps> = ({ markers, onMarkerSelect }) => {
  const { deleteMarker } = useDatabase();
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleDeleteMarker = (marker: Marker) => {
    Alert.alert(
      'Удаление метки',
      `Вы уверены, что хотите удалить метку "${marker.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarker(marker.id);
              Alert.alert('Успех', 'Метка удалена');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить метку');
            }
          },
        },
      ]
    );
  };

  const handleMarkerPress = (marker: Marker) => {
    setSelectedMarker(marker);
    setModalVisible(true);
    onMarkerSelect(marker);
  };

  const renderMarkerItem = ({ item }: { item: Marker }) => {
    const distance = 0; // Здесь можно добавить расчет расстояния

    return (
      <TouchableOpacity
        style={styles.markerItem}
        onPress={() => handleMarkerPress(item)}
        onLongPress={() => handleDeleteMarker(item)}
      >
        <View style={styles.markerContent}>
          <View style={styles.markerHeader}>
            <Text style={styles.markerTitle}>{item.title}</Text>
            <Text style={styles.markerDistance}>
              {distance < 1000 
                ? `${Math.round(distance)} м` 
                : `${(distance / 1000).toFixed(1)} км`}
            </Text>
          </View>
          
          {item.description && (
            <Text style={styles.markerDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.markerFooter}>
            <Text style={styles.markerCoordinates}>
              ★ {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
            {item.images && item.images.length > 0 && (
              <Text style={styles.markerImages}>
                ☆ {item.images.length} фото
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>★</Text>
      <Text style={styles.emptyTitle}>Нет сохранённых меток</Text>
      <Text style={styles.emptyDescription}>
        Нажмите на карту, чтобы добавить новую метку
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Сохранённые метки ({markers.length})
        </Text>
      </View>

      <FlatList
        data={markers}
        renderItem={renderMarkerItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Модальное окно с информацией о метке */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMarker?.title}</Text>
            
            {selectedMarker?.description && (
              <Text style={styles.modalDescription}>
                {selectedMarker.description}
              </Text>
            )}

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                ★ Широта: {selectedMarker?.latitude.toFixed(6)}
              </Text>
              <Text style={styles.modalInfoText}>
                ★ Долгота: {selectedMarker?.longitude.toFixed(6)}
              </Text>
              <Text style={styles.modalInfoText}>
                ☆ Создана: {selectedMarker?.createdAt.toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Закрыть</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={() => {
                  if (selectedMarker) {
                    handleDeleteMarker(selectedMarker);
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  markerItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerContent: {
    flex: 1,
  },
  markerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  markerDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  markerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  markerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markerCoordinates: {
    fontSize: 12,
    color: '#999',
  },
  markerImages: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonDelete: {
    backgroundColor: '#ff3b30',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});