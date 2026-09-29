import React, { useState } from 'react';
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
  FilterX
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { OrderModal } from '../ui/OrderModal.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';

export const OrdersLogistics: React.FC = () => {
  const {
    orders,
    advanceOrder,
    redistributions,
    approveRedistribution,
    selectedPHC,
    showNotification
  } = useApp();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const filteredOrders = orders.filter(o => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'ACTIVE') return o.status !== 'RECEIVED';
    if (selectedFilter === 'RECEIVED') return o.status === 'RECEIVED';
    return true;
  });

  const handleApproveTransfer = (id: string, name: string) => {
    approveRedistribution(id);
    showNotification(`Inter-PHC transfer approved: Dispatching batch of ${name}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Supply Chain & Logistics
            </span>
            <span className="text-xs text-slate-500 font-mono">RMSCL Mandore Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Orders, Consignments & Lateral PHC Transfers</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Procurement pipeline from district drug warehouses to facility stockrooms, plus authorized lateral transfers for {selectedPHC.name}.
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
          Autonomous balancing algorithm pairs facilities experiencing rapid stock depletion with neighboring clinics holding certified surplus batches.
        </p>

        <div className="space-y-3">
          {redistributions.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                item.status === 'APPROVED'
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900 text-sm">{item.medicineName}</span>
                  <span className="font-mono text-emerald-950 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-300">
                    {item.transferQuantity} Units
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Batch: {item.batchNumber}
                  </span>
                </div>

                <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-800">
                    Source: {item.sourcePHCName} (Surplus)
                  </span>
                  <span>→</span>
                  <span className="font-bold text-rose-800">
                    Destination: {item.destinationPHCName} (Imminent Stockout)
                  </span>
                  <span>•</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Distance: {item.transitDistanceKm} km (~{item.estimatedTransitTimeHours}h transit)
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">
                  Clinical Rationale: {item.clinicalRationale}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {item.status === 'APPROVED' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-100/90 px-3.5 py-2 rounded-lg border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Transfer Approved & En Route</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApproveTransfer(item.id, item.medicineName)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Lateral Transfer</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders & Consignments Pipeline */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Procurement & Warehouse Indent Tracking</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct telemetry from RMSCL District Drug Warehouses (DVDMS Interop)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
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
                description="There are currently no drug procurement orders matching this status filter."
                actionText="Show All Requisitions"
                onAction={() => setSelectedFilter('ALL')}
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
                            showNotification(`Consignment ${ord.id} status updated.`);
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
          <span className="font-mono text-slate-500">Gateway: RMSCL DVDMS 4.2</span>
        </div>
      </div>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </div>
  );
};
