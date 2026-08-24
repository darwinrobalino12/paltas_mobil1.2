import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaStorage, Text } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { theme } from '../theme/tokens';
import { PlaceCard } from '../components/PlaceCard';
import { AsyncStateView } from '../components/AsyncStateView';
import { AppButton } from '../components/AppButton';

export const PuntosScreen = () => {
  const [puntos, setPuntos] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'success'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchPuntos = async () => {
    setStatus('loading');
    try {
      // Petición al backend de Node.js/Express
      const response = await fetch(`${API_BASE_URL}/puntos-rapido`);
      if (!response.ok) {
        throw new Error(`Error en el servidor: Código ${response.status}`);
      }
      const data = await response.json();
      
      // Validamos si la data está vacía
      if (!data || data.length === 0) {
        setStatus('empty');
      } else {
        setPuntos(data);
        setStatus('success');
      }
    } catch (error: any) {
      setErrorMsg('Verifique que el backend esté encendido y que el emulador tenga red.');
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchPuntos();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Puntos de Interés - Paltas</Text>
      
      <AsyncStateView status={status} errorMessage={errorMsg} onRetry={fetchPuntos}>
        <FlatList
          data={puntos}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item }) => (
            <PlaceCard 
              titulo={item.nombre} 
              categoria={item.categoria?.nombre || 'General'} 
              descripcion={item.descripcion}
              onPulsar={() => console.log('Punto seleccionado:', item.nombre)}
            />
          )}
        />
      </AsyncStateView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
});