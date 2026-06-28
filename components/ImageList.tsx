import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width / 3 - 8;

interface ImageListProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export const ImageList: React.FC<ImageListProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на доступ к галерее');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Ошибка', `Максимум ${maxImages} изображений`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Сжатие изображения
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            { resize: { width: 800 } },
          ],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        onImagesChange([...images, manipulatedImage.uri]);
      }
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить изображение');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Ошибка', `Максимум ${maxImages} изображений`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на использование камеры');
      return;
    }

    try {
      setLoading(true);
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            { resize: { width: 800 } },
          ],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        onImagesChange([...images, manipulatedImage.uri]);
      }
    } catch (error) {
      console.error('Ошибка съемки:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = (index: number) => {
    Alert.alert(
      'Удалить изображение?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const newImages = [...images];
            newImages.splice(index, 1);
            onImagesChange(newImages);
          },
        },
      ]
    );
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={() => {
        setSelectedImage(item);
        setModalVisible(true);
      }}
      onLongPress={() => deleteImage(index)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
      <View style={styles.imageOverlay}>
        <Text style={styles.imageNumber}>{index + 1}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAddButton = () => (
    <TouchableOpacity style={styles.addButton} onPress={pickImage}>
      <Text style={styles.addButtonIcon}>+</Text>
      <Text style={styles.addButtonText}>Добавить фото</Text>
    </TouchableOpacity>
  );

  const renderCameraButton = () => (
    <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
      <Text style={styles.cameraButtonIcon}>☆</Text>
      <Text style={styles.cameraButtonText}>Снять</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Фотографии ({images.length}/{maxImages})
        </Text>
        <View style={styles.headerButtons}>
          {images.length < maxImages && renderCameraButton()}
          {images.length < maxImages && renderAddButton()}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      )}

      {images.length > 0 ? (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `image-${index}`}
          numColumns={3}
          contentContainerStyle={styles.imageList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>☆</Text>
          <Text style={styles.emptyTitle}>Нет фотографий</Text>
          <Text style={styles.emptyDescription}>
            Добавьте фото с помощью кнопки выше
          </Text>
        </View>
      )}

      {/* Модальное окно для просмотра изображения */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  cameraButtonIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  imageList: {
    padding: 4,
  },
  imageContainer: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  imageNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
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
  modalCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalImage: {
    width: width - 32,
    height: width - 32,
    borderRadius: 8,
  },
});