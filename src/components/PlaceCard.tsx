import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface PlaceCardProps {
  titulo: string;
  categoria: string;
  descripcion?: string;
  onPulsar?: () => void; // Devolución de llamada (callback) hacia afuera
}

export const PlaceCard = ({ titulo, categoria, descripcion, onPulsar }: PlaceCardProps) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPulsar}
      accessible={true}
      accessibilityLabel={`Punto de interés: ${titulo}, categoría ${categoria}`}
    >
      <View style={styles.container}>
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
