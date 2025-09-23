import * as React from 'react';
import { Modal, TextInput, Select, Button, Stack, Group } from '@mantine/core';
import { AdminApi } from '@/utils/api';
import { notifications } from '@mantine/notifications';

export default function CreateAdminModal({
  opened, onClose, onCreated,
}: { opened: boolean; onClose: () => void; onCreated: () => void; }) {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<string | null>('admin');
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const res = await AdminApi.createAdmin({ email, displayName: name, role: role || 'admin' });
      if (!res.ok) throw new Error(res.error || 'Create failed');
      notifications.show({ color: 'green', title: 'Admin created', message: 'Invite link copied to clipboard.' });
      if (res.data?.inviteLink) await navigator.clipboard.writeText(res.data.inviteLink);
      onClose(); onCreated();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      notifications.show({ color: 'red', title: 'Error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create admin">
      <Stack>
        <TextInput label="Email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required/>
        <TextInput label="Name" value={name} onChange={(e)=>setName(e.currentTarget.value)} />
        <Select label="Role" value={role} onChange={setRole}
                data={['super_admin','admin','analyst','viewer'].map(v=>({value:v,label:v}))}/>
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>Create & invite</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
