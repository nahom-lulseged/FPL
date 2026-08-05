import { useState } from 'react';
import { Button } from '@/components/common/Button';
import {
  downloadBlob,
  exportEntityCsv,
  exportFilename,
} from '@/api/analytics.api';
import { useToast } from '@/store/toastStore';
import { getErrorMessage } from '@/types/api';
import type { ExportEntity } from '@/types/analytics';

interface CsvExportButtonProps {
  entity: ExportEntity;
  label?: string;
}

export function CsvExportButton({ entity, label = 'Export CSV' }: CsvExportButtonProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const blob = await exportEntityCsv(entity);
      downloadBlob(blob, exportFilename(entity));
      toast.success(`${label} downloaded`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export CSV'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="secondary" isLoading={isLoading} onClick={() => void handleExport()}>
      {label}
    </Button>
  );
}
