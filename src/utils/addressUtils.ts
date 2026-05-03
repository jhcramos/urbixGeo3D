export const ADDRESS_ABBREVIATIONS: Record<string, string> = {
    'STREET': 'ST',
    'ROAD': 'RD',
    'CRESCENT': 'CRES',
    'AVENUE': 'AVE',
    'DRIVE': 'DR',
    'LANE': 'LN',
    'COURT': 'CT',
    'PLACE': 'PL',
    'PARADE': 'PDE',
    'CLOSE': 'CL',
    'BOULEVARD': 'BLVD',
    'TERRACE': 'TCE',
    'HIGHWAY': 'HWY',
    'SQUARE': 'SQ',
    'ESPLANADE': 'ESP',
    'CIRCUIT': 'CCT',
    'GARDENS': 'GDNS',
    'GROVE': 'GR',
    'HEIGHTS': 'HTS',
    'HILL': 'HL',
    'ISLAND': 'IS',
    'JUNCTION': 'JNC',
    'KEY': 'KY',
    'MEWS': 'MEWS',
    'PARK': 'PK',
    'PARKWAY': 'PWY',
    'PASS': 'PASS',
    'PATH': 'PH',
    'POINT': 'PT',
    'PROMENADE': 'PROM',
    'QUAY': 'QY',
    'RIDGE': 'RDGE',
    'RISE': 'RISE',
    'RUN': 'RUN',
    'TRAIL': 'TRL',
    'VIEW': 'VW',
    'WAY': 'WAY',
    'WHARF': 'WHARF'
};

// Reverse mapping for completeness (Abbr -> Full)
export const ADDRESS_EXPANSIONS: Record<string, string> = Object.entries(ADDRESS_ABBREVIATIONS).reduce((acc, [full, abbr]) => {
    acc[abbr] = full;
    return acc;
}, {} as Record<string, string>);

/**
 * Generates variations of an address string by toggling between full street types and their abbreviations.
 * @param address The input address string
 * @returns An array of unique address variations, starting with the original address.
 */
export const generateAddressVariations = (address: string): string[] => {
    if (!address) return [];

    const normalizedAddress = address.toUpperCase();
    const variations = new Set<string>();

    // Always include the original query (normalized)
    variations.add(normalizedAddress);

    const words = normalizedAddress.split(/\s+/);

    // Try to replace full words with abbreviations (ALL words)
    const abbreviatedWords = words.map(word => {
        const cleanWord = word.replace(/[^\w\s]/gi, '');
        return ADDRESS_ABBREVIATIONS[cleanWord] || word;
    });
    variations.add(abbreviatedWords.join(' '));

    // Try to replace abbreviations with full words (ALL words)
    const expandedWords = words.map(word => {
        const cleanWord = word.replace(/[^\w\s]/gi, '');
        return ADDRESS_EXPANSIONS[cleanWord] || word;
    });
    variations.add(expandedWords.join(' '));

    // NEW: Try to abbreviate ONLY the last word (common for street types like "Heights Court" -> "Heights Ct")
    if (words.length > 1) {
        const lastWordIndex = words.length - 1;
        const lastWord = words[lastWordIndex];
        const cleanLastWord = lastWord.replace(/[^\w\s]/gi, '');
        if (ADDRESS_ABBREVIATIONS[cleanLastWord]) {
            const lastWordAbbr = [...words];
            lastWordAbbr[lastWordIndex] = ADDRESS_ABBREVIATIONS[cleanLastWord];
            variations.add(lastWordAbbr.join(' '));
        }
    }

    return Array.from(variations);
};
