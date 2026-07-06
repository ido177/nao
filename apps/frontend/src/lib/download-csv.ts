export function downloadCsv(fileName: string, csv: string): void {
	const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}

export function sanitizeCsvFileName(name: string | undefined, fallback = 'query-result'): string {
	const base = (name ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return base || fallback;
}
