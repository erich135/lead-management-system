/**
 * Shared empty states for the overdue jobs dashboard.
 * Keeping them isolated lets designers restyle the hero illustrations easily.
 */
import { CheckCircle2, FileText } from 'lucide-react';

export function AllClearState() {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-pulse">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold text-green-900 mb-2">All Clear! 🎉</h3>
      <p className="text-green-700 mb-4">No jobs need attention right now. Great job!</p>
      <div className="mt-6 p-4 bg-white/60 rounded-lg text-left max-w-md mx-auto">
        <p className="text-sm text-green-800 font-medium mb-2">What does this mean?</p>
        <p className="text-xs text-green-700">
          This means all your jobs are on track or have already moved to their next status within the
          expected timeframes. The system automatically tracks when jobs should progress based on
          your conditional formatting rules.
        </p>
      </div>
    </div>
  );
}

export function NoCategoryState() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
        <FileText className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-blue-900 mb-2">No Jobs in This Category</h3>
      <p className="text-blue-700 mb-4">Try selecting a different priority filter above.</p>
    </div>
  );
}

