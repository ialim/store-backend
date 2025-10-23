import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { colors, nativeFontFamilies, fontSizes } from '@store/design-tokens';
import { Screen, Card, TextField, Button } from '@store/ui';
import { useAuth } from '../providers/AuthProvider';

export function LoginScreen() {
  const { signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const disabled = submitting || status === 'checking';

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email is required';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) return 'Enter a valid email address';
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password should be at least 6 characters';
    return null;
  };

  const handleSubmit = async () => {
    if (disabled) return;

    const trimmedEmail = email.trim();
    const nextEmailError = validateEmail(trimmedEmail);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      await signIn(trimmedEmail, password);
    } catch (error: any) {
      const message = error?.message ?? 'Unable to sign in. Please check your credentials.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.keyboardAvoider}
    >
      <Screen style={styles.screen}>
        <Card style={styles.card} padding="xl">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Please sign in to continue</Text>
          <TextField
            label="Email"
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) setEmailError(validateEmail(value));
            }}
            editable={!disabled}
            helperText={emailError ?? ' '}
            error={Boolean(emailError)}
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError(validatePassword(value));
            }}
            editable={!disabled}
            helperText={passwordError ?? ' '}
            error={Boolean(passwordError)}
          />
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Button
            label={submitting ? 'Signing in…' : 'Continue'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={disabled}
            fullWidth
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  screen: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: nativeFontFamilies.sans,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontFamily: nativeFontFamilies.sans,
    color: colors.neutral.textSecondary,
    marginBottom: 8,
  },
  formError: {
    color: '#d92d20',
    fontFamily: nativeFontFamilies.sans,
    fontSize: fontSizes.sm,
  },
});
