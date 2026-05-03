export const parseReaUrl = (slug: string[]): string | null => {
    if (!slug || slug.length === 0) return null;

    // Reconstruct the full path from the slug array
    const fullPath = slug.join('/');

    // Regex to find the property segment
    // REA URLs are typically: /property-TYPE-STATE-SUBURB-ID or /property-ADDRESS-SUBURB-STATE-POSTCODE-ID
    const propertyMatch = fullPath.match(/property-([\w-]+)-(\d+)$/);

    if (propertyMatch) {
        const urlSlug = propertyMatch[1]; // e.g. "unit-qld-noosaville" or "12-smith-st-noosaville-qld-4566"

        // Split by hyphens
        const parts = urlSlug.split('-');

        // Heuristic: If it starts with a number, it's likely a street address.
        const firstPart = parts[0];
        const isNumber = /^\d+$/.test(firstPart);

        // Filter out state and postcode which are not in the Council's address_short field
        // Council format: "12 SMITH ST NOOSAVILLE" (No State, No Postcode)
        const filterStateAndPostcode = (p: string) => {
            const lower = p.toLowerCase();
            // Filter states
            if (lower === 'qld' || lower === 'queensland') return false;
            // Filter postcodes (4 digits, usually starting with 4 for QLD)
            if (/^\d{4}$/.test(p)) return false;
            // Filter REA Property ID (usually long number at end)
            if (/^\d{8,}$/.test(p)) return false;
            return true;
        };

        if (isNumber) {
            // Likely a full address: "12-smith-st-noosaville-qld-4566"
            // Filter out state and postcode to match Council format
            return parts.filter(filterStateAndPostcode).join(' ');
        } else {
            // Likely generic: "unit-qld-noosaville"
            // Remove common types
            const types = ['house', 'unit', 'apartment', 'villa', 'townhouse', 'land', 'acreage', 'rural'];
            const filteredParts = parts
                .filter(p => !types.includes(p.toLowerCase()))
                .filter(filterStateAndPostcode);

            // If we stripped everything, put it back (fallback)
            if (filteredParts.length === 0) return parts.join(' ');

            return filteredParts.join(' ');
        }
    }

    return null;
};
