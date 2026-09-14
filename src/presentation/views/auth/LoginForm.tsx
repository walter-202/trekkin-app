import React, { useState } from 'react';
import { View } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { LoginSchema } from '../../../core/domain/auth.schemas';
import { Field, Button, Banner } from '../../components/ui';

interface LoginFormProps {
  onSuccess: () => void;
}

/** HU-02 — Dueño de su estado + validación Zod + submit. No sabe de navegación. */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const validation = LoginSchema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? 'Revisa los datos ingresados.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      setSuccessMessage('Sesión iniciada correctamente.');
      setTimeout(onSuccess, 800);
    } catch (err: any) {
      // HU-02 C4/C6: bloqueada muestra su motivo; resto → credenciales inválidas, sin sesión.
      const msg = String(err?.message || '');
      setErrorMessage(
        msg.includes('bloqueada') ? msg : 'Credenciales inválidas. Verifica tu correo y contraseña.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      {errorMessage ? <Banner tone="error" message={errorMessage} /> : null}
      {successMessage ? <Banner tone="success" message={successMessage} /> : null}
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
        label="CONTRASEÑA"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        icon={<Lock size={16} color="#94a3b8" />}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button title="INICIAR SESIÓN" onPress={handleSubmit} loading={isLoading} />
    </View>
  );
};
