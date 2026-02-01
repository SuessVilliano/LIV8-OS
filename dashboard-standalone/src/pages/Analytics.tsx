import AnalyticsDashboard from '../components/AnalyticsDashboard';

const Analytics = () => {
    return (
        <div className="h-full bg-[var(--os-bg)] flex flex-col font-sans text-[var(--os-text)] relative overflow-x-hidden custom-scrollbar overflow-y-auto transition-colors duration-500">
            <div className="p-6 md:p-10 relative z-10">
                <AnalyticsDashboard />
            </div>
        </div>
    );
};

export default Analytics;
