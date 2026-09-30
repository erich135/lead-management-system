import React from 'react';

interface CustomerMasterUpdatePromptProps {
  visible: boolean;
  saving?: boolean;
  onUpdateCustomer: () => void;
  onUseForThisVisit: () => void;
}

/**
 * Asks whether edited visit contact details should also update the customer profile.
 */
export const CustomerMasterUpdatePrompt: React.FC<CustomerMasterUpdatePromptProps> = ({
  visible,
  saving = false,
  onUpdateCustomer,
  onUseForThisVisit,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/55 p-4 sm:items-center">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-master-update-title"
      >
        <div className="px-5 py-5">
          <h2 id="customer-master-update-title" className="text-lg font-extrabold text-slate-900">
            Customer details have changed
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Do you want to update the saved customer profile with these changes?
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onUpdateCustomer}
              disabled={saving}
              className="rounded-xl bg-[#0969a9] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#075a8f] disabled:opacity-50"
            >
              Update Customer Details
            </button>
            <button
              type="button"
              onClick={onUseForThisVisit}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Use for This Visit Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerMasterUpdatePrompt;
