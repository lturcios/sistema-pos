export interface PaginationResult<T> {
    data: T[];
    meta: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
    };
}

export const getPaginationOptions = (pageStr?: string, limitStr?: string, defaultLimit = 10) => {
    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.max(1, parseInt(limitStr || String(defaultLimit), 10));
    const skip = (page - 1) * limit;

    return { skip, take: limit, page, limit };
};

export const buildPaginationMeta = (totalItems: number, page: number, limit: number) => {
    return {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit
    };
};
