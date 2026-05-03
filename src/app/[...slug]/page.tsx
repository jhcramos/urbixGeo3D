import MapWrapper from '@/components/Map/MapWrapper';
import { parseReaUrl } from '@/utils/reaParser';
import { fetchReaAddress } from '@/utils/reaFetcher';

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
    const params = await props.params;

    // 1. Try to parse from URL first (fastest)
    let initialSearch = parseReaUrl(params.slug);

    // 2. If URL parsing gave a generic result (no street address) or we want to be sure,
    // try fetching the page content.
    console.log('Page Params Slug:', params.slug);

    // The URL in slug might be ["https:", "www.realestate.com.au", ...]
    // We need to decode parts and ensure protocol has double slashes
    let url = params.slug.map(part => decodeURIComponent(part)).join('/');

    // Fix protocol: "https:/www" -> "https://www"
    url = url.replace(/^(https?:)\/([^\/])/, '$1//$2');

    // Handle case where the whole URL is in the first slug param (sometimes happens with encoded slashes)
    if (!url.startsWith('http') && params.slug[0].includes('http')) {
        url = decodeURIComponent(params.slug[0]);
    }

    console.log('Reconstructed URL:', url);

    // Only fetch if it looks like an REA URL
    if (url.includes('realestate.com.au')) {
        const fetchedAddress = await fetchReaAddress(url);
        if (fetchedAddress) {
            console.log(`Fetched address from page: ${fetchedAddress}`);
            initialSearch = fetchedAddress;
        }
    }

    return (
        <main className="flex h-screen w-screen flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 z-10 shadow-sm flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Urbix <span className="text-blue-600 font-normal text-lg">Sunshine Coast</span>
                </h1>
                <div className="text-sm text-gray-500">
                    Planning & Property Explorer
                </div>
            </header>

            <div className="flex-1 relative">
                <MapWrapper initialSearch={initialSearch || undefined} />
            </div>
        </main>
    );
}
