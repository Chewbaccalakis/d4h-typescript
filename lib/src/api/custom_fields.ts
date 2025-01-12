import { CustomField } from '../types/customField'
import { EntityType } from '../entity'
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
    sort?: 'createdAt' | 'id' | 'ordering' |'updatedAt'; // default: 'id'
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
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/custom-fields/${customFieldId}`)
        
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
        const url = new URL(`${D4H_BASE_URL}/${context}/${contextId}/custom-fields`)

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
}

export { CustomFields }