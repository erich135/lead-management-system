import React from 'react';
import DiaryHistoryView from '../components/diary/DiaryHistoryView';

interface MobileRepHistoryProps {
  onExit?: () => void;
}

/**
 * Mobile History tab for completed visits / approval outcomes.
 */
const MobileRepHistory: React.FC<MobileRepHistoryProps> = ({ onExit }) => {
  return (
    <div className="mobile-rep-rise px-3 pb-4 pt-4">
      <div className="mb-3 px-1">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900">History</h1>
        <p className="mt-0.5 text-sm font-medium text-slate-500">Completed visits and submissions</p>
      </div>
      <div className="mobile-rep-card overflow-hidden rounded-2xl">
        <DiaryHistoryView onExit={onExit || (() => undefined)} />
      </div>
    </div>
  );
};

export default MobileRepHistory;
