import useSWR from 'swr';
import { useSession } from '../context/session';
import { ErrorProps, ListItem, Order, QueryParams } from '../types';

async function fetcher(url: string, query: string) {
    const fetchUrl = `${url}?${query}`;
    console.log('[hooks] Fetching:', fetchUrl);

    try {
        const res = await fetch(fetchUrl);
        console.log('[hooks] Response status:', res.status, 'for', url);

        // If the status code is not in the range 200-299, throw an error
        if (!res.ok) {
            let errorMessage = 'An error occurred while fetching the data.';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
                console.error('[hooks] Error response body:', errorData);
            } catch (parseError) {
                console.error('[hooks] Failed to parse error response:', parseError);
            }
            const error: ErrorProps = new Error(errorMessage);
            error.status = res.status; // e.g. 500
            throw error;
        }

        const data = await res.json();
        console.log('[hooks] Successfully fetched data from', url, '- data keys:', Object.keys(data));
        return data;
    } catch (error) {
        console.error('[hooks] Fetch error for', url, ':', error);
        throw error;
    }
}

// Reusable SWR hooks
// https://swr.vercel.app/
export function useProducts() {
    const { context } = useSession();
    const params = new URLSearchParams({ context }).toString();
    // Request is deduped and cached; Can be shared across components
    const { data, error } = useSWR(context ? ['/api/products', params] : null, fetcher);

    return {
        summary: data,
        isLoading: !data && !error,
        error,
    };
}

export function useProductList(query?: QueryParams) {
    const { context } = useSession();
    const params = new URLSearchParams({ ...query, context }).toString();

    // Use an array to send multiple arguments to fetcher
    const { data, error, mutate: mutateList } = useSWR(context ? ['/api/products/list', params] : null, fetcher);

    return {
        list: data?.data,
        meta: data?.meta,
        isLoading: !data && !error,
        error,
        mutateList,
    };
}

export function useProductInfo(pid: number, list: ListItem[]) {
    const { context } = useSession();
    const params = new URLSearchParams({ context }).toString();
    const product = list.find(item => item.id === pid);
    // Conditionally fetch product if it doesn't exist in the list (e.g. deep linking)
    const { data, error } = useSWR(!product && context ? [`/api/products/${pid}`, params] : null, fetcher);

    return {
        product: product ?? data,
        isLoading: product ? false : (!data && !error),
        error,
    };
}

export const useOrder = (orderId: number) => {
    const { context } = useSession();
    const params = new URLSearchParams({ context }).toString();
    const shouldFetch = context && orderId !== undefined;

    // Conditionally fetch orderId is defined
    const { data, error } = useSWR<Order, ErrorProps>(shouldFetch ? [`/api/orders/${orderId}`, params] : null, fetcher);

    return {
        order: data,
        isLoading: !data && !error,
        error,
    };
}

export const useCustomer = (customerId: string) => {
    const { context } = useSession();
    const params = new URLSearchParams({ context, "id:in": customerId}).toString();
    const shouldFetch = context && customerId !== undefined;

    // Conditionally fetch orderId is defined
    const { data, error, mutate: mutateCustomer } = useSWR(shouldFetch ? [`/api/customers`, params] : null, fetcher);
    
    return {
        customer: data?.data[0],
        customerMeta: data?.meta,
        customerLoading: !data && !error,
        customerError: error,
        mutateCustomer
    };
}

export function useSegments(query?: QueryParams) {
    const { context } = useSession();
    const params = new URLSearchParams({ ...query, context }).toString();

    console.log('[useSegments] Hook called with context:', context ? 'present' : 'missing', 'query:', query);

    // Use an array to send multiple arguments to fetcher
    const { data, error, mutate: mutateSegments } = useSWR(context ? ['/api/segments', params] : null, fetcher);

    console.log('[useSegments] SWR state - data:', data ? 'present' : 'null', 'error:', error ? error.message : 'null', 'loading:', !data && !error);

    return {
        segments: data?.data,
        segmentMeta: data?.meta,
        segmentsLoading: !data && !error,
        segmentError: error,
        mutateSegments,
    };
}