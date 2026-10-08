import React, { type FC, useState, useEffect, useMemo, useRef } from 'react';
import { Badge, Box, Button, CellStack, Checkbox, LoadingBlock, Modal, Pagination, Search } from './ui';
import { DashIcons } from './Dashboard/icons';
import m from './ManageMember.module.css';
import { listWholesaleCustomers, updateWholesaleGroupMembers } from '../backend/wholesale.client';
import { dashboard } from '@wix/dashboard';
import { items } from "@wix/data";
import { type AccessGroup } from './AccessGroupType';

export interface Member {
    id: string;
    name: string;
    email: string;
    joinedDate?: string;
}

interface Contact {
    info?: {
        name?: {
            first?: string | null;
            last?: string | null;
        };
        emails?: {
            email: string;
        }[] | any;
        picture?: string | any;
    };
    lastActivity?: {
        activityDate?: string | Date | null | any;
    };
    memberInfo?: {
        email?: string;
        memberId?: string;
    };
    primaryInfo?: {
        email?: string | null;
    };
    source?: {
        sourceType?: string;
        _createdDate?: string;
        _id?: string;
    };
    _id?: string;
    [key: string]: any;
}

interface ManageMemberProps {
    selectedGroup: AccessGroup;
    onClose: () => void;
    onUpdateGroup?: (updatedGroup: AccessGroup) => void;
    allGroups: AccessGroup[];
}

const COLLECTION_NAME = "@wd-strategies/wholesale-appllication/Accessgroup";

