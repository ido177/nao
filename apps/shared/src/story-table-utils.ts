export function formatCellValue(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number') {
		return Number.isFinite(value) ? String(value) : 'NULL';
	}
	if (typeof value === 'boolean') {
		return value ? 'TRUE' : 'FALSE';
	}
	if (value === null || value === undefined) {
		return 'NULL';
	}
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
	const escape = (value: unknown): string => {
		if (value === null || value === undefined) {
			return '';
		}
		const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
		return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
	};

	const header = columns.map(escape).join(',');
	const body = rows.map((row) => columns.map((column) => escape(row[column])).join(','));
	return [header, ...body].join('\r\n');
}

export function isNumericColumn(rows: Record<string, unknown>[], column: string): boolean {
	return rows
		.filter((row) => row[column] !== null && row[column] !== undefined)
		.every((row) => isNumericValue(row[column]));
}

function isNumericValue(value: unknown): boolean {
	return typeof value === 'number' && Number.isFinite(value);
}
