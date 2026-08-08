export interface ParsedCSVLead {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    source?: string;
    budget?: number;
    tour_interest?: string;
    notes?: string;
}

function mapHeaderKey(rawHeader: string): string {
    const h = rawHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
        h.includes('phone') || 
        h.includes('mobile') || 
        h.includes('tel') || 
        h.includes('cell') || 
        h.includes('contact') || 
        h.includes('num') ||
        h === 'p' ||
        h === 'm'
    ) {
        return 'phone';
    }
    if (h.includes('email') || h.includes('mail')) {
        return 'email';
    }
    if (h.includes('name') || h.includes('client') || h.includes('customer') || h.includes('contactname')) {
        return 'name';
    }
    if (h.includes('source') || h.includes('origin')) {
        return 'source';
    }
    if (h.includes('budget') || h.includes('price') || h.includes('amount') || h.includes('cost')) {
        return 'budget';
    }
    if (h.includes('tour') || h.includes('pkg') || h.includes('package') || h.includes('interest')) {
        return 'tour_interest';
    }
    if (h.includes('note') || h.includes('remark') || h.includes('comment')) {
        return 'notes';
    }
    return h;
}

export function parseCSVContent(content: string): ParsedCSVLead[] {
    // 1. Clean UTF-8 BOM and normalize
    const cleanContent = content.replace(/^\uFEFF/, '').trim();
    if (!cleanContent) return [];

    const lines = cleanContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // 2. Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
        delimiter = ';';
    } else if (firstLine.includes('\t') && !firstLine.includes(',')) {
        delimiter = '\t';
    }

    const parseLine = (line: string) =>
        line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));

    const rawFirstRow = parseLine(firstLine);

    // 3. Check if first row looks like actual contact data (e.g. phone number, email)
    const isFirstRowData = rawFirstRow.some(val => {
        const cleanVal = val.replace(/\s+/g, '');
        // Starts with '+' or consists of digits/phone format or contains '@'
        return /^[+\d]/.test(cleanVal) || cleanVal.includes('@') || /^\d{5,}$/.test(cleanVal);
    });

    let records: string[][] = [];
    let headers: string[] = [];

    if (isFirstRowData) {
        // No header row present; entire file is data
        records = lines.map(parseLine);
    } else {
        // First row contains headers
        headers = rawFirstRow.map(h => mapHeaderKey(h));
        records = lines.slice(1).map(parseLine);
    }

    const results: ParsedCSVLead[] = [];

    for (const rowValues of records) {
        if (rowValues.length === 0 || rowValues.every(v => !v)) continue;

        const leadData: ParsedCSVLead = {};

        if (headers.length > 0) {
            headers.forEach((key, idx) => {
                const val = rowValues[idx];
                if (val) {
                    if (key === 'budget') {
                        const parsedBudget = parseFloat(val.replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsedBudget)) leadData.budget = parsedBudget;
                    } else if (key === 'phone' || key === 'email' || key === 'name' || key === 'source' || key === 'tour_interest' || key === 'notes' || key === 'status') {
                        (leadData as any)[key] = val;
                    }
                }
            });

            // Single column file fallback if header didn't match known key
            if (!leadData.name && !leadData.email && !leadData.phone && rowValues[0]) {
                const val = rowValues[0];
                if (val.includes('@')) {
                    leadData.email = val;
                } else if (/^[+\d\s\-()]{5,}$/.test(val) || /\d/.test(val)) {
                    leadData.phone = val;
                } else {
                    leadData.name = val;
                }
            }
        } else {
            // Headerless CSV
            if (rowValues.length === 1) {
                const val = rowValues[0];
                if (val.includes('@')) {
                    leadData.email = val;
                } else if (/^[+\d\s\-()]{5,}$/.test(val) || /\d/.test(val)) {
                    leadData.phone = val;
                } else {
                    leadData.name = val;
                }
            } else {
                rowValues.forEach((val, idx) => {
                    if (!val) return;
                    if (val.includes('@')) {
                        leadData.email = val;
                    } else if (/^[+\d\s\-()]{5,}$/.test(val)) {
                        leadData.phone = val;
                    } else if (idx === 0) {
                        leadData.name = val;
                    }
                });
            }
        }

        // Must have at least name, email, or phone
        if (!leadData.name && !leadData.email && !leadData.phone) continue;

        results.push(leadData);
    }

    return results;
}
