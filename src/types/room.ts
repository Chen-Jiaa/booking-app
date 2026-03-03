export interface Rooms {
    approval_required: boolean,
    approvers: null | string[],
    availability: boolean,
    available_to: string,
    capacity: number;
    dependency_group: null | string;
    id: string;
    name: string;
  }