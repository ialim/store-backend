import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';
import {
  useRolesQuery,
  useRolePermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  RolesQuery,
  RolePermissionsQuery,
} from '../generated/graphql';
import { PERMISSIONS, permissionList } from '../shared/permissions';

const LOCKED_ROLE_NAMES = new Set(['SUPERADMIN']);

type RoleRow = NonNullable<RolesQuery['roles']>[number];
type PermissionRow = NonNullable<
  NonNullable<RolePermissionsQuery['rolePermissions']>[number]
>;

function groupPermissions(
  permissions: RolePermissionsQuery['rolePermissions'] | undefined,
) {
  const entries: Record<string, PermissionRow[]> = {};
  (permissions ?? [])
    .filter((perm): perm is PermissionRow => Boolean(perm))
    .forEach((perm) => {
      const key = perm.module || 'General';
      if (!entries[key]) {
        entries[key] = [];
      }
      entries[key].push(perm);
    });
  return Object.entries(entries).map(([module, perms]) => ({
    module,
    permissions: perms.sort((a, b) =>
      (a.action || '').localeCompare(b.action || ''),
    ),
  }));
}

export default function Roles() {
  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRolesQuery({ fetchPolicy: 'cache-and-network' as any });
  const { data: permissionData, loading: permissionsLoading } =
    useRolePermissionsQuery({ fetchPolicy: 'cache-first' as any });
  const [createRole, { loading: creating }] = useCreateRoleMutation();
  const [updateRole, { loading: updating }] = useUpdateRoleMutation();
  const [deleteRole, { loading: deleting }] = useDeleteRoleMutation();

  const permissionGroups = React.useMemo(
    () => groupPermissions(permissionData?.rolePermissions),
    [permissionData?.rolePermissions],
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleRow | null>(null);
  const [roleName, setRoleName] = React.useState('');
  const [roleDescription, setRoleDescription] = React.useState('');
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    string[]
  >([]);

  const isLocked = React.useMemo(
    () => (editingRole ? LOCKED_ROLE_NAMES.has(editingRole.name) : false),
    [editingRole],
  );

  const openCreateDialog = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleRow) => {
    setEditingRole(role);
    setRoleName(role.name ?? '');
    setRoleDescription(role.description ?? '');
    setSelectedPermissions(
      (role.permissions ?? []).map((perm) => perm?.name || '').filter(Boolean),
    );
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (creating || updating) return;
    setDialogOpen(false);
  };

  const togglePermission = (permissionName: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionName)
        ? prev.filter((item) => item !== permissionName)
        : [...prev, permissionName],
    );
  };

  const handleSubmit = async () => {
    const input = {
      name: roleName,
      description: roleDescription,
      permissionNames: selectedPermissions,
    };
    try {
      if (editingRole) {
        await updateRole({
          variables: { roleId: editingRole.id, input },
        });
        notify('Role updated', 'success');
      } else {
        await createRole({ variables: { input } });
        notify('Role created', 'success');
      }
      setDialogOpen(false);
      await refetchRoles();
    } catch (error: any) {
      notify(error?.message || 'Failed to save role', 'error');
    }
  };

  const handleDelete = async (role: RoleRow) => {
    if (LOCKED_ROLE_NAMES.has(role.name || '')) {
      notify('This role cannot be deleted', 'warning');
      return;
    }
    if (
      !window.confirm(
        `Delete role "${role.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteRole({ variables: { roleId: role.id } });
      notify('Role deleted', 'success');
      await refetchRoles();
    } catch (error: any) {
      notify(error?.message || 'Failed to delete role', 'error');
    }
  };

  const rows = rolesData?.roles ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Roles & Permissions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Define role-based access by assigning standardized permissions to each
          role.
        </Typography>
      </Box>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={openCreateDialog}
          disabled={permissionsLoading}
        >
          New Role
        </Button>
      </Stack>

      <Card>
        <CardContent>
          {rolesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {rolesError.message}
            </Alert>
          )}
          <TableList<RoleRow>
            columns={[
              { key: 'name', label: 'Name', sort: true, filter: true },
              {
                key: 'description',
                label: 'Description',
                render: (row) => row.description || '—',
              },
              {
                key: 'permissionCount',
                label: 'Permissions',
                render: (row) => row.permissions?.length ?? 0,
              },
              {
                key: 'createdAt',
                label: 'Created',
                render: (row) =>
                  row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : '—',
              },
            ]}
            rows={rows}
            loading={rolesLoading || deleting}
            emptyMessage="No roles created yet."
            getRowKey={(row) => row.id}
            actions={{
              label: 'Actions',
              edit: {
                onClick: (row) => openEditDialog(row),
                permission: permissionList(PERMISSIONS.role.UPDATE),
                hidden: (row) => LOCKED_ROLE_NAMES.has(row.name || ''),
              },
              delete: {
                onClick: (row) => handleDelete(row),
                permission: permissionList(PERMISSIONS.role.DELETE),
                hidden: (row) => LOCKED_ROLE_NAMES.has(row.name || ''),
              },
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Role Name"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              disabled={creating || updating || isLocked}
              helperText="Stored as uppercase identifier"
            />
            <TextField
              label="Description"
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              disabled={creating || updating}
              multiline
              minRows={2}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Permissions
              </Typography>
              <Stack spacing={1}>
                {permissionGroups.map((group) => (
                  <Card key={group.module} variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {group.module}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        {group.permissions.map((perm) => (
                          <FormControlLabel
                            key={perm.name}
                            control={
                              <Checkbox
                                checked={selectedPermissions.includes(
                                  perm.name,
                                )}
                                onChange={() => togglePermission(perm.name)}
                                disabled={creating || updating || isLocked}
                              />
                            }
                            label={`${perm.action || ''}`}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={creating || updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              creating ||
              updating ||
              !roleName.trim() ||
              permissionsLoading ||
              isLocked
            }
          >
            {editingRole ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
