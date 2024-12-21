import { CustomFieldUpdate } from './customField'
import D4HRequest from './d4hRequest'
import { Entity, EntityType } from './entity'
import type { Group } from './group'
import type { Member, MemberUpdate } from './member'

const D4H_FETCH_LIMIT = 250
const D4H_BASE_URL = 'https://api.team-manager.us.d4h.com/v3' // Multiple API endpoints now, could potentially be different?

export interface GetMemberOptions {
    includeDetails?: boolean;
}

export interface GetMembersOptions {
    groupId?: number;
    includeCustomFields?: boolean;
    includeDetails?: boolean;
}

export interface GetGroupsOptions {
    memberId?: number;
    title?: string;
}

export default class D4H {
    private readonly _request: D4HRequest

    constructor(token: string) {
        this._request = new D4HRequest(token, D4H_FETCH_LIMIT)
    }

    /********************************************/
    /**************** MEMBERS *******************/
    /********************************************/
    
    async getMemberAsync(context: string, contextId: number, id: number, options?: GetMemberOptions): Promise<Member> {
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/members/${id}`)
        
        if (options !== undefined) {
            const optionsList = url.searchParams

            if (options.includeDetails !== undefined) {
                optionsList.append('include_details', 'true')
            }
        }

        const member = await this._request.getAsync<Member>(url)
        member.type = EntityType.Member

        return member
    }

    async getMembersAsync(context: string, contextId: number, options?: GetMembersOptions): Promise<Member[]> {
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/members`)

        if (options !== undefined) {
            const optionsList = url.searchParams

            if (options.groupId !== undefined) {
                optionsList.append('group_id', options.groupId.toString())
            }

            if (options.includeDetails !== undefined) {
                optionsList.append('include_details', 'true')
            }

            if (options.includeCustomFields !== undefined) {
                optionsList.append('include_custom_fields', 'true')
            }
        }

        const members = await this._request.getManyAsync<Member>(url)
        members.forEach(m => m.type = EntityType.Member)

        return members
    }

    updateMemberAsync(context: string, contextId: number, id: number, updates: MemberUpdate): Promise<void> {
        // If no updates, no need to actually make a request. Exit early.
        if (Object.getOwnPropertyNames(updates).length === 0) {
            return Promise.resolve()
        }

        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/members/${id}`)
        return this._request.putAsync(url, updates)
    }

    /********************************************/
    /*********** EMERGENCY CONTACTS *************/
    /********************************************/

    // Emergency Contacts no longer have specific endpoint

    /********************************************/
    /***************** GROUPS *******************/
    /********************************************/

    getGroupAsync(context: string, contextId: number, id: number): Promise<Group> { // Assuming intent was to gather member groups
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/member-groups/${id}`)
        return this._request.getAsync<Group>(url)
    }

    getGroupsAsync(context: string, contextId: number, options?: GetGroupsOptions): Promise<Group[]> {
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/member-groups`)

        if (options !== undefined) {
            const optionsList = url.searchParams

            if (options.memberId !== undefined) {
                optionsList.append('member_id', options.memberId.toString())
            }

            if (options.title !== undefined) {
                optionsList.append('title', options.title)
            }
        }

        return this._request.getManyAsync(url)
    }

    /********************************************/
    /************** CUSTOM FIELDS ***************/
    /********************************************/

    updateCustomFields(entity: Entity, updates: CustomFieldUpdate[], onlyMemberEditOwn: boolean): Promise<void> {
        // If no updates, no need to actually make a request. Exit early.
        if (updates.length === 0) {
            return Promise.resolve()
        }
        
        const url = new URL(`${D4H_BASE_URL}/team/custom-fields/${entity.type}/${entity.id}`)

        // From the documentation:
        // https://api.d4h.org/v2/documentation#operation/putTeamCustomfieldsEntity_typeEntity_id
        // The PUT action for fields is distinguished by Bundle. If you include one field's value
        // from a bundle (or an unbundled field's value) you must include values for all fields
        // of that bundle (or all unbundled fields)
        // ----------------------------------------------------------------------------------------
        // To ensure a mistake doesn't occur, let's ensure that *all* unbundled custom fields from the original
        // entity are in the list of updates.
        //
        // At this time we don't actively use any custom fields in a bundle. To save on the additional complexity,
        // bundled custom fields are not supported and will result in an error if attempting to update them.

        // At this time all entities we're working with have custom fields. As a result, throw an
        // error if none are found. This most likely indicates the original request was made without
        // including custom fields.
        const originalCustomFields = entity.custom_fields
        if (!originalCustomFields) {
            throw new Error('Cannot update custom fields for an entity with no custom fields. Ensure your original request included custom fields.')
            
        }

        // For any fields not being changed, back fill from the original entity to ensure
        // they retain the same value.
        for (const field of originalCustomFields) {
            const update = updates.find((u) => u.id == field.id)
            if (update) {
                if (onlyMemberEditOwn && !field.member_edit_own) {
                    throw new Error('onlyMemberEditOwn specified, but attempting to update non-memberEditOwn field.')
                } else if (field.bundle) {
                    throw new Error('One or more custom fields being updated are part of a bundle. Updating fields in a bundle is not supported.')
                }
            } else {
                let include = true
                if (field.bundle || (onlyMemberEditOwn && !field.member_edit_own)) {
                    include = false
                }

                if (include) {
                    updates.push({
                        id: field.id,
                        value: field.value
                    })
                }
            }
        }

        return this._request.putAsync(url, { fields: updates })
    }
}