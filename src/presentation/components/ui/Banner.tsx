import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';

/**
 * Banner de estado (hoja clara): error rosado / éxito esmeralda.
 * Para errores por campo usar `Field error=`.
 */
interface BannerProps {
  tone: 'error' | 'success';
  message: string;
}

export const Banner: React.FC<BannerProps> = ({ tone, message }) => {
  const isError = tone === 'error';
  return (
    <View
      style={[styles.base, isError ? styles.error : styles.success]}
      accessibilityRole="alert"
    >
      {isError ? (
        <AlertCircle size={16} color="#e11d48" />
      ) : (
        <CheckCircle2 size={16} color="#059669" />
      )}
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  error: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  success: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  text: {
    fontSize: 11,
    flex: 1,
  },
  errorText: {
    color: '#be123c',
    fontWeight: '500',
  },
  successText: {
    color: '#047857',
    fontWeight: '600',
  },
});
