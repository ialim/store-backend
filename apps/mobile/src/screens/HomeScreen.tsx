import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  describeStakeholder,
  getStakeholderPermissions,
  type StakeholderType,
} from '@store/mobile-shared';
import { Screen, NavBar, Card, Button, ListItem, Tag } from '@store/ui';

import { useAuth } from '../providers/AuthProvider';
import { roleToStakeholder } from '../utils/stakeholders';

export function HomeScreen(): JSX.Element {
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
    <Screen padded={false}>
      <NavBar
        title="Dashboard"
        subtitle={stakeholder ? `${stakeholder} workspace` : undefined}
        rightSlot={<Button label="Sign out" variant="ghost" onPress={handleSignOut} />}
        showDivider
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card padding="xl" style={styles.block}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.detail}>{user?.email}</Text>
          <Text style={styles.detail}>Role: {user?.roleName ?? 'Unknown'}</Text>
          <View style={styles.actions}>
            <Button
              label={refreshing ? 'Refreshing…' : 'Refresh permissions'}
              loading={refreshing}
              onPress={handleRefresh}
              fullWidth
            />
            <Button label="Sign out" variant="secondary" onPress={handleSignOut} fullWidth />
          </View>
        </Card>

        <Card padding="xl" style={styles.block}>
          <Text style={styles.sectionTitle}>Stakeholder profile</Text>
          {stakeholder ? (
            <>
              <Text style={styles.detail}>{stakeholder}</Text>
              <Text style={styles.description}>{describeStakeholder(stakeholder)}</Text>
              <PermissionList
                title="Expected permissions"
                permissions={capabilityPermissions}
                highlightMissing={() => undefined}
                highlightExtra={() => undefined}
              />
            </>
          ) : (
            <Text style={styles.detail}>Unable to infer from role assignment.</Text>
          )}
        </Card>

        <Card padding="xl" style={styles.block}>
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
        </Card>
      </ScrollView>
    </Screen>
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
}: PermissionListProps): JSX.Element {
  return (
    <View style={styles.permissionSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!permissions.length ? (
        <Text style={styles.detailMuted}>No permissions available.</Text>
      ) : (
        <View style={styles.permissionList}>
          {permissions.map((permission) => {
            const missingState = highlightMissing?.(permission);
            const extraState = highlightExtra?.(permission);

            let statusTag: React.ReactNode = null;
            if (missingState) {
              statusTag = <Tag label="Missing" variant="danger" tone="subtle" uppercase />;
            } else if (extraState) {
              statusTag = <Tag label="Extra" variant="info" tone="subtle" uppercase />;
            } else {
              statusTag = <Tag label="Aligned" variant="success" tone="subtle" uppercase />;
            }

            return (
              <ListItem
                key={permission}
                title={permission}
                trailing={statusTag}
                disabled={Boolean(missingState)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  block: {
    gap: 16,
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
    gap: 12,
  },
  permissionSection: {
    gap: 12,
  },
  permissionList: {
    gap: 12,
  },
});
