import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Package,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  MapPin,
  FilterX,
  Search,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { OrderModal } from '../ui/OrderModal.tsx';
import { WhyThisAlertModal, AlertMathBreakdown } from '../ui/WhyThisAlertModal.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { matchesSearchKeywords } from '../../utils/globalSearch.ts';
import { getCanonicalOrderMetrics } from '../../utils/datasetMetrics.ts';

export const OrdersLogistics: React.FC = () => {
  const {
    orders,
    advanceOrder,
    redistributions,
    supplyChainAuditLog,
    approveRedistribution,
    rejectRedistribution,
    advanceRedistribution,
    selectedPHC,
    inchargeSession,
    requireAuthorizedAccess
  } = useApp();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [explainItem, setExplainItem] = useState<AlertMathBreakdown | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [transferFilter, setTransferFilter] = useState<
    'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'RECEIVED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const activeOfficerLabel = inchargeSession?.inchargeName
    ? `${inchargeSession.inchargeName} (${inchargeSession.designation || 'Medical Officer I/C'})`
    : 'Dr. S.C. Bishnoi (Senior Medical Officer I/C)';

  const orderMetrics = getCanonicalOrderMetrics(orders, redistributions);

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.query) {
        setSearchQuery(detail.query);
        setSelectedFilter('ALL');
      }
    };
    window.addEventListener('medresq:global-search', handleGlobalSearch);
    return () => window.removeEventListener('medresq:global-search', handleGlobalSearch);
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (searchQuery.trim()) {
      const matches = matchesSearchKeywords(
        searchQuery,
        o.id,
        o.medicineName,
        o.source,
        o.destination,
        o.status,
        o.priority,
        o.consignmentId
      );
      if (!matches) return false;
    }
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'ACTIVE') {
      return o.status !== 'RECEIVED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
    }
    if (selectedFilter === 'RECEIVED') {
      return o.status === 'RECEIVED' || o.status === 'DELIVERED';
    }
    return true;
  });

  const handleReviewTransfer = (id: string) => {
    approveRedistribution(id);
  };

  const handleApproveTransfer = (id: string) => {
    approveRedistribution(id, undefined, true);
  };

  const handleRejectTransfer = (id: string) => {
    rejectRedistribution(id, 'Rejected by Medical Officer during clinical review');
  };

  const handleAdvanceTransfer = (id: string) => {
    advanceRedistribution(id);
  };

  const matchesTransferStage = (
    status: string,
    filter: 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'RECEIVED'
  ) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING_REVIEW') return status === 'PENDING_REVIEW' || status === 'PROPOSED';
    if (filter === 'APPROVED') return status === 'APPROVED';
    if (filter === 'REJECTED') return status === 'REJECTED' || status === 'CANCELLED';
    if (filter === 'DISPATCHED') return status === 'DISPATCHED' || status === 'IN_TRANSIT';
    if (filter === 'RECEIVED') return status === 'RECEIVED' || status === 'COMPLETED';
    return true;
  };

  const filteredRedistributions = redistributions.filter((item) => {
    if (!matchesTransferStage(item.status, transferFilter)) return false;
    if (searchQuery.trim()) {
      const donor = item.sourcePHCName || item.sourcePHC?.name || '';
      const recipient = item.destinationPHCName || item.targetPHC?.name || '';
      return matchesSearchKeywords(
        searchQuery,
        item.id,
        item.medicineName,
        donor,
        recipient,
        item.status,
        item.reviewedBy,
        item.approvedBy,
        item.rejectedBy,
        item.rejectionReason
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Replenishment &amp; Transfers
            </span>
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
              Synthetic / Demo Warehouse &amp; PHC Transfer Pipeline
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Replenishment Orders &amp; Inter-PHC Lateral Transfers</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage warehouse replenishment indents and execute validated inter-PHC surplus medicine transfers for <strong>{selectedPHC.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              requireAuthorizedAccess(
                () => setIsOrderModalOpen(true),
                'Create medicine replenishment indent'
              )
            }
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Medicine Indent</span>
          </button>
        </div>
      </div>

      {/* Inter-PHC Lateral Redistribution Proposals */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Inter-PHC Lateral Resource Balancing Opportunities ({orderMetrics.pendingTransfersCount} Pending Review · {orderMetrics.approvedTransfersCount} Approved · {orderMetrics.rejectedTransfersCount} Rejected · {orderMetrics.totalTransfersCount} Total)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
            District Redistribution Protocol
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Rule-based balancing pairs facilities experiencing rapid stock depletion with neighboring clinics holding verified surplus batches in the demo network.
        </p>

        {/* Lifecycle Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { key: 'ALL', label: `All (${redistributions.length})` },
              {
                key: 'PENDING_REVIEW',
                label: `Pending Review (${redistributions.filter((r) => r.status === 'PENDING_REVIEW' || r.status === 'PROPOSED').length})`
              },
              {
                key: 'APPROVED',
                label: `Approved (${redistributions.filter((r) => r.status === 'APPROVED').length})`
              },
              {
                key: 'REJECTED',
                label: `Rejected (${redistributions.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length})`
              },
              {
                key: 'DISPATCHED',
                label: `Dispatched (${redistributions.filter((r) => r.status === 'DISPATCHED' || r.status === 'IN_TRANSIT').length})`
              },
              {
                key: 'RECEIVED',
                label: `Received (${redistributions.filter((r) => r.status === 'RECEIVED' || r.status === 'COMPLETED').length})`
              }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTransferFilter(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border transition-colors cursor-pointer ${
                transferFilter === tab.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRedistributions.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
              No recommendations or lateral transfers match the selected filter (<strong>{transferFilter}</strong>).
            </div>
          ) : (
            filteredRedistributions.map((item) => {
            const isApproved =
              item.status === 'APPROVED' ||
              item.status === 'DISPATCHED' ||
              item.status === 'IN_TRANSIT' ||
              item.status === 'RECEIVED' ||
              item.status === 'COMPLETED';
            const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';
            const isDispatched =
              item.status === 'DISPATCHED' ||
              item.status === 'IN_TRANSIT' ||
              item.status === 'RECEIVED' ||
              item.status === 'COMPLETED';
            const isReceived = item.status === 'RECEIVED' || item.status === 'COMPLETED';
            const qty = item.recommendedTransferQuantity || item.transferQuantity || 0;
            const donor = item.sourcePHCName || item.sourcePHC?.name || 'Donor PHC';
            const recipient = item.destinationPHCName || item.targetPHC?.name || 'Recipient PHC';
            const reviewerLabel =
              item.reviewedBy || item.approvedBy || item.rejectedBy || activeOfficerLabel;
            const reviewTimestamp = item.reviewedAt || item.approvedAt || item.rejectedAt;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isApproved
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : isRejected
                    ? 'border-rose-300 bg-rose-50/50'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 text-sm">{item.medicineName}</span>
                    <span className="font-mono text-emerald-950 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-300">
                      {qty} Units
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : isRejected
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      ID: {item.id}
                    </span>
                  </div>

                  {/* Lifecycle Stepper: PENDING_REVIEW -> APPROVED -> DISPATCHED -> RECEIVED or PENDING_REVIEW -> REJECTED */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-slate-400 uppercase font-bold mr-1">Lifecycle:</span>
                    {isRejected ? (
                      <>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          PENDING_REVIEW
                        </span>
                        <span className="text-rose-500 font-bold">→</span>
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                          REJECTED
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            !isApproved
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          PENDING_REVIEW
                        </span>
                        <span className="text-slate-400 font-bold">→</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-700 text-white'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          APPROVED
                        </span>
                        <span className="text-slate-400 font-bold">→</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            (item.status === 'DISPATCHED' || item.status === 'IN_TRANSIT')
                              ? 'bg-blue-700 text-white'
                              : isReceived
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          DISPATCHED
                        </span>
                        <span className="text-slate-400 font-bold">→</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isReceived
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          RECEIVED
                        </span>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-slate-800">
                      Donor: {donor} (Surplus Validated)
                    </span>
                    <span>→</span>
                    <span className="font-bold text-rose-800">
                      Recipient: {recipient}
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Distance: {item.transitDistanceKm} km (~{item.estimatedTransitTimeHours}h transit)
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 font-medium flex flex-wrap items-center gap-2">
                    <span>Supply Rationale: {item.clinicalRationale}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setExplainItem({
                          title: `Inter-PHC Transfer: ${item.medicineName} (${donor} → ${recipient})`,
                          medicineName: item.medicineName,
                          currentStock: item.targetPHC?.currentStock ?? 210,
                          unit: 'Units',
                          avgDailyConsumption: Math.max(10, Math.round((item.targetPHC?.projectedDemand || 400) / 14)),
                          recentTrendPercent: 18,
                          forecastDemand: item.targetPHC?.projectedDemand ?? qty,
                          nextReplenishmentDays: Math.max(1, Math.round(item.estimatedTransitTimeHours || 1)),
                          safetyBufferDays: 5,
                          projectedRisk: item.targetPHC?.urgencyLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                          reason: `${item.clinicalRationale} Recommended transfer: ${qty} units from ${donor} (${item.sourcePHC?.currentStock ?? 'Verified'} in stock) across ${item.transitDistanceKm} km (~${item.estimatedTransitTimeHours}h transit).`,
                          onLateralTransfer:
                            !isApproved && !isRejected
                              ? () => {
                                  setExplainItem(null);
                                  handleReviewTransfer(item.id);
                                }
                              : undefined
                        })
                      }
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      Why this recommendation?
                    </button>
                  </div>

                  {(isApproved || isRejected) && (
                    <div className="text-[11px] font-mono text-slate-600 pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Reviewed by: <strong className="text-slate-900">{reviewerLabel}</strong>
                      </span>
                      {reviewTimestamp && (
                        <span>
                          Timestamp: <strong className="text-slate-800">{new Date(reviewTimestamp).toLocaleString()}</strong>
                        </span>
                      )}
                      {isRejected && item.rejectionReason && (
                        <span className="text-rose-800">
                          Reason: {item.rejectionReason}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-wrap items-center gap-2">
                  {isApproved ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-100/90 px-3 py-2 rounded-lg border border-emerald-300 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Status: {item.status} · Donor Deducted &amp; Receiver Credited</span>
                      </div>
                      {item.status !== 'COMPLETED' && item.status !== 'RECEIVED' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceTransfer(item.id)}
                          className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {item.status === 'APPROVED' ? 'Mark Dispatched →' : 'Mark Received →'}
                        </button>
                      )}
                    </>
                  ) : isRejected ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 bg-rose-100/90 px-3 py-2 rounded-lg border border-rose-300 font-mono">
                      <X className="w-4 h-4 text-rose-700" />
                      <span>Status: {item.status} · No Stock Transferred</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReviewTransfer(item.id)}
                        className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                        <span>Review Recommendation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveTransfer(item.id)}
                        className="px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectTransfer(item.id)}
                        className="px-3.5 py-2 bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Orders & Consignments Pipeline */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Procurement &amp; Warehouse Indent Tracking</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Local SQLite &amp; Offline-Queue Replenishment Pipeline (Simulated District Warehouse Dispatch)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indent ID, drug, warehouse..."
                className="bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs w-52 sm:w-64"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-slate-600 font-bold">Filter:</span>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Indents ({orderMetrics.totalOrdersCount})</option>
              <option value="ACTIVE">Active &amp; In Transit ({orderMetrics.activeOrdersCount})</option>
              <option value="RECEIVED">Delivered / Received ({orderMetrics.completedOrdersCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {filteredOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FilterX}
                title="No Orders Match Filter"
                description="There are currently no drug procurement orders matching this status filter or search query."
                actionText="Show All Requisitions"
                onAction={() => {
                  setSelectedFilter('ALL');
                  setSearchQuery('');
                }}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Order ID & Date</th>
                  <th scope="col" className="px-3 py-3">Medicine Requisitioned</th>
                  <th scope="col" className="px-3 py-3 text-right">Quantity</th>
                  <th scope="col" className="px-3 py-3">Routing Pipeline</th>
                  <th scope="col" className="px-3 py-3">ETA & Consignment</th>
                  <th scope="col" className="px-3 py-3 text-center">Status</th>
                  <th scope="col" className="px-3 py-3 text-center">Lifecycle Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-bold text-slate-900">{ord.id}</div>
                      <div className="text-[10px] text-slate-500">{ord.requestDate}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-900">{ord.medicineName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Priority: <span className="font-bold text-slate-700">{ord.priority}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {ord.quantityRequested.toLocaleString()} Units
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="text-slate-800 font-medium truncate max-w-xs">{ord.source}</div>
                      <div className="text-slate-500 truncate max-w-xs text-[11px]">→ {ord.destination}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">
                      <div className="text-slate-800 font-semibold">{ord.estimatedDelivery}</div>
                      <div className="text-[10px] text-blue-700 font-semibold">
                        {ord.consignmentId || 'Awaiting Dispatch'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                          ord.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : ord.status === 'IN TRANSIT'
                            ? 'bg-sky-100 text-sky-950 border border-sky-300'
                            : ord.status === 'DISPATCHED'
                            ? 'bg-blue-100 text-blue-950 border border-blue-300'
                            : 'bg-amber-100 text-amber-950 border border-amber-300'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {ord.status !== 'RECEIVED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            advanceOrder(ord.id);
                          }}
                          className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                        >
                          Advance Step →
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono font-semibold">
                          Committed to Ledger
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
          <span>
            Total active requisitions: <strong>{filteredOrders.length}</strong>
          </span>
          <span className="font-mono text-slate-500">Mode: Simulated Warehouse Pipeline (Local DB)</span>
        </div>
      </div>

      {/* Audit History Section (Reuses redistributions, statusHistory, and supplyChainAuditLog) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-4 h-4 text-teal-700" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Audit History — Recommendation Reviews &amp; Inter-PHC Transfers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable Medical Officer review ledger, lifecycle progression, and stock transfer outcomes ({filteredRedistributions.length} records shown · {supplyChainAuditLog.length} total ledger events)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-teal-50 text-teal-900 border border-teal-200">
            Active Reviewer: {activeOfficerLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Recommendation / Transfer ID</th>
                <th scope="col" className="px-3 py-3">Medicine</th>
                <th scope="col" className="px-3 py-3">Source PHC → Destination PHC</th>
                <th scope="col" className="px-3 py-3 text-right">Quantity</th>
                <th scope="col" className="px-3 py-3">Current Status &amp; Lifecycle</th>
                <th scope="col" className="px-3 py-3">Medical Officer / Reviewer</th>
                <th scope="col" className="px-3 py-3">Review Timestamp</th>
                <th scope="col" className="px-4 py-3">Approval / Rejection Outcome &amp; Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRedistributions.map((item) => {
                const isApproved =
                  item.status === 'APPROVED' ||
                  item.status === 'DISPATCHED' ||
                  item.status === 'IN_TRANSIT' ||
                  item.status === 'RECEIVED' ||
                  item.status === 'COMPLETED';
                const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';
                const qty = item.recommendedTransferQuantity || item.transferQuantity || 0;
                const donor = item.sourcePHCName || item.sourcePHC?.name || 'Donor PHC';
                const recipient = item.destinationPHCName || item.targetPHC?.name || 'Recipient PHC';
                const lastHistory =
                  item.statusHistory && item.statusHistory.length > 0
                    ? item.statusHistory[item.statusHistory.length - 1]
                    : null;
                const matchingAudit = supplyChainAuditLog.find((a) => a.entityId === item.id);
                const reviewer =
                  item.reviewedBy ||
                  item.approvedBy ||
                  item.rejectedBy ||
                  lastHistory?.actor ||
                  matchingAudit?.actor ||
                  (isApproved || isRejected ? activeOfficerLabel : 'Pending Medical Officer Review');
                const rawTimestamp =
                  item.reviewedAt ||
                  item.approvedAt ||
                  item.rejectedAt ||
                  item.receivedAt ||
                  item.dispatchedAt ||
                  lastHistory?.timestamp ||
                  matchingAudit?.timestamp ||
                  item.createdDate;
                const formattedTimestamp = rawTimestamp
                  ? rawTimestamp.includes('T')
                    ? new Date(rawTimestamp).toLocaleString()
                    : rawTimestamp
                  : 'Awaiting Review';

                const lifecycleString = isRejected
                  ? 'PENDING_REVIEW → REJECTED'
                  : 'PENDING_REVIEW → APPROVED → DISPATCHED → RECEIVED';

                const outcomeSummary = isRejected
                  ? `REJECTED: ${item.rejectionReason || lastHistory?.note || 'Rejected by Medical Officer during clinical review'} (0 units transferred)`
                  : isApproved
                  ? matchingAudit?.stockImpactSummary ||
                    lastHistory?.note ||
                    `APPROVED: Deducted ${qty} units from ${donor} & credited +${qty} units to ${recipient}`
                  : 'Awaiting Medical Officer clinical review and authorization.';

                return (
                  <tr key={`audit-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div>{item.id}</div>
                      {matchingAudit?.transactionId && (
                        <div className="text-[10px] text-slate-500">TXN: {matchingAudit.transactionId}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      <div>{item.medicineName}</div>
                      {item.batchNumber && (
                        <div className="text-[10px] font-mono text-slate-500">Batch: {item.batchNumber}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{donor}</div>
                      <div className="text-[11px] text-rose-800 font-semibold">→ {recipient}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                      {qty.toLocaleString()} Units
                    </td>
                    <td className="px-3 py-3 font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {item.status}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">{lifecycleString}</div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {reviewer}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                      {formattedTimestamp}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-700 max-w-xs">
                      <div className={isRejected ? 'text-rose-800 font-semibold' : isApproved ? 'text-emerald-900 font-medium' : 'text-slate-500'}>
                        {outcomeSummary}
                      </div>
                      {item.statusHistory && item.statusHistory.length > 0 && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Transitions recorded: {item.statusHistory.map((h) => `${h.previousStatus}→${h.newStatus}`).join(', ')}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />

      <WhyThisAlertModal
        isOpen={Boolean(explainItem)}
        onClose={() => setExplainItem(null)}
        data={explainItem}
      />
    </div>
  );
};
