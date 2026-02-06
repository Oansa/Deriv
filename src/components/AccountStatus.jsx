import { User, Wallet, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

function AccountStatus({ accountInfo, balance, riskAnalysis }) {
    const getRiskColor = (level) => {
        switch (level) {
            case 'critical':
                return 'text-danger bg-danger/20 border-danger/50';
            case 'high':
                return 'text-warning bg-warning/20 border-warning/50';
            case 'medium':
                return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/50';
            default:
                return 'text-success bg-success/20 border-success/50';
        }
    };

    const getRiskIcon = (level) => {
        if (level === 'low') {
            return <CheckCircle className="w-5 h-5" />;
        }
        return <AlertCircle className="w-5 h-5" />;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Info Card */}
            <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-accent/20 rounded-lg">
                        <User className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-text-primary">Account</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-text-secondary text-sm">Login ID</span>
                        <span className="text-text-primary font-medium">
                            {accountInfo?.loginid || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary text-sm">Email</span>
                        <span className="text-text-primary font-medium text-sm truncate max-w-32">
                            {accountInfo?.email || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary text-sm">Country</span>
                        <span className="text-text-primary font-medium">
                            {accountInfo?.country || '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Balance Card */}
            <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-success/20 rounded-lg">
                        <Wallet className="w-5 h-5 text-success" />
                    </div>
                    <h3 className="font-semibold text-text-primary">Balance</h3>
                </div>
                <div className="space-y-2">
                    <div className="text-2xl font-bold text-text-primary">
                        {balance?.currency} {balance?.balance?.toFixed(2) || '0.00'}
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Account Type</span>
                        <span className="text-text-primary capitalize">
                            {accountInfo?.is_virtual ? 'Demo' : 'Real'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Risk Score Card */}
            <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${getRiskColor(riskAnalysis?.riskLevel)}`}>
                        {getRiskIcon(riskAnalysis?.riskLevel)}
                    </div>
                    <h3 className="font-semibold text-text-primary">Risk Score</h3>
                </div>
                <div className="space-y-3">
                    <div className="text-3xl font-bold text-text-primary">
                        {riskAnalysis?.riskScore || 0}
                        <span className="text-lg text-text-secondary">/100</span>
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(riskAnalysis?.riskLevel)}`}>
                        {riskAnalysis?.riskLevel?.toUpperCase() || 'LOW'} RISK
                    </div>
                </div>
            </div>

            {/* Warnings Summary Card */}
            <div className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-warning/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-warning" />
                    </div>
                    <h3 className="font-semibold text-text-primary">Alerts</h3>
                </div>
                <div className="space-y-2">
                    <div className="text-2xl font-bold text-text-primary">
                        {riskAnalysis?.warnings?.length || 0}
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-danger/20 text-danger rounded">
                            {riskAnalysis?.warnings?.filter((w) => w.level === 'critical').length || 0} Critical
                        </span>
                        <span className="px-2 py-1 bg-warning/20 text-warning rounded">
                            {riskAnalysis?.warnings?.filter((w) => w.level === 'high').length || 0} High
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountStatus;
