import { useState } from 'react';
import { Image, Calendar } from '../../../lib/icons';
import { MediaTab } from './MediaTab';
import { PlanificationTab } from './PlanificationTab';

const SUB_TABS = [
  { key: 'medias', label: 'Médias', Icon: Image },
  { key: 'planification', label: 'Planification Culte', Icon: Calendar },
] as const;
type SubTab = typeof SUB_TABS[number]['key'];

export function MediaCommunicationTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('medias');

  return (
    <div className="space-y-6">
      {/* Internal sub-tab navigation */}
      <div className="flex items-center gap-1 border-b border-line pb-0">
        {SUB_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeSubTab === key
                ? 'border-accent-400 text-accent-400'
                : 'border-transparent text-muted hover:text-cream'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'medias' && <MediaTab />}
      {activeSubTab === 'planification' && <PlanificationTab />}
    </div>
  );
}