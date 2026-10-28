import React from 'react';

export const Legend: React.FC = () => {
  return (
    <div className="border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-800">
      <div className="font-semibold text-neutral-700 mb-1.5 uppercase tracking-wide text-[11px]">
        Packet State Legend
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* No data received */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-sm bg-white border border-neutral-400 shadow-2xs"></span>
          <span>No data received</span>
        </div>

        {/* Data buffered */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-sm bg-blue-500 border border-blue-600"></span>
          <span>Data buffered</span>
        </div>

        {/* ACK */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-sm bg-amber-500 border border-amber-600"></span>
          <span>ACK</span>
        </div>

        {/* Transmission confirmed */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-sm bg-green-500 border border-green-600"></span>
          <span>Transmission confirmed</span>
        </div>

        {/* Data delivered to upper network layer */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-sm bg-emerald-700 border border-emerald-800"></span>
          <span>Data delivered to the upper network layer</span>
        </div>
      </div>
    </div>
  );
};
