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
import { EmptyState } from '../ui/EmptyState.tsx';
import { matchesSearchKeywords } from '../../utils/globalSearch.ts';

export const OrdersLogistics: React.FC = () => {
  const {
    orders,
    advanceOrder,
    redistributions,
    approveRedistribution,
    advanceRedistribution,
    selectedPHC
  } = useApp();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (selectedFilter === 'ACTIVE') return o.status !== 'RECEIVED';
    if (selectedFilter === 'RECEIVED') return o.status === 'RECEIVED';
    return true;
  });

  const handleApproveTransfer = (id: string) => {
    approveRedistribution(id);
  };

  const handleAdvanceTransfer = (id: string) => {
    advanceRedistribution(id);
  };

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
            onClick={() => setIsOrderModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
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
              Inter-PHC Lateral Resource Balancing Opportunities
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
            District Redistribution Protocol
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Rule-based balancing pairs facilities experiencing rapid stock depletion with neighboring clinics holding verified surplus batches in the demo network.
        </p>

        <div className="space-y-3">
          {redistributions.map((item) => {
            const isApproved = item.status === 'APPROVED' || item.status === 'IN_TRANSIT' || item.status === 'COMPLETED';
            const qty = item.recommendedTransferQuantity || item.transferQuantity || 0;
            const donor = item.sourcePHCName || item.sourcePHC?.name || 'Donor PHC';
            const recipient = item.destinationPHCName || item.targetPHC?.name || 'Recipient PHC';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isApproved
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 text-sm">{item.medicineName}</span>
                    <span className="font-mono text-emerald-950 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-300">
                      {qty} Units
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      ID: {item.id}
                    </span>
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

                  <div className="text-[11px] text-slate-600 font-medium">
                    Supply Rationale: {item.clinicalRationale}
                  </div>
                </div>

                <div className="shrink-0 flex flex-wrap items-center gap-2">
                  {isApproved ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-100/90 px-3 py-2 rounded-lg border border-emerald-300 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Status: {item.status} · Donor Deducted &amp; Receiver Credited</span>
                      </div>
                      {item.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceTransfer(item.id)}
                          className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {item.status === 'APPROVED' ? 'Mark In Transit →' : 'Mark Completed →'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApproveTransfer(item.id)}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Lateral Transfer ({item.status})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
              <option value="ALL">All Indents ({orders.length})</option>
              <option value="ACTIVE">Active & In Transit</option>
              <option value="RECEIVED">Delivered / Received</option>
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

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </div>
  );
};
