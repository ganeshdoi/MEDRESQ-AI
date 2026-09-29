import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Truck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { evaluateMedicineThresholdAndReplenishment } from '../../utils/inventoryForecast.ts';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMedicineName?: string;
  initialQuantity?: number;
  defaultMedicine?: string;
  defaultQuantity?: number;
  defaultPriority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
  defaultJustification?: string;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  initialMedicineName,
  initialQuantity,
  defaultMedicine,
  defaultQuantity,
  defaultPriority,
  defaultJustification
}) => {
  const { medicines, orders, createOrder, selectedPHC } = useApp();

  const effectiveMedName = initialMedicineName || defaultMedicine;
  const effectiveQty = initialQuantity || defaultQuantity;

  const [selectedMedicine, setSelectedMedicine] = useState(
    effectiveMedName || medicines[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(effectiveQty || 200);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT'>(
    defaultPriority || 'URGENT'
  );
  const [justification, setJustification] = useState(
    defaultJustification || 'Configurable demo threshold replenishment for OPD & emergency ward buffer.'
  );
  const [isConfirmedByUser, setIsConfirmedByUser] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveMedName) {
      setSelectedMedicine(effectiveMedName);
    } else if (!selectedMedicine && medicines[0]?.name) {
      setSelectedMedicine(medicines[0].name);
    }
    if (effectiveQty && effectiveQty > 0) {
      setQuantity(effectiveQty);
    }
    if (defaultPriority) {
      setPriority(defaultPriority);
    }
    if (defaultJustification) {
      setJustification(defaultJustification);
    }
    setIsConfirmedByUser(false);
    setValidationError(null);
  }, [effectiveMedName, effectiveQty, defaultPriority, defaultJustification, isOpen, medicines]);

  const currentMed = useMemo(
    () => medicines.find((m) => m.name === selectedMedicine),
    [medicines, selectedMedicine]
  );

  const evalResult = useMemo(
    () => (currentMed ? evaluateMedicineThresholdAndReplenishment(currentMed) : null),
    [currentMed]
  );

  // Check if an active simulated order already exists for this medicine at this PHC
  const existingActiveOrder = useMemo(() => {
    if (!selectedMedicine) return undefined;
    return orders.find(
      (o) =>
        o.status !== 'RECEIVED' &&
        (o.phcId === selectedPHC.id || o.destination.includes(selectedPHC.name)) &&
        o.medicineName.toLowerCase() === selectedMedicine.toLowerCase()
    );
  }, [orders, selectedMedicine, selectedPHC.id, selectedPHC.name]);

  if (!isOpen) return null;

  const destinationLabel = `${selectedPHC.name} Store (${selectedPHC.district})`;
  const sourceWarehouseLabel = `${selectedPHC.district} District Drug Warehouse (Simulated RMSCL Hub)`;
  const estimatedDeliveryLabel =
    priority === 'EMERGENCY_REPLENISHMENT'
      ? 'Within 24 Hours (Simulated Emergency Dispatch — Est. 2026-09-23)'
      : priority === 'URGENT'
      ? 'Within 48 Hours (Simulated Urgent Dispatch — Est. 2026-09-24)'
      : '3–4 Days Standard Transit (Simulated Routine — Est. 2026-09-26)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (existingActiveOrder) {
      setValidationError(
        `Duplicate Order Prevented: An active simulated order (#${existingActiveOrder.id} for +${existingActiveOrder.quantityRequested.toLocaleString()} ${currentMed?.unit || 'Units'}) is already in the pipeline (${existingActiveOrder.status}) for ${selectedMedicine} at ${selectedPHC.name}.`
      );
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setValidationError('Please enter a valid order quantity greater than 0.');
      return;
    }

    if (!isConfirmedByUser) {
      setValidationError(
        'Explicit Confirmation Required: Please review the Order Preview below and check the confirmation box before submitting.'
      );
      return;
    }

    const created = await createOrder({
      medicineName: selectedMedicine,
      quantityRequested: quantity,
      priority,
      justification: `[SIMULATED DEMO ORDER] ${justification}`,
      confirmedByUser: true
    });

    if (created) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="order-modal-title" className="font-bold text-sm text-white">
                  Create Medicine Replenishment Order
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  SIMULATED DEMO ORDER
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Review medicine, quantity, destination &amp; delivery preview before confirming
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close order modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated Order Notice Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>SIMULATED ORDER (DEMO ONLY):</strong> Orders created here update the local/demo inventory pipeline only and do not submit live government e-Aushadhi requisitions.
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Select Medicine */}
          <div>
            <label htmlFor="order-medicine" className="block font-bold text-slate-700 mb-1.5">
              1. Select Essential Medicine
            </label>
            <select
              id="order-medicine"
              value={selectedMedicine}
              onChange={(e) => {
                const nextMedName = e.target.value;
                setSelectedMedicine(nextMedName);
                setIsConfirmedByUser(false);
                setValidationError(null);
                const found = medicines.find((m) => m.name === nextMedName);
                if (found) {
                  const ev = evaluateMedicineThresholdAndReplenishment(found);
                  setQuantity(ev.recommendedOrderQty);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} (Usable: {m.currentStock} {m.unit} · Demo Min: {m.minStockLevel})
                </option>
              ))}
            </select>
          </div>

          {/*Duplicate Order Warning Banner if Active Order Exists */}
          {existingActiveOrder && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
              <div className="font-bold text-xs flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Duplicate Order Guard: Active Simulated Order Already Exists</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Order <strong>#{existingActiveOrder.id}</strong> for{' '}
                <strong>+{existingActiveOrder.quantityRequested.toLocaleString()} {currentMed?.unit || 'Units'}</strong> of{' '}
                <strong>{existingActiveOrder.medicineName}</strong> is already <strong>{existingActiveOrder.status}</strong> for{' '}
                <strong>{selectedPHC.name}</strong> (Est. Delivery: {existingActiveOrder.estimatedDelivery}). To prevent accidental duplicate orders, please advance or receive the existing order in Orders &amp; Transfers or select a different medicine.
              </p>
            </div>
          )}

          {/* Current Stock & Configurable Threshold Context */}
          {currentMed && evalResult && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Usable Stock</span>
                <strong className="font-mono text-slate-900 text-xs">
                  {evalResult.usableStock.toLocaleString()} {currentMed.unit} ({evalResult.usableDaysOfCover}d cover)
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Demo Min / ROP</span>
                <strong className="font-mono text-slate-900 text-xs">
                  {evalResult.minThreshold} / {evalResult.reorderPoint} {currentMed.unit}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Suggested Demo Order</span>
                <strong className="font-mono text-teal-700 text-xs">
                  +{evalResult.recommendedOrderQty.toLocaleString()} {currentMed.unit}
                </strong>
              </div>
            </div>
          )}

          {/* Quantity & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="order-qty" className="block font-bold text-slate-700 mb-1.5">
                2. Quantity to Order ({currentMed?.unit || 'Units'})
              </label>
              <input
                id="order-qty"
                type="number"
                min={1}
                max={50000}
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setIsConfirmedByUser(false);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label htmlFor="order-priority" className="block font-bold text-slate-700 mb-1.5">
                3. Dispatch Priority
              </label>
              <select
                id="order-priority"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as any);
                  setIsConfirmedByUser(false);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="ROUTINE">Routine Cycle Indent (3–4d)</option>
                <option value="URGENT">Urgent Replenishment (48h)</option>
                <option value="EMERGENCY_REPLENISHMENT">Emergency Dispatch (24h)</option>
              </select>
            </div>
          </div>

          {/* Justification */}
          <div>
            <label htmlFor="order-justification" className="block font-bold text-slate-700 mb-1.5">
              4. Operational Justification Note
            </label>
            <textarea
              id="order-justification"
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* PRE-SUBMISSION ORDER PREVIEW CARD */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
              <span className="font-bold text-teal-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-teal-700" />
                <span>Pre-Submission Order Preview</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                SIMULATED ORDER PREVIEW
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Medicine &amp; Quantity</span>
                <div className="font-bold text-slate-900 mt-0.5">{selectedMedicine}</div>
                <div className="font-mono font-bold text-teal-700 text-sm">
                  +{Number.isFinite(quantity) ? quantity.toLocaleString() : 0} {currentMed?.unit || 'Units'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Destination Facility</span>
                <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{destinationLabel}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">From: {sourceWarehouseLabel}</div>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-teal-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Estimated Delivery Window
                  </span>
                  <strong className="text-slate-900 text-xs">{estimatedDeliveryLabel}</strong>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {priority.replace('_', ' ')}
              </span>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmedByUser}
                disabled={Boolean(existingActiveOrder)}
                onChange={(e) => {
                  setIsConfirmedByUser(e.target.checked);
                  if (e.target.checked) setValidationError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-semibold text-slate-800 leading-snug">
                I have reviewed the medicine, quantity (<strong>+{quantity.toLocaleString()} {currentMed?.unit || 'Units'}</strong>), destination (<strong>{selectedPHC.name}</strong>), and estimated delivery above, and confirm creating this <strong>simulated demo order</strong>.
              </span>
            </label>
          </div>

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
              {validationError}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(existingActiveOrder) || !isConfirmedByUser}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
                existingActiveOrder || !isConfirmedByUser
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {existingActiveOrder
                  ? 'Duplicate Order Blocked'
                  : 'Confirm & Submit Simulated Order'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
