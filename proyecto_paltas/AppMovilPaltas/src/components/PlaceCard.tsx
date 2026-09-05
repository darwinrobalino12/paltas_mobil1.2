import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../theme';
import { API_HOST } from '../config/api';

export interface PlaceCardProps {
  titulo: string;
  categoria: string;
  descripcion?: string;
  imagenUrl?: string | null;
  onPulsar?: () => void; // Devolución de llamada (callback) hacia afuera
}

export const PlaceCard = ({ titulo, categoria, descripcion, imagenUrl, onPulsar }: PlaceCardProps) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPulsar}
      accessible={true}
      accessibilityLabel={`Punto de interés: ${titulo}, categoría ${categoria}`}
    >
      <View style={styles.container}>
        {imagenUrl ? (
          <Image source={{ uri: `${API_HOST}${imagenUrl}` }} style={styles.thumbnail} />
        ) : null}
        <Text style={styles.category}>{categoria.toUpperCase()}</Text>
        <Text style={styles.title}>{titulo}</Text>
        {descripcion ? (
          <Text style={styles.description} numberOfLines={2}>{descripcion}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  container: {
    flexDirection: 'column',
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#EEEEEE',
  },
  category: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666666',
  },
});
