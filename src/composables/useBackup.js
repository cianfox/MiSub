import { useDataStore } from '../stores/useDataStore';
import { useToastStore } from '../stores/toast';
import { useManualNodes } from './useManualNodes';

export function useBackup() {
  const dataStore = useDataStore();
  const { showToast } = useToastStore();

  // 获取数据 - 与经典布局完全相同的方式
  const { subscriptions, profiles } = dataStore;
  const { manualNodes } = useManualNodes(() => { });

  const exportBackup = () => {
    try {
      const backupData = {
        subscriptions: subscriptions || [],
        manualNodes: manualNodes.value || [],
        profiles: profiles || [],
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
      a.download = `misub-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('备份已成功导出', 'success');
    } catch (error) {
      console.error('Backup export failed:', error);
      showToast('备份导出失败', 'error');
    }
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          // 数据验证
          if (!backupData || !Array.isArray(backupData.subscriptions)) {
            throw new Error('无效的备份文件格式');
          }

          if (confirm('这将覆盖您当前的所有数据，确定要从备份中恢复吗？')) {
            // 合并订阅和手动节点
            const merged = [...(backupData.subscriptions || []), ...(backupData.manualNodes || [])];
            dataStore.overwriteSubscriptions(merged);
            dataStore.overwriteProfiles(backupData.profiles || []);
            dataStore.markDirty();
            showToast('数据已恢复，请保存', 'success');
          }
        } catch (error) {
          console.error('Backup import failed:', error);
          showToast(`备份导入失败: ${error.message}`, 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  return {
    exportBackup,
    importBackup,
  };
}
