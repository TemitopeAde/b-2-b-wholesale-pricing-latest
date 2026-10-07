import { type Dispatch, type SetStateAction } from 'react';

export interface Member {
    id: string;
    name: string;
    email: string;
    joinedDate?: string;
}

export interface AccessGroup {
    id: string;
    name: string;
    members: Member[];
    minOrder: string;
    maxOrder: string;
    maxProducts: string;
    minProducts: string;
}

// Utility type for creating a new group (without id and members)
export type NewAccessGroup = Omit<AccessGroup, 'id' | 'members'>;

// Utility type for loading actions state
export type LoadingActions = { [key: string]: boolean };

// Utility types for state setters
export type SetGroups = Dispatch<SetStateAction<AccessGroup[]>>;
export type SetLoadingData = Dispatch<SetStateAction<boolean>>;
export type SetLoadingActions = Dispatch<SetStateAction<LoadingActions>>;
export type SetShowCreateForm = Dispatch<SetStateAction<boolean>>;
export type SetSelectedGroup = Dispatch<SetStateAction<AccessGroup | null>>;
export type SetShowEditForm = Dispatch<SetStateAction<boolean>>;
export type SetShowMembersModal = Dispatch<SetStateAction<boolean>>;
export type SetActiveDropdown = Dispatch<SetStateAction<string | null>>;
export type SetNewGroup = Dispatch<SetStateAction<NewAccessGroup>>;
export type SetEditGroup = Dispatch<SetStateAction<AccessGroup | null>>;