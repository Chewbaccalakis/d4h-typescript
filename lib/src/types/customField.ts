import { Entity } from '../entity'
import { resourceType } from './generic'

/** @ignore @inline */
export interface OptionsType {
    id: number;
    ordering: number;
    customField: resourceType;
    label: string;
    archivedAt: null;
    owner: resourceType;
    createdAt: string;
    updatedAt: string;
}

export interface CustomField extends Entity {
    id: number;
    owner: resourceType;
    targetResourceType: string;
    ordering: number;
    title: string;
    type: string;
    restricted: string;
    memberPrivacy: string;
    hint: null;
    bundle: resourceType;
    searchable: boolean;
    mandatory: boolean
    archivedAt: null;
    createdAt: string;
    updatedAt: string;
    options: OptionsType;
    resourceType: string;
    valueUnits: null;
}

/** @ignore @inline */
export interface CustomFieldUpdate {
    id: number;
    value: string | null;
}