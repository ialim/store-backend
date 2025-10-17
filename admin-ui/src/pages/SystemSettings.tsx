import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Switch,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import {
  SystemSettingValueSource,
  SystemSettingValueType,
  SystemSettingsQuery,
  useSystemSettingsQuery,
  useUpdateSystemSettingMutation,
} from '../generated/graphql';
import { notify } from '../shared/notify';

type DraftValue = {
  value: number | boolean | string;
  dirty: boolean;
};

type SettingRow = NonNullable<
  SystemSettingsQuery['systemSettingsList']
>[number];
type SettingKey = SettingRow['key'];

const SOURCE_LABELS: Record<SystemSettingValueSource, string> = {
  [SystemSettingValueSource.Database]: 'Overrides',
  [SystemSettingValueSource.Environment]: 'Environment',
  [SystemSettingValueSource.Default]: 'Default',
};

function titleCaseFromKey(key: string) {
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  return String(value);
}

export default function SystemSettingsPage() {
  const { data, loading, error, refetch } = useSystemSettingsQuery({
    fetchPolicy: 'cache-and-network' as any,
  });
  const [updateSetting] = useUpdateSystemSettingMutation();
  const [savingKey, setSavingKey] = React.useState<SettingKey | null>(null);
  const [drafts, setDrafts] = React.useState<
    Partial<Record<SettingKey, DraftValue>>
  >({});

  React.useEffect(() => {
    if (!data?.systemSettingsList) return;
    setDrafts((current) => {
      const next: Partial<Record<SettingKey, DraftValue>> = { ...current };
      data.systemSettingsList.forEach((setting) => {
        if (current[setting.key]?.dirty) {
          return;
        }
        const value = getCurrentValue(setting);
        next[setting.key] = { value, dirty: false };
      });
      return next;
    });
  }, [data?.systemSettingsList]);

  const handleValueChange = React.useCallback(
    (key: SettingKey, value: number | boolean | string) => {
      setDrafts((prev) => ({
        ...prev,
        [key]: {
          value,
          dirty: true,
        },
      }));
    },
    [],
  );

  const handleSave = React.useCallback(
    async (settingKey: SettingKey, valueType: SystemSettingValueType) => {
      const draft = drafts[settingKey];
      const payload = draft?.value ?? null;
      if (payload === null) {
        notify('No value to save', 'warning');
        return;
      }
      setSavingKey(settingKey);
      try {
        const input: any = { key: settingKey };
        if (valueType === SystemSettingValueType.Number) {
          input.numberValue = Number(payload);
        } else if (valueType === SystemSettingValueType.Boolean) {
          input.booleanValue = Boolean(payload);
        } else {
          input.stringValue = String(payload);
        }
        await updateSetting({ variables: { input } });
        notify('Setting updated', 'success');
        await refetch();
        setDrafts((prev) => ({
          ...prev,
          [settingKey]: {
            value: payload,
            dirty: false,
          },
        }));
      } catch (err: any) {
        notify(err?.message || 'Failed to update setting', 'error');
      } finally {
        setSavingKey(null);
      }
    },
    [drafts, refetch, updateSetting],
  );

  const handleReset = React.useCallback(
    async (settingKey: SettingKey) => {
      setSavingKey(settingKey);
      try {
        await updateSetting({
          variables: { input: { key: settingKey, reset: true } },
        });
        notify('Setting reset to default', 'success');
        await refetch();
        setDrafts((prev) => ({
          ...prev,
          [settingKey]: {
            value: prev[settingKey]?.value ?? null,
            dirty: false,
          },
        }));
      } catch (err: any) {
        notify(err?.message || 'Failed to reset setting', 'error');
      } finally {
        setSavingKey(null);
      }
    },
    [refetch, updateSetting],
  );

  if (loading && !data?.systemSettingsList) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error.message}
      </Alert>
    );
  }

  const settings = data?.systemSettingsList ?? [];

  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tune workflow thresholds and operational defaults for the
          organization. Changes apply immediately and override environment
          defaults.
        </Typography>
      </Box>

      {settings.map((setting) => {
        const draft = drafts[setting.key];
        const draftValue = draft?.value ?? getCurrentValue(setting);
        const dirty = Boolean(draft?.dirty);
        const metadata = (setting.metadata || {}) as Record<string, unknown>;
        const min = typeof metadata.min === 'number' ? metadata.min : undefined;
        const max = typeof metadata.max === 'number' ? metadata.max : undefined;
        const step =
          typeof metadata.step === 'number' ? metadata.step : undefined;
        const loadingSetting = savingKey === setting.key;
        const lastUpdated = setting.updatedAt
          ? format(new Date(setting.updatedAt), 'MMM d, yyyy h:mm a')
          : null;

        return (
          <Card key={setting.key} variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {titleCaseFromKey(setting.key)}
                    </Typography>
                    <Chip
                      size="small"
                      label={SOURCE_LABELS[setting.source] || setting.source}
                      color={
                        setting.source === SystemSettingValueSource.Database
                          ? 'primary'
                          : setting.source ===
                              SystemSettingValueSource.Environment
                            ? 'secondary'
                            : 'default'
                      }
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {setting.description}
                  </Typography>
                </Box>

                {setting.valueType === SystemSettingValueType.Number && (
                  <TextField
                    type="number"
                    label="Current value"
                    value={draftValue as number}
                    onChange={(event) =>
                      handleValueChange(setting.key, Number(event.target.value))
                    }
                    inputProps={{ min, max, step }}
                    sx={{ maxWidth: 240 }}
                  />
                )}

                {setting.valueType === SystemSettingValueType.Boolean && (
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2">Disabled</Typography>
                    <Switch
                      checked={Boolean(draftValue)}
                      onChange={(event) =>
                        handleValueChange(setting.key, event.target.checked)
                      }
                      color="primary"
                    />
                    <Typography variant="body2">Enabled</Typography>
                  </Stack>
                )}

                {setting.valueType === SystemSettingValueType.String && (
                  <TextField
                    label="Current value"
                    value={draftValue as string}
                    onChange={(event) =>
                      handleValueChange(setting.key, event.target.value)
                    }
                    fullWidth
                  />
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    disabled={loadingSetting || !dirty}
                    onClick={() => handleSave(setting.key, setting.valueType)}
                  >
                    {loadingSetting ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={loadingSetting}
                    onClick={() => handleReset(setting.key)}
                  >
                    Reset to default
                  </Button>
                </Stack>

                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Default:{' '}
                    {formatValue(
                      setting.defaultBooleanValue ??
                        setting.defaultNumberValue ??
                        setting.defaultStringValue,
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Environment override:{' '}
                    {formatValue(
                      setting.envBooleanValue ??
                        setting.envNumberValue ??
                        setting.envStringValue,
                    )}
                  </Typography>
                  {lastUpdated && (
                    <Typography variant="caption" color="text.secondary">
                      Last updated {lastUpdated}
                      {setting.updatedBy?.fullName
                        ? ` by ${setting.updatedBy.fullName}`
                        : setting.updatedBy?.email
                          ? ` by ${setting.updatedBy.email}`
                          : ''}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function getCurrentValue(setting: {
  valueType: SystemSettingValueType;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  stringValue?: string | null;
  defaultNumberValue?: number | null;
  defaultBooleanValue?: boolean | null;
  defaultStringValue?: string | null;
  envNumberValue?: number | null;
  envBooleanValue?: boolean | null;
  envStringValue?: string | null;
}): number | boolean | string {
  if (setting.valueType === SystemSettingValueType.Number) {
    return (
      setting.numberValue ??
      setting.envNumberValue ??
      setting.defaultNumberValue ??
      0
    );
  }
  if (setting.valueType === SystemSettingValueType.Boolean) {
    return (
      setting.booleanValue ??
      setting.envBooleanValue ??
      setting.defaultBooleanValue ??
      false
    );
  }
  return (
    setting.stringValue ??
    setting.envStringValue ??
    setting.defaultStringValue ??
    ''
  );
}
