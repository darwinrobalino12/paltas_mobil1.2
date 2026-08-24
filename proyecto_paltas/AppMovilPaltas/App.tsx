import React, { useState } from 'react';
import { StatusBar, StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from './src/config/api';
import { AppButton } from './src/components/AppButton';
import { AsyncStateView } from './src/components/AsyncStateView';
import { theme } from './src/theme'; // Corregido: Importa desde el index centralizado del theme

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'success' | 'idle'>('idle');
  const [error, setError] = useState<string | null>(null);

  const testApiConnection = async () => {
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/saludo`);
      const json = await response.json();
      setData(json);
      setStatus('success');
    } catch (err: any) {
      setError('No se pudo conectar al backend. ¿Está encendido el servidor?');
      setStatus('error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Taller Paltas - Componentes</Text>
        
        <AppButton title="Probar Solicitud a la API" onPress={testApiConnection} />

        <AsyncStateView status={status === 'idle' ? 'success' : status} errorMessage={error || ''}>
          {data && (
            <View style={styles.responseBox}>
              <Text style={styles.responseText}>Respuesta de la API:</Text>
              <Text>{JSON.stringify(data, null, 2)}</Text>
            </View>
          )}
        </AsyncStateView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: theme.colors.text },
  responseBox: { marginTop: 20, padding: 15, backgroundColor: '#fff', borderRadius: 8, width: '100%', borderWidth: 1, borderColor: '#ddd' },
  responseText: { fontWeight: 'bold', marginBottom: 5, color: theme.colors.text },
});

export default App;