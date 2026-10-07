import React from 'react';
import { type AccessGroup } from './types';

interface AccessGroupSelectorProps {
    accessGroups: AccessGroup[];
    selectedGroupIds: string[];
    onSelectionChange: (groupIds: string[]) => void;
}

interface AccessGroupItemProps {
    group: AccessGroup;
    isSelected: boolean;
    onToggle: (groupId: string, isSelected: boolean) => void;
}

const AccessGroupItem: React.FC<AccessGroupItemProps> = ({ group, isSelected, onToggle }) => (
    <div className="p-2 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors duration-200 bg-white">
        <label className="flex items-start gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onToggle(group.id, e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500 focus:ring-1"
            />
            <div className="flex-1">
                <div className="font-semibold text-slate-900 text-sm mb-1">
                    {group.name}
                </div>
                <div className="text-xs text-slate-500">
                    <div className="mb-1">{group.description}</div>
                    <div className="flex gap-2 flex-wrap">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                            {group.discount} discount
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                            {group.minOrder} min order
                        </span>
                    </div>
                </div>
            </div>
        </label>
    </div>
);

export const AccessGroupSelector: React.FC<AccessGroupSelectorProps> = ({
    accessGroups,
    selectedGroupIds,
    onSelectionChange
}) => {
    const handleToggle = (groupId: string, isSelected: boolean) => {
        if (isSelected) {
            onSelectionChange([...selectedGroupIds, groupId]);
        } else {
            onSelectionChange(selectedGroupIds.filter(id => id !== groupId));
        }
    };

    if (accessGroups.length === 0) {
        return (
            <div className="p-3 border border-amber-200 rounded-lg bg-amber-50 mb-4">
                <div className="text-center">
                    <div className="w-6 h-6 mx-auto mb-1 bg-amber-200 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold text-sm">!</span>
                    </div>
                    <h3 className="font-semibold text-amber-800 mb-1 text-sm">
                        No Access Groups Available
                    </h3>
                    <p className="text-amber-700 text-xs">
                        Create access groups first to assign them to customers.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                Access Groups
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
                {accessGroups.map((group) => (
                    <AccessGroupItem
                        key={group.id}
                        group={group}
                        isSelected={selectedGroupIds.includes(group.id)}
                        onToggle={handleToggle}
                    />
                ))}
            </div>
            {selectedGroupIds.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm text-blue-800 font-medium">
                        {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''} selected
                    </span>
                </div>
            )}
        </div>
    );
};