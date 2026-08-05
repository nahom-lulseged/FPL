import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import {
  useAlertConfigs,
  useSendTestAlert,
  useUpdateAlertConfigs,
} from '@/hooks/useSystem';
import { useToast } from '@/store/toastStore';
import type { AlertConfigItem, AlertType } from '@/types/system';
import { getErrorMessage } from '@/types/api';

const ALERT_LABELS: Record<AlertType, string> = {
  INGESTION_FAILURE: 'Ingestion failure',
  QUEUE_BACKUP: 'Queue backup (failed jobs exceed threshold)',
  HIGH_ERROR_RATE: 'High error rate',
};

export function AlertSettingsPage() {
  const { data: configs, isLoading } = useAlertConfigs();
  const updateMutation = useUpdateAlertConfigs();
  const testMutation = useSendTestAlert();
  const toast = useToast();
  const [form, setForm] = useState<AlertConfigItem[]>([]);

  useEffect(() => {
    if (configs) {
      setForm(configs);
    }
  }, [configs]);

  function updateRow(alertType: AlertType, patch: Partial<AlertConfigItem>) {
    setForm((prev) =>
      prev.map((row) => (row.alertType === alertType ? { ...row, ...patch } : row)),
    );
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync(form);
      toast.success('Alert settings saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleTest() {
    try {
      const result = await testMutation.mutateAsync();
      if (result.sent) {
        toast.success('Test alert sent — check your webhook');
      } else {
        toast.error('Test alert not sent — enable INGESTION_FAILURE with a valid webhook URL');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-fpl-gray-500">Loading alert settings…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-fpl-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-fpl-gray-900">Webhook Alerts</h2>
        <p className="mt-1 text-sm text-fpl-gray-500">
          Configure Slack or Discord webhook URLs for operational alerts.
        </p>

        <div className="mt-4 space-y-4">
          {form.map((row) => (
            <div
              key={row.alertType}
              className="rounded-md border border-fpl-gray-100 p-3"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-fpl-gray-900">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => updateRow(row.alertType, { enabled: e.target.checked })}
                  className="rounded border-fpl-gray-300"
                />
                {ALERT_LABELS[row.alertType]}
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={row.webhookUrl}
                onChange={(e) => updateRow(row.alertType, { webhookUrl: e.target.value })}
                className="mt-2 w-full rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            Save settings
          </Button>
          <Button variant="secondary" onClick={handleTest} disabled={testMutation.isPending}>
            Send test alert
          </Button>
        </div>
      </div>
    </div>
  );
}
