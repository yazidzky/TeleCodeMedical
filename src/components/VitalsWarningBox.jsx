import { AlertTriangle, AlertCircle, Info, Zap } from 'lucide-react';
import { WARNING_LEVEL_CLASSES } from '../utils/vitalsValidator';

const ICONS = {
  critical: Zap,
  high:     AlertTriangle,
  moderate: AlertCircle,
  info:     Info,
};

/**
 * Displays vital sign warnings as a styled list.
 * @param {{ warnings: import('../utils/vitalsValidator').VitalWarning[] }} props
 */
export default function VitalsWarningBox({ warnings }) {
  if (!warnings || warnings.length === 0) return null;

  // Group by highest severity level for border color
  const topLevel = warnings.reduce((acc, w) => {
    const order = { critical: 4, high: 3, moderate: 2, info: 1 };
    return (order[w.level] || 0) > (order[acc] || 0) ? w.level : acc;
  }, 'info');

  const cls = WARNING_LEVEL_CLASSES[topLevel];

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${cls.bg} ${cls.border}`} role="alert">
      <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${cls.text}`}>
        <Zap className="w-3.5 h-3.5" />
        Peringatan Tanda Vital
      </p>
      {warnings.map((w, i) => {
        const Icon = ICONS[w.level] || Info;
        const wCls = WARNING_LEVEL_CLASSES[w.level];
        return (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border ${wCls.bg} ${wCls.border}`}>
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${wCls.icon}`} />
            <p className={`text-xs font-semibold ${wCls.text}`}>
              {w.msgFallback}
            </p>
          </div>
        );
      })}
    </div>
  );
}
