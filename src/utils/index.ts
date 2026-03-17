export function normalizeUrl(url: string): string {
    return url.trim().toLowerCase().replace(/\/+$/, '');
}

export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}