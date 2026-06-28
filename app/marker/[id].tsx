import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Marker } from '../../types';
import { ImageList } from '../../components/ImageList';
import * as Location from 'expo-location';
import { calculateDistance } from '../../services/location';

const { width } = Dimensions.get('window');

type RouteParams = {
  id: string;
};

export default function MarkerDetailScreen() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { markers, deleteMarker, addMarker } = useDatabase();
  
  const [marker, setMarker] = useState<Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Загрузка данных маркера
  useEffect(() => {
    const loadMarker = async () => {
      try {
        const markerId = parseInt(route.params.id);
        const foundMarker = markers.find(m => m.id === markerId);
        
        if (foundMarker) {
          setMarker(foundMarker);
          setImages(foundMarker.images || []);
          setEditTitle(foundMarker.title);
          setEditDescription(foundMarker.description || '');
          
          // Получение текущего местоположения
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setUserLocation(location);
            
            // Расчет расстояния
            const dist = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              foundMarker.latitude,
              foundMarker.longitude
            );
            setDistance(dist);
          }
        } else {
          Alert.alert('Ошибка', 'Метка не найдена');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Ошибка загрузки маркера:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить метку');
      } finally {
        setLoading(false);
      }
    };

    loadMarker();
  }, [route.params.id, markers]);

  // Обработчики действий
  const handleDelete = () => {
    if (!marker) return;
    
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
              navigation.goBack();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить метку');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!marker) return;
    
    if (!editTitle.trim()) {
      Alert.alert('Ошибка', 'Введите название метки');
      return;
    }

    try {
      const updatedMarker = {
        ...marker,
        title: editTitle.trim(),
        description: editDescription.trim(),
        images: images,
      };
      
      // В реальном приложении здесь должен быть вызов API
      // Пока просто обновляем локально
      await addMarker({
        latitude: marker.latitude,
        longitude: marker.longitude,
        title: editTitle.trim(),
        description: editDescription.trim(),
        images: images,
      });
      
      // Удаляем старую метку
      await deleteMarker(marker.id);
      
      setIsEditing(false);
      Alert.alert('Успех', 'Метка обновлена');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить метку');
    }
  };

  const handleShare = async () => {
    if (!marker) return;
    
    try {
      const message = `
☆ Метка: ${marker.title}
☆ Описание: ${marker.description || 'Нет описания'}
☆ Координаты: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
☆ Расстояние: ${distance !== null ? `${distance.toFixed(0)} м` : 'Неизвестно'}
      `.trim();
      
      await Share.share({
        message: message,
        title: marker.title,
      });
    } catch (error) {
      console.error('Ошибка шаринга:', error);
    }
  };

  const handleOpenInMaps = () => {
    if (!marker) return;
    
    const url = `https://www.google.com/maps/search/?api=1&query=${marker.latitude},${marker.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть карты');
    });
  };

  const handleNavigate = () => {
    if (!marker || !userLocation) return;
    
    const url = `https://www.google.com/maps/dir/${userLocation.coords.latitude},${userLocation.coords.longitude}/${marker.latitude},${marker.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть маршрут');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (!marker) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>☆</Text>
        <Text style={styles.errorText}>Метка не найдена</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Режим редактирования
  if (isEditing) {
    return (
      <ScrollView style={styles.editContainer}>
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={styles.editCancel}>Отмена</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Редактирование</Text>
          <TouchableOpacity onPress={handleSaveEdit}>
            <Text style={styles.editSave}>Сохранить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editForm}>
          <Text style={styles.editLabel}>Название *</Text>
          <TextInput
            style={styles.editInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Введите название"
            maxLength={50}
          />

          <Text style={styles.editLabel}>Описание</Text>
          <TextInput
            style={[styles.editInput, styles.editTextArea]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Введите описание"
            multiline
            numberOfLines={4}
            maxLength={200}
          />

          <Text style={styles.editLabel}>Фотографии</Text>
          <ImageList
            images={images}
            onImagesChange={setImages}
            maxImages={10}
          />
        </View>
      </ScrollView>
    );
  }

  // Основной просмотр
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {marker.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
            <Text style={styles.actionIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Основная информация */}
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{marker.title}</Text>
          
          {marker.description && (
            <Text style={styles.infoDescription}>{marker.description}</Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>★ Широта</Text>
              <Text style={styles.infoValue}>{marker.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>★ Долгота</Text>
              <Text style={styles.infoValue}>{marker.longitude.toFixed(6)}</Text>
            </View>
          </View>

          {distance !== null && (
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceIcon}>☆</Text>
              <Text style={styles.distanceText}>
                Расстояние до вас: <Text style={styles.distanceValue}>
                  {distance < 1000 
                    ? `${Math.round(distance)} м` 
                    : `${(distance / 1000).toFixed(1)} км`}
                </Text>
              </Text>
              {distance < 50 && (
                <View style={styles.nearbyBadge}>
                  <Text style={styles.nearbyBadgeText}>★ Вы рядом!</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              ★ Создана: {new Date(marker.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Фотографии */}
        {images.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.sectionTitle}>
              ★ Фотографии ({images.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesRow}>
                {images.map((uri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.imageThumbnail}
                    onPress={() => {
                      setSelectedImage(uri);
                      setIsImageModalVisible(true);
                    }}
                  >
                    <Image source={{ uri }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Действия */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenInMaps}>
            <Text style={styles.actionButtonIcon}>☆</Text>
            <Text style={styles.actionButtonText}>Открыть на карте</Text>
          </TouchableOpacity>

          {userLocation && (
            <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
              <Text style={styles.actionButtonIcon}>☆</Text>
              <Text style={styles.actionButtonText}>Построить маршрут</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonEdit]} 
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.actionButtonIcon}>☆</Text>
            <Text style={styles.actionButtonText}>Редактировать</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonDelete]} 
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonIcon}>☆</Text>
            <Text style={[styles.actionButtonText, styles.actionButtonDeleteText]}>
              Удалить
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Модальное окно просмотра изображения */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        onRequestClose={() => setIsImageModalVisible(false)}
        animationType="fade"
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setIsImageModalVisible(false)}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButtonHeader: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  distanceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  distanceValue: {
    color: '#007AFF',
    fontWeight: '600',
  },
  nearbyBadge: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nearbyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  imagesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imagesRow: {
    flexDirection: 'row',
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  actionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  actionButtonEdit: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  actionButtonDelete: {
    borderBottomWidth: 0,
  },
  actionButtonDeleteText: {
    color: '#ff3b30',
  },
  editContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editForm: {
    padding: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageModalImage: {
    width: width - 32,
    height: width - 32,
  },
});