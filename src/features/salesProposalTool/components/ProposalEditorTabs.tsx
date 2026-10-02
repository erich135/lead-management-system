import type { ReactNode } from 'react';
import { PROPOSAL_TABS, type ProposalTabId } from '../proposalTabs';

interface ProposalEditorTabsProps {
  active: ProposalTabId;
  onSelect: (id: ProposalTabId) => void;
  panels: Record<ProposalTabId, ReactNode>;
}

export function ProposalEditorTabs({ active, onSelect, panels }: ProposalEditorTabsProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Proposal sections">
        {PROPOSAL_TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`proposal-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`proposal-panel-${tab.id}`}
              onClick={() => onSelect(tab.id)}
              className={`rounded-[8px] px-3 py-2 text-sm font-bold ${
                selected
                  ? 'bg-[#f7c12b] text-[#383838]'
                  : 'bg-slate-100 text-[#383838] hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {PROPOSAL_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <section
            key={tab.id}
            role="tabpanel"
            id={`proposal-panel-${tab.id}`}
            aria-labelledby={`proposal-tab-${tab.id}`}
            hidden={!selected}
            ref={(node) => {
              if (node) node.inert = !selected;
            }}
            className="mt-4 space-y-6"
          >
            {panels[tab.id]}
          </section>
        );
      })}
    </div>
  );
}
