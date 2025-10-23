import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  describeStakeholder,
  getStakeholderPermissions,
  type StakeholderType,
} from '@store/mobile-shared';

import { useAuth } from '../providers/AuthProvider';
import { roleToStakeholder } from '../utils/stakeholders';

export function HomeScreen() {
  const { user, permissions, refreshPermissions, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const stakeholder = useMemo<StakeholderType | null>(
    () => roleToStakeholder(user?.roleName),
    [user?.roleName],
  );

  const capabilityPermissions = useMemo(() => {
    if (!stakeholder) return [];
    return getStakeholderPermissions(stakeholder);
  }, [stakeholder]);

  const missingPermissions = capabilityPermissions.filter(
    (permission) => !permissions.includes(permission),
  );

  const extraPermissions = permissions.filter(
    (permission) => !capabilityPermissions.includes(permission),
  );

  const handleRefresh = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      await refreshPermissions();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        <Text style={styles.detail}>Role: {user?.roleName ?? 'Unknown'}</Text>
        <View style={styles.actions}>
          <ActionButton label="Refresh permissions" onPress={handleRefresh}>
            {refreshing && <ActivityIndicator color="#fff" size="small" />}
          </ActionButton>
          <ActionButton
            label="Sign out"
            variant="secondary"
            onPress={handleSignOut}
          />
        </View>
      </View>

      {stakeholder ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stakeholder profile</Text>
          <Text style={styles.detail}>{stakeholder}</Text>
          <Text style={styles.description}>
            {describeStakeholder(stakeholder)}
          </Text>
          <PermissionList
            title="Expected permissions"
            permissions={capabilityPermissions}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stakeholder profile</Text>
          <Text style={styles.detail}>Unable to infer from role assignment.</Text>
        </View>
      )}

      <PermissionList
        title="Granted permissions"
        permissions={permissions}
        highlightMissing={(permission) =>
          missingPermissions.includes(permission) ? 'missing' : undefined
        }
        highlightExtra={(permission) =>
          extraPermissions.includes(permission) ? 'extra' : undefined
        }
      />
    </ScrollView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
};

function ActionButton({
  label,
  onPress,
  variant = 'primary',
  children,
}: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
      {children}
    </Pressable>
  );
}

type PermissionListProps = {
  title: string;
  permissions: string[];
  highlightMissing?: (permission: string) => 'missing' | undefined;
  highlightExtra?: (permission: string) => 'extra' | undefined;
};

function PermissionList({
  title,
  permissions,
  highlightMissing,
  highlightExtra,
}: PermissionListProps) {
  if (!permissions.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.detailMuted}>No permissions available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {permissions.map((permission) => {
        const missingState = highlightMissing?.(permission);
        const extraState = highlightExtra?.(permission);
        const stateLabel = missingState
          ? 'missing'
          : extraState
          ? 'extra'
          : null;
        return (
          <View key={permission} style={styles.permissionRow}>
            <Text style={styles.permissionText}>{permission}</Text>
            {stateLabel && (
              <Text
                style={[
                  styles.permissionBadge,
                  stateLabel === 'missing'
                    ? styles.badgeMissing
                    : styles.badgeExtra,
                ]}
              >
                {stateLabel}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f4f6fb',
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#475467',
  },
  detail: {
    fontSize: 15,
    color: '#1f2937',
  },
  detailMuted: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    backgroundColor: '#e11d48',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#ffffff',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#111827',
  },
  permissionBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  badgeMissing: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeExtra: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
});
