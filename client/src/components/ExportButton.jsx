import api from '../api';

export default function ExportButton({ url, params = {}, filename = 'export', formats = ['csv', 'excel'] }) {
    const handleExport = async (format) => {
        try {
            const queryParams = new URLSearchParams({ ...params, format });
            const response = await api.get(`${url}?${queryParams.toString()}`, {
                responseType: 'blob'
            });

            const ext = format === 'excel' ? 'xlsx' : 'csv';
            const contentType = format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv';

            const blob = new Blob([response.data], { type: contentType });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please try again.');
        }
    };

    return (
        <div className="flex gap-2">
            {formats.includes('csv') && (
                <button
                    onClick={() => handleExport('csv')}
                    className="btn btn-outline text-xs py-2 px-3"
                    title="Export as CSV"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                </button>
            )}
            {formats.includes('excel') && (
                <button
                    onClick={() => handleExport('excel')}
                    className="btn btn-accent text-xs py-2 px-3"
                    title="Export as Excel"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel
                </button>
            )}
        </div>
    );
}
