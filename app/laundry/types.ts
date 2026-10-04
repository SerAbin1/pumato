/** The pickup form on /laundry, shared by the page and its sections. */
export interface LaundryFormData {
    name: string;
    phone: string;
    campus: string;
    location: string;
    date: string;
    time: string;
    instructions: string;
}

/** One clothing line on the pickup form, before it's validated into a LaundryItem. */
export interface LaundryItemDraft {
    id: number;
    name: string;
    quantity: string;
    steamIron: boolean;
}
