/**
 * BranchPermissionsSection.tsx
 * 
 * React component for managing branch-based data visibility permissions.
 * This component displays a list of branches with checkboxes, allowing admins
 * to select which branches a user can access.
 * 
 * Usage:
 * <BranchPermissionsSection 
 *   branches={allBranches}
 *   selectedBranches={userBranches}
 *   onChange={setUserBranches}
 *   isLoading={isLoading}
 * />
 */

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Branch {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  isActive?: boolean;
}

interface BranchPermissionsSectionProps {
  branches: Branch[];
  selectedBranches: string[];
  onChange: (branches: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function BranchPermissionsSection({
  branches,
  selectedBranches,
  onChange,
  isLoading = false,
  disabled = false,
}: BranchPermissionsSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  // Update selectAll state when selectedBranches changes
  useEffect(() => {
    const allSelected =
      branches.length > 0 && selectedBranches.length === branches.length;
    setSelectAll(allSelected);
  }, [selectedBranches, branches.length]);

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all - but this actually means "access all branches" since empty array = all
      onChange([]);
      setSelectAll(false);
    } else {
      // Select all branches
      onChange(branches.map((b) => b._id));
      setSelectAll(true);
    }
  };

  const handleBranchToggle = (branchId: string) => {
    if (selectedBranches.includes(branchId)) {
      // Remove branch
      const updated = selectedBranches.filter((id) => id !== branchId);
      onChange(updated);
    } else {
      // Add branch
      onChange([...selectedBranches, branchId]);
    }
  };

  const hasRestrictions = selectedBranches.length > 0;

  return (
    <div className="border-b border-gray-200 pb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-bold text-gray-900">BRANCHES</h3>
        <ChevronDown
          className={`w-5 h-5 text-gray-600 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Info Text */}
          <p className="text-sm text-gray-600">
            {hasRestrictions
              ? `User can access ${selectedBranches.length} branch${selectedBranches.length === 1 ? '' : 'es'}`
              : 'User can access all branches (unrestricted)'}
          </p>

          {/* Select All Option */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                disabled={disabled || isLoading}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer disabled:opacity-50"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">
                Select All Branches
              </span>
              {selectAll && (
                <Check className="w-4 h-4 ml-auto text-green-600" />
              )}
            </label>
          </div>

          {/* Branch List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {branches.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No branches available</p>
            ) : (
              branches.map((branch) => (
                <label
                  key={branch._id}
                  className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch._id)}
                    onChange={() => handleBranchToggle(branch._id)}
                    disabled={disabled || isLoading}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer disabled:opacity-50"
                  />
                  <div className="ml-2 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {branch.name}
                    </p>
                    {branch.code && (
                      <p className="text-xs text-gray-500">{branch.code}</p>
                    )}
                  </div>
                  {selectedBranches.includes(branch._id) && (
                    <Check className="w-4 h-4 text-green-600 ml-2" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Leaving this empty means the user can access
              all branches. Select specific branches to restrict access.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-xs text-gray-500 italic">
              Updating branch permissions...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Usage Example in User Edit Modal:
 * 
 * import { BranchPermissionsSection } from './BranchPermissionsSection';
 * 
 * export function UserEditModal({ userId, onSave }) {
 *   const [branches, setBranches] = useState<Branch[]>([]);
 *   const [userBranches, setUserBranches] = useState<string[]>([]);
 *   const [loading, setLoading] = useState(false);
 * 
 *   useEffect(() => {
 *     // Fetch all branches
 *     fetch('/api/branches', { headers: { 'Authorization': `Bearer ${token}` } })
 *       .then(r => r.json())
 *       .then(data => setBranches(data.data.branches));
 * 
 *     // Fetch user data
 *     fetch(`/api/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
 *       .then(r => r.json())
 *       .then(data => setUserBranches(data.data.user.branches.map(b => b._id)));
 *   }, [userId]);
 * 
 *   const handleSave = async () => {
 *     setLoading(true);
 *     try {
 *       const response = await fetch(`/api/users/${userId}/branches`, {
 *         method: 'PUT',
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'Authorization': `Bearer ${token}`
 *         },
 *         body: JSON.stringify({ branches: userBranches })
 *       });
 *       const data = await response.json();
 *       onSave(data.data.user);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       // ... other fields ...
 *       
 *       // <BranchPermissionsSection
 *       //   branches={branches}
 *       //   selectedBranches={userBranches}
 *       //   onChange={setUserBranches}
 *       //   isLoading={loading}
 *       // />
 *       
 *       // <button onClick={handleSave} disabled={loading}>
 *       //   Save Changes
 *       // </button>
 *     </>
 *   );
 * }
 */