const ManageMember: FC<ManageMemberProps> = ({ selectedGroup, onClose, onUpdateGroup, allGroups }) => {
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [groupMembers, setGroupMembers] = useState<Member[]>(selectedGroup.members || []);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [addingMembers, setAddingMembers] = useState<Set<string>>(new Set());
    const [removingMembers, setRemovingMembers] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [contactsPage, setContactsPage] = useState(1);
    const [membersPage, setMembersPage] = useState(1);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const PAGE_SIZE = 100;
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchContacts = async (search: string = '') => {
        try {
            setIsLoading(true);
            const result = await listWholesaleCustomers(search);
            setAllContacts(result.items.filter(contact => contact['memberInfo']));
        } catch {
            dashboard.showToast({
                message: "Failed to load contacts",
                type: "error",
                timeout: "normal"
            });
        } finally {
            setIsLoading(false);
        }
    };

    /** Debounced search — waits 400ms after the user stops typing. */
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setContactsPage(1);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => fetchContacts(value), 400);
    };

    useEffect(() => {
        fetchContacts('');
    }, []);

    const transformContact = (contact: Contact): Member => {
        const firstName = contact.info?.name?.first || '';
        const lastName = contact.info?.name?.last || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';

        const email = contact.primaryInfo?.email ||
            contact.memberInfo?.email ||
            (contact.info?.emails?.[0]?.email) ||
            'No email';

        return {
            id: contact.memberInfo?.memberId || contact._id || '',
            name: fullName,
            email: email,
            joinedDate: new Date(contact.source?._createdDate || Date.now()).toLocaleDateString()
        };
    };

    // Server already filtered by search — use allContacts directly for pagination
    const filteredContacts = allContacts;

    // Set lookup keeps "Add all" and the list fast with thousands of wholesale customers
    const groupMemberIds = useMemo(() => new Set(groupMembers.map(member => member.id)), [groupMembers]);
    const isMemberInGroup = (memberId: string) => groupMemberIds.has(memberId);

    const membersTotalPages = Math.max(1, Math.ceil(groupMembers.length / PAGE_SIZE));
    const currentMembersPage = Math.min(membersPage, membersTotalPages);
    const pagedMembers = groupMembers.slice((currentMembersPage - 1) * PAGE_SIZE, currentMembersPage * PAGE_SIZE);

    const pagedContacts = filteredContacts.slice((contactsPage - 1) * PAGE_SIZE, contactsPage * PAGE_SIZE);
    const selectableIds = pagedContacts
        .map(c => c.memberInfo?.memberId || c._id || '')
        .filter(id => !isMemberInGroup(id));
    const allPageSelected = selectableIds.length > 0 && selectableIds.every(id => selectedContacts.has(id));
    const somePageSelected = selectableIds.some(id => selectedContacts.has(id)) && !allPageSelected;

    const toggleSelectAll = () => {
        setSelectedContacts(prev => {
            const next = new Set(prev);
            if (allPageSelected) {
                selectableIds.forEach(id => next.delete(id));
            } else {
                selectableIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const toggleContact = (id: string) => {
        setSelectedContacts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBulkAdd = async () => {
        const toAdd = filteredContacts.filter(c => {
            const id = c.memberInfo?.memberId || c._id || '';
            return selectedContacts.has(id) && !isMemberInGroup(id);
        });
        const newMembers = toAdd.map(transformContact);
        setGroupMembers(prev => [...prev, ...newMembers]);
        setSelectedContacts(new Set());
        dashboard.showToast({
            message: `${newMembers.length} contact${newMembers.length !== 1 ? 's' : ''} added to ${selectedGroup.name}`,
            type: 'success',
            timeout: 'normal',
        });
    };

    const addableContacts = filteredContacts.filter(c => !isMemberInGroup(c.memberInfo?.memberId || c._id || ''));

    /** Stages every loaded wholesale customer (matching the current search) not already in the group. */
    const handleAddAll = () => {
        const newMembers = addableContacts.map(transformContact);
        if (newMembers.length === 0) return;
        setGroupMembers(prev => [...prev, ...newMembers]);
        setSelectedContacts(new Set());
        dashboard.showToast({
            message: `${newMembers.length} wholesale customer${newMembers.length !== 1 ? 's' : ''} added to ${selectedGroup.name}`,
            type: 'success',
            timeout: 'normal',
        });
    };

    const handleAddMember = async (contact: Contact) => {
        const memberId = contact.memberInfo?.memberId || contact._id || '';

        try {
            setAddingMembers(prev => new Set(prev).add(memberId));

            const newMember = transformContact(contact);
            const updatedMembers = [...groupMembers, newMember];
            setGroupMembers(updatedMembers);

            dashboard.showToast({
                message: `${newMember.name} added to ${selectedGroup.name}`,
                type: "success",
                timeout: "normal"
            });
        } catch {
            dashboard.showToast({
                message: "Failed to add member",
                type: "error",
                timeout: "normal"
            });
        } finally {
            setAddingMembers(prev => {
                const newSet = new Set(prev);
                newSet.delete(memberId);
                return newSet;
            });
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            setRemovingMembers(prev => new Set(prev).add(memberId));

            const memberToRemove = groupMembers.find(m => m.id === memberId);
            const updatedMembers = groupMembers.filter(member => member.id !== memberId);

            setGroupMembers(updatedMembers);

            dashboard.showToast({
                message: `${memberToRemove?.name || 'Member'} removed from ${selectedGroup.name}`,
                type: "success",
                timeout: "normal"
            });
        } catch {
            dashboard.showToast({
                message: "Failed to remove member",
                type: "error",
                timeout: "normal"
            });
        } finally {
            setRemovingMembers(prev => {
                const newSet = new Set(prev);
                newSet.delete(memberId);
                return newSet;
            });
        }
    };

    const handleSaveChanges = async () => {
        try {
            setIsSaving(true);
            // Send only what changed; the server applies it to the stored list
            const originalIds = new Set((selectedGroup.members || []).map(m => m.id));
            const currentIds = new Set(groupMembers.map(m => m.id));
            const add = groupMembers.filter(m => !originalIds.has(m.id)).map(({ id, name, email }) => ({ id, name, email }));
            const remove = [...originalIds].filter(id => !currentIds.has(id));
            const saved: any = add.length || remove.length
                ? await updateWholesaleGroupMembers(selectedGroup.id, { add, remove })
                : null;

            if (onUpdateGroup) {
                onUpdateGroup({
                    ...selectedGroup,
                    members: Array.isArray(saved?.members) ? saved.members : groupMembers
                });
            }

            dashboard.showToast({
                message: `${selectedGroup.name} members updated successfully`,
                type: "success",
                timeout: "normal"
            });
            onClose();
        } catch (error) {
            dashboard.showToast({
                message: error instanceof Error ? error.message : "Failed to save changes",
                type: "error",
                timeout: "normal"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const displayName = (name: string | undefined, email: string) =>
        name && name !== 'Unknown' ? name : email;

    return (
        <Modal
            isOpen
            onClose={onClose}
            busy={isSaving}
            size="xlarge"
            bodyStyle={{ height: 'min(640px, calc(100vh - 220px))' }}
            title={`Manage members · ${selectedGroup.name}`}
            subtitle={`${groupMembers.length} member${groupMembers.length === 1 ? '' : 's'} in this group. Changes are saved when you click Save.`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSaveChanges} loading={isSaving}>
                        {isSaving ? 'Saving…' : 'Save members'}
                    </Button>
                </>
            }
        >
            <div className={m.columns}>
                <section className={`${m.section} ${m.members}`} aria-labelledby="current-members">
                    <div className={m.sectionHead}>
                        <h3 id="current-members" className={m.sectionTitle}>Current members</h3>
                        <Badge tone="info" dot={false}>{groupMembers.length}</Badge>
                    </div>
                    <div className={m.list}>
                        {groupMembers.length === 0 ? (
                            <div className={m.listEmpty}>No members in this group yet. Add customers from the list on the right.</div>
                        ) : (
                            pagedMembers.map((member) => (
                                <div key={member.id} className={m.row}>
                                    <span className={m.avatar} aria-hidden="true">{initials(displayName(member.name, member.email))}</span>
                                    <CellStack
                                        primary={displayName(member.name, member.email)}
                                        secondary={[member.name && member.name !== 'Unknown' ? member.email : null, member.joinedDate ? `Joined ${member.joinedDate}` : null].filter(Boolean).join(' · ')}
                                    />
                                    <Button
                                        variant="dangerSecondary"
                                        size="small"
                                        onClick={() => handleRemoveMember(member.id)}
                                        loading={removingMembers.has(member.id)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                    {groupMembers.length > PAGE_SIZE && (
                        <Box align="center">
                            <Pagination
                                currentPage={currentMembersPage}
                                totalPages={membersTotalPages}
                                onChange={({ page }) => setMembersPage(page)}
                            />
                        </Box>
                    )}
                </section>

                <section className={`${m.section} ${m.customers}`} aria-labelledby="available-customers">
                    <div className={m.sectionHead}>
                        <h3 id="available-customers" className={m.sectionTitle}>
                            Wholesale customers
                        </h3>
                        {filteredContacts.length > 0 && <Badge tone="neutral" dot={false}>{filteredContacts.length}</Badge>}
                        <span style={{ flex: 1 }} />
                        {selectedContacts.size > 0 && (
                            <Button size="small" onClick={handleBulkAdd} prefixIcon={<DashIcons.Plus size={14} />}>
                                Add {selectedContacts.size} selected
                            </Button>
                        )}
                        {!isLoading && addableContacts.length > 0 && (
                            <Button size="small" variant="secondary" onClick={handleAddAll} prefixIcon={<DashIcons.Plus size={14} />}>
                                {searchQuery ? `Add all ${addableContacts.length} matching` : `Add all ${addableContacts.length}`}
                            </Button>
                        )}
                    </div>

                    <Search
                        placeholder="Search by name, email or phone"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onClear={() => handleSearchChange('')}
                    />

                    {isLoading ? (
                        <LoadingBlock message="Loading customers…" />
                    ) : (
                        <div className={m.list}>
                            {filteredContacts.length === 0 ? (
                                <div className={m.listEmpty}>
                                    {searchQuery ? 'No customers match your search.' : 'No wholesale customers available yet.'}
                                </div>
                            ) : (
                                <>
                                    {selectableIds.length > 0 && (
                                        <div className={`${m.row} ${m.rowHeader}`}>
                                            <Checkbox
                                                checked={allPageSelected}
                                                indeterminate={somePageSelected}
                                                onChange={toggleSelectAll}
                                            >
                                                Select all on this page
                                            </Checkbox>
                                        </div>
                                    )}
                                    {pagedContacts.map((contact) => {
                                        const memberId = contact.memberInfo?.memberId || contact._id || '';
                                        const firstName = contact.info?.name?.first || '';
                                        const lastName = contact.info?.name?.last || '';
                                        const fullName = `${firstName} ${lastName}`.trim();
                                        const email = contact.primaryInfo?.email || contact.memberInfo?.email || contact.info?.emails?.[0]?.email || 'No email';
                                        const inGroup = isMemberInGroup(memberId);
                                        const name = fullName || email;

                                        return (
                                            <div key={memberId} className={m.row}>
                                                {inGroup ? (
                                                    <span className={m.checkSpacer} aria-hidden="true" />
                                                ) : (
                                                    <Checkbox
                                                        aria-label={`Select ${name}`}
                                                        checked={selectedContacts.has(memberId)}
                                                        onChange={() => toggleContact(memberId)}
                                                    />
                                                )}
                                                <span className={m.avatar} aria-hidden="true">{initials(name)}</span>
                                                <CellStack primary={name} secondary={fullName && fullName !== email ? email : undefined} />
                                                {inGroup ? (
                                                    <Badge tone="success">In group</Badge>
                                                ) : (
                                                    <Button
                                                        size="small"
                                                        variant="secondary"
                                                        onClick={() => handleAddMember(contact)}
                                                        loading={addingMembers.has(memberId)}
                                                        prefixIcon={<DashIcons.Plus size={14} />}
                                                    >
                                                        Add
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    {filteredContacts.length > PAGE_SIZE && (
                        <Box align="center">
                            <Pagination
                                currentPage={contactsPage}
                                totalPages={Math.ceil(filteredContacts.length / PAGE_SIZE)}
                                onChange={({ page }) => setContactsPage(page)}
                            />
                        </Box>
                    )}
                </section>
            </div>
        </Modal>
    );
};

const initials = (name: string) => {
    const words = name.replace(/[^A-Za-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
};

export default ManageMember;