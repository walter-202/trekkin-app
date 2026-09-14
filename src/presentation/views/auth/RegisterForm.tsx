import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User, Mail, AtSign, Lock, Shield, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { RegisterSchema } from '../../../core/domain/auth.schemas';
import { Field, Button, Banner } from '../../components/ui';

interface RegisterFormProps {
  onSuccess: () => void;
}

/** HU-01 — Dueño de su estado + validación Zod (6 campos C2) + submit. */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const validation = RegisterSchema.safeParse({
      displayName: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password,
      confirmPassword,
      acceptTerms,
    });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? 'Revisa los datos ingresados.');
      return;
    }
    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password, username.trim());
      setSuccessMessage('¡Cuenta creada exitosamente! Bienvenido a Trekking Bolivia.');
      setTimeout(onSuccess, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al crear la cuenta. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      {errorMessage ? <Banner tone="error" message={errorMessage} /> : null}
      {successMessage ? <Banner tone="success" message={successMessage} /> : null}
      <Field
        label="NOMBRE COMPLETO"
        value={name}
        onChangeText={setName}
        placeholder="Ej. Mateo Condori"
        icon={<User size={16} color="#94a3b8" />}
        autoCapitalize="words"
      />
      <Field
        label="CORREO ELECTRÓNICO"
        value={email}
        onChangeText={setEmail}
        placeholder="andino@trekbolivia.bo"
        icon={<Mail size={16} color="#94a3b8" />}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="USUARIO"
        value={username}
        onChangeText={setUsername}
        placeholder="caminante_bolivia"
        icon={<AtSign size={16} color="#94a3b8" />}
        autoCapitalize="none"
      />
      <Field
        label="CONTRASEÑA"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        icon={<Lock size={16} color="#94a3b8" />}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="VERIFICAR CONTRASEÑA"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite tu contraseña"
        icon={<Shield size={16} color="#94a3b8" />}
        secureTextEntry
        autoCapitalize="none"
      />
      <Pressable
        onPress={() => setAcceptTerms(!acceptTerms)}
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityLabel="Aceptar términos y normas de seguridad en montaña"
        accessibilityState={{ checked: acceptTerms }}
      >
        <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
          {acceptTerms && <CheckCircle2 size={14} color="#ffffff" />}
        </View>
        <Text style={styles.termsText}>
          Acepto los <Text style={styles.termsLink}>términos de servicio</Text> y las{' '}
          <Text style={styles.termsLink}>normas de seguridad en montaña</Text>.
        </Text>
      </Pressable>
      <Button title="CREAR CUENTA" onPress={handleSubmit} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
    minHeight: 44,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#064e3b',
    borderColor: '#064e3b',
  },
  termsText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  termsLink: {
    color: '#064e3b',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
