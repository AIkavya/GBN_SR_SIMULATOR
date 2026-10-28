import React from 'react';
import { ProtocolType } from '../types/protocol';

interface SlotStatus {
  seq: number;
  state: 'no_data' | 'buffered' | 'confirmed' | 'delivered';
  timerRemaining?: number; // seconds remaining if timer active
}

interface WindowOverviewProps {
  protocol: ProtocolType;
  windowSize: number;
  senderBase: number;
  nextSeqNum: number;
  receiverBase: number; // for SR: recvBase; for GBN: expectedSeqNum
  senderSlots: SlotStatus[];
  receiverSlots: SlotStatus[];
  maxVisibleSlots?: number;
}

export const WindowOverview: React.FC<WindowOverviewProps> = ({
  protocol,
  windowSize,
  senderBase,
  nextSeqNum,
  receiverBase,
  senderSlots,
  receiverSlots,
  maxVisibleSlots = 16,
}) => {
  // Determine window range
  const senderWinStart = senderBase;
  const senderWinEnd = senderBase + windowSize - 1;

  const recvWinStart = receiverBase;
  const recvWinEnd = protocol === 'gbn' ? receiverBase : receiverBase + windowSize - 1;

  const renderSlot = (slot: SlotStatus, isInsideWindow: boolean, isNextToSend: boolean) => {
    let bgClass = 'bg-white border-neutral-300 text-neutral-600';
    let label = '';

    if (slot.state === 'confirmed') {
      bgClass = 'bg-green-500 border-green-600 text-white font-bold';
      label = 'ACK';
    } else if (slot.state === 'delivered') {
      bgClass = 'bg-emerald-700 border-emerald-800 text-white font-bold';
      label = 'OK';
    } else if (slot.state === 'buffered') {
      bgClass = 'bg-blue-500 border-blue-600 text-white font-bold';
      label = 'BUF';
    }

    return (
      <div
        key={slot.seq}
        className={`relative flex flex-col items-center justify-center w-8 h-9 border rounded-sm transition-all text-xs ${bgClass} ${
          isInsideWindow ? 'ring-2 ring-neutral-900 ring-offset-1 font-semibold' : 'opacity-85'
        }`}
        title={`Seq #${slot.seq} (${slot.state})${
          slot.timerRemaining !== undefined ? ` - Timer: ${slot.timerRemaining.toFixed(1)}s` : ''
        }`}
      >
        <span className="text-[10px] leading-tight">{slot.seq}</span>
        {label && <span className="text-[8px] font-mono leading-none tracking-tighter">{label}</span>}

        {/* Small timer badge if active */}
        {slot.timerRemaining !== undefined && (
          <span className="absolute -bottom-2 bg-red-600 text-[8px] text-white px-1 py-0 rounded font-mono shadow-xs">
            {slot.timerRemaining.toFixed(1)}
          </span>
        )}

        {/* Pointer indicator for nextSeqNum */}
        {isNextToSend && (
          <span className="absolute -top-3 text-[9px] text-blue-700 font-bold">▼</span>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-neutral-300 p-3 text-xs select-none">
      {/* Sender Window status */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 text-xs">SENDER WINDOW:</span>
            <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 text-[11px]">
              [{senderWinStart} .. {senderWinEnd}] (Size: {windowSize})
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            base: {senderBase} | next: {nextSeqNum}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-3 px-1 scrollbar-thin">
          {senderSlots.slice(0, maxVisibleSlots).map((slot) => {
            const inside = slot.seq >= senderWinStart && slot.seq <= senderWinEnd;
            const isNext = slot.seq === nextSeqNum;
            return renderSlot(slot, inside, isNext);
          })}
        </div>
      </div>

      {/* Receiver Window status */}
      <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-neutral-200 pt-2 md:pt-0 md:pl-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 text-xs">RECEIVER WINDOW:</span>
            <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 text-[11px]">
              {protocol === 'gbn'
                ? `[${recvWinStart}] (Size: 1)`
                : `[${recvWinStart} .. ${recvWinEnd}] (Size: ${windowSize})`}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            {protocol === 'gbn' ? `expected: ${receiverBase}` : `base: ${receiverBase}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-3 px-1 scrollbar-thin">
          {receiverSlots.slice(0, maxVisibleSlots).map((slot) => {
            const inside = slot.seq >= recvWinStart && slot.seq <= recvWinEnd;
            return renderSlot(slot, inside, false);
          })}
        </div>
      </div>
    </div>
  );
};
