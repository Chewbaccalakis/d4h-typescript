import { CustomFieldUpdate, CustomField } from '../types/customField'
import { Entity, EntityType } from '../entity'
import D4H, { D4H_BASE_URL } from '../d4h'
import D4HRequest from '../d4hRequest'

export interface GetCustomFieldOptions {
    archived?: boolean | string;
    exclude_org_data?: boolean | string; // default false
    exclude_teams_data?: boolean | string; // default false
    id?: number | number[];
    member_privacy?: 'EDITABLE' | 'HIDDEN' | 'VIEWABLE'
    order?: 'asc' | 'desc'; // default: 'asc'
    page?: number;
    resource_bundle_id?: number | string;
    restricted?: 'RESTRICTED' | 'UNRESTRICTED';
    size?: number;
    sort?: 'createdAt' | 'id' | 'updatedAt'; // default: 'id'
    target_resource_type?: string | string[];
}

class CustomFields {
    private readonly _request: D4HRequest

    constructor(d4hInstance: D4H) {
        this._request = d4hInstance.request
    }

    /**
     * 
     * @param context - The point of view from where the request takes place
     * @param contextId - Either a team, organisation or admin's id
     * @param customFieldId - A custom field id
     * @returns - A custom field
     */
    async getCustomField(context: 'admin' | 'organisation' | 'team', contextId: number, customFieldId: number): Promise<CustomField> {
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/attendance/${customFieldId}`)
        
        try {
            const customField = await this._request.getAsync<CustomField>(url)
            customField.entityType = EntityType.CustomField
            return customField
        } catch (error) {
            throw new Error('Custom Field data not found or improperly formatted.')
        }
    }

    /**
     * 
     * @param context - The point of view from where the request takes place
     * @param contextId - Either a team, organisation or admin's id
     * @param options.archived - Filter returned custom fields by their archived status
     * @param options.exclude_org_data - Team context: Exclude entities inherited from the team's org. Default: false
     * @param options.exclude_teams_data - Organisation context: Exclude entities belonging to accessible teams. Default: false
     * @param options.id - A list of ids
     * @param options.member_privacy - HIDDEN: Member cannot view own data, EDITABLE: Member can edit own data, VIEWABLE: Member can view own data
     * @param options.order - Default: "asc"
     * @param options.page - Page number
     * @param options.resource_bundle_id - A resource-bundle id. Use null to get un-bundled fields
     * @param options.restricted - UNRESTRICTED: No extra permissions required, RESTRICTED: Extra permissions required
     * @param options.size - Items per page
     * @param options.sort - Default: "id"
     * @param options.target_resource_type - A resource type that supports custom fields
     * @returns - A list of custom fields
     */
    async getCustomFields(context: 'admin' | 'organisation' | 'team', contextId: number, options?: GetCustomFieldOptions): Promise<CustomField[]> {
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/attendance`)

        if (options !== undefined) {
            const optionsList = url.searchParams

            if (options.archived !== undefined) {
                optionsList.append('archived', options.archived.toString())
            }
            if (options.exclude_org_data !== undefined) {
                optionsList.append('exclude_org_data', options.exclude_org_data.toString())
            }
            if (options.exclude_teams_data !== undefined) {
                optionsList.append('exclude_teams_data', options.exclude_teams_data.toString())
            }
            if (options.id !== undefined) {
                optionsList.append('id', options.id.toString())
            }
            if (options.member_privacy !== undefined) {
                optionsList.append('member_privacy', options.member_privacy)
            }
            if (options.order !== undefined) {
                optionsList.append('order', options.order)
            }
            if (options.page !== undefined) {
                optionsList.append('page', options.page.toString())
            }
            if (options.resource_bundle_id !== undefined) {
                optionsList.append('resource_bundle_id', options.resource_bundle_id.toString())
            }
            if (options.restricted !== undefined) {
                optionsList.append('restricted', options.restricted)
            }
            if (options.size !== undefined) {
                optionsList.append('size', options.size.toString())
            }
            if (options.sort !== undefined) {
                if (Array.isArray(options.sort)) {
                    options.sort.forEach(sortField => {
                        if (typeof sortField === 'string') {
                            optionsList.append('sort', sortField)
                        } else {
                            console.warn('Skipping invalid sort field: ', sortField)
                        }
                    })
                } else if (typeof options.sort === 'string') {
                    optionsList.append('sort', options.sort)
                } else {
                    console.warn('Invalid sort field type:', typeof options.sort)
                }
            }
    
            if (options.target_resource_type !== undefined) {
                optionsList.append('target_Resource_type', options.target_resource_type.toString())
            }
        }

        const customField = await this._request.getManyAsync<CustomField>(url)
        customField.forEach(m => m.entityType = EntityType.CustomField)

        return customField
    }


    updateCustomFields(entity: Entity, updates: CustomFieldUpdate[], onlyMemberEditOwn: boolean): Promise<void> {
        // If no updates, no need to actually make a request. Exit early.
        if (updates.length === 0) {
            return Promise.resolve()
        }

        const url = new URL(`${D4H_BASE_URL}/team/custom-fields/${entity.entityType}/${entity.id}`)

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

export { CustomFields }