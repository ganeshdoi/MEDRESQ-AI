import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMedicine?: string;
  defaultQuantity?: number;
  defaultPriority?: 'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT';
  defaultJustification?: string;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  defaultMedicine,
  defaultQuantity = 500,
  defaultPriority = 'ROUTINE',
  defaultJustification = 'Stock level dip below minimum buffer; accelerated seasonal burn rate.'
}) => {
  const { medicines, createOrder, selectedPHC } = useApp();
  const [medicineName, setMedicineName] = useState(defaultMedicine || (medicines[0]?.name ?? ''));
  const [quantity, setQuantity] = useState<number>(defaultQuantity);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY_REPLENISHMENT'>(defaultPriority);
  const [justification, setJustification] = useState(defaultJustification);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultMedicine) setMedicineName(defaultMedicine);
    if (defaultQuantity) setQuantity(defaultQuantity);
    if (defaultPriority) setPriority(defaultPriority);
    if (defaultJustification) setJustification(defaultJustification);
  }, [defaultMedicine, defaultQuantity, defaultPriority, defaultJustification, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName || quantity <= 0) return;

    setIsSubmitting(true);
    await createOrder({
      medicineName,
      quantityRequested: quantity,
      priority,
      justification
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-order-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              RMSCL Indent Portal Gateway
            </div>
            <h3 id="modal-order-title" className="font-bold text-slate-900 text-base mt-0.5">
              Create Essential Medicine Requisition
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consignment Destination: <strong>{selectedPHC.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label htmlFor="select-med-name" className="block font-bold text-slate-700 mb-1.5">
              Select Essential Drug from Formulary
            </label>
            <select
              id="select-med-name"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs cursor-pointer"
              required
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} — Current: {m.currentStock} {m.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-req-qty" className="block font-bold text-slate-700 mb-1.5">
                Requisition Quantity (Units)
              </label>
              <input
                id="input-req-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                required
              />
            </div>
            <div>
              <label htmlFor="select-req-priority" className="block font-bold text-slate-700 mb-1.5">
                Indent Priority Category
              </label>
              <select
                id="select-req-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="ROUTINE">Routine Replenishment (4–5 days)</option>
                <option value="URGENT">Urgent Stockout Buffer (2–3 days)</option>
                <option value="EMERGENCY_REPLENISHMENT">Emergency Buffer Replenishment (24–48 hrs)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="input-req-reason" className="block font-bold text-slate-700 mb-1.5">
              Clinical / Epidemiological Justification
            </label>
            <textarea
              id="input-req-reason"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
              placeholder="State rationale (e.g. heatwave surge, high diarrhea incidence, rapid buffer depletion)..."
              required
            />
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-medium">
              <strong>Official Supply Chain Protocol:</strong> Requisition routes directly to District Drug Warehouse Mandore (RMSCL). Requires Medical Officer digital sign-off.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitting...' : 'Submit Requisition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
