import { parseReaUrl } from './reaParser';

export const fetchReaAddress = async (url: string): Promise<string | null> => {
    try {
        // Ensure URL is valid
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        console.log(`Fetching REA URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-AU,en;q=0.9,en-US;q=0.8',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch REA page: ${response.status} ${response.statusText}`);
            // Fall through to fallbacks
        } else {
            const html = await response.text();
            console.log(`Fetched HTML length: ${html.length}`);

            // Debug: Log first 500 chars to see if it's a captcha or block page
            console.log(`HTML Preview: ${html.substring(0, 500)}`);

            // Strategy 1: Open Graph Tags (Very reliable for title/description)
            const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="(.*?)"/i);
            if (ogTitleMatch && ogTitleMatch[1]) {
                const title = ogTitleMatch[1];
                const clean = cleanAddress(title.split('-')[0]);
                if (clean) return clean;
            }

            // Strategy 2: JSON-LD
            const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            if (jsonLdMatch && jsonLdMatch[1]) {
                try {
                    const data = JSON.parse(jsonLdMatch[1]);
                    const findAddress = (obj: any): string | null => {
                        if (!obj) return null;
                        if (obj.address) {
                            if (typeof obj.address === 'string') return obj.address;
                            if (obj.address.streetAddress) {
                                return `${obj.address.streetAddress} ${obj.address.addressLocality || ''}`.trim();
                            }
                        }
                        return null;
                    };
                    let addr = null;
                    if (Array.isArray(data)) {
                        for (const item of data) {
                            addr = findAddress(item);
                            if (addr) break;
                        }
                    } else {
                        addr = findAddress(data);
                    }
                    if (addr) return cleanAddress(addr);
                } catch (e) {
                    console.warn('Failed to parse JSON-LD', e);
                }
            }

            // Strategy 3: H1 Tag
            const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match && h1Match[1]) {
                const text = h1Match[1].replace(/<[^>]+>/g, '').trim();
                if (/^\d/.test(text)) {
                    return cleanAddress(text);
                }
            }

            // Strategy 4: Title Tag
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                return cleanAddress(titleMatch[1].split('-')[0]);
            }
        }

        // Helper to find address in text
        const findAddressInText = (text: string): string | null => {
            // Look for patterns like "123 Example St", "Unit 1/123 Example Rd"
            // We'll use a fairly permissive regex but require a street type to reduce false positives
            const addressRegex = /\b(\d+(?:\/\d+)?\s+[A-Za-z0-9\s]+(?:Street|St|Road|Rd|Crescent|Cres|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Parade|Pde|Close|Cl|Boulevard|Blvd|Terrace|Tce|Highway|Hwy|Square|Sq|Esplanade|Esp|Circuit|Cct|Gardens|Gdns|Grove|Gr|Heights|Hts|Hill|Hl|Island|Is|Junction|Jnc|Key|Ky|Mews|Mews|Park|Pk|Parkway|Pwy|Pass|Pass|Path|Ph|Point|Pt|Promenade|Prom|Quay|Qy|Ridge|Rdge|Rise|Rise|Run|Run|Trail|Trl|View|Vw|Way|Way|Wharf|Wharf))\b/i;

            const match = text.match(addressRegex);
            if (match && match[1]) {
                return cleanAddress(match[1]);
            }
            return null;
        };

        // Fallback 1: DuckDuckGo (HTML version)
        try {
            const idMatch = url.match(/-(\d+)$/);
            if (idMatch && idMatch[1]) {
                const propertyId = idMatch[1];
                console.log(`Attempting DuckDuckGo fallback for ID: ${propertyId}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const ddgUrl = `https://html.duckduckgo.com/html/?q=site:realestate.com.au+${propertyId}`;
                const ddgResponse = await fetch(ddgUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Referer': 'https://html.duckduckgo.com/'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (ddgResponse.ok) {
                    const ddgHtml = await ddgResponse.text();
                    console.log(`DuckDuckGo HTML length: ${ddgHtml.length}`);

                    // Try to find address in the whole HTML text
                    const address = findAddressInText(ddgHtml);
                    if (address) {
                        console.log(`Found address via DuckDuckGo (Text Scan): ${address}`);
                        return address;
                    }

                    console.warn('DuckDuckGo: No address pattern found in text.');
                } else {
                    console.warn(`DuckDuckGo failed: ${ddgResponse.status}`);
                }
            }
        } catch (ddgError) {
            console.error('DuckDuckGo fallback failed:', ddgError);
        }

        // Fallback 2: Google Search
        try {
            const idMatch = url.match(/-(\d+)$/);
            if (idMatch && idMatch[1]) {
                const propertyId = idMatch[1];
                console.log(`Attempting Google Search fallback for ID: ${propertyId}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const googleUrl = `https://www.google.com/search?q=site:realestate.com.au+"${propertyId}"`;
                const googleResponse = await fetch(googleUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (googleResponse.ok) {
                    const googleHtml = await googleResponse.text();
                    console.log(`Google Search HTML length: ${googleHtml.length}`);

                    // Try to find address in the whole HTML text
                    const address = findAddressInText(googleHtml);
                    if (address) {
                        console.log(`Found address via Google (Text Scan): ${address}`);
                        return address;
                    }

                    console.warn('Google Search: No address pattern found in text.');
                } else {
                    console.warn(`Google Search failed: ${googleResponse.status}`);
                }
            }
        } catch (googleError) {
            console.error('Google fallback failed:', googleError);
        }

        return null;

    } catch (error) {
        console.error('Error fetching REA address:', error);
        return null;
    }
};

// Helper to clean address for Council Search
function cleanAddress(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim();

    // Remove site suffixes (e.g. " - realestate.com.au")
    cleaned = cleaned.replace(/\s*[-|]\s*realestate\.com\.au.*/i, '');

    cleaned = cleaned.replace(/property details/i, '');
    cleaned = cleaned.replace(/\b(qld|queensland)\b/gi, '');
    cleaned = cleaned.replace(/\b\d{4}\b/g, '');

    // Remove trailing commas or hyphens
    cleaned = cleaned.replace(/[,-\s]+$/, '');

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}
