import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

/**
 * Campo andino reusable (hoja clara): micro-label + icono + input + toggle + error.
 * Casa: `presentation/components/ui/` (vía `index.ts`).
 */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  accessibilityLabel?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  accessibilityLabel,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.microLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        {icon}
        <TextInput
          style={[styles.input, secureTextEntry ? styles.inputWithToggle : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.toggleButton}
            accessibilityRole="button"
            accessibilityLabel={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
            hitSlop={8}
          >
            {visible ? (
              <EyeOff size={16} color="#94a3b8" />
            ) : (
              <Eye size={16} color="#94a3b8" />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 12,
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faf9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  inputWithToggle: {
    paddingRight: 40,
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  error: {
    fontSize: 10,
    color: '#be123c',
    marginTop: 4,
  },
});
