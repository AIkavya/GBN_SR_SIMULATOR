import React from 'react';
import { ProtocolLogEvent } from '../types/protocol';

interface EventLogProps {
  events: ProtocolLogEvent[];
  onClear: () => void;
}

export const EventLog: React.FC<EventLogProps> = ({ events, onClear }) => {
  return (
    <div className="border border-neutral-300 bg-white p-3 text-xs">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200">
        <span className="font-bold text-neutral-800 text-[11px] uppercase tracking-wider">
          Protocol Event Log
        </span>
        <button
          onClick={onClear}
          className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
        >
          Clear Log
        </button>
      </div>

      <div className="h-28 overflow-y-auto space-y-1 font-mono text-[11px] scrollbar-thin">
        {events.length === 0 ? (
          <div className="text-neutral-400 italic">No events recorded yet. Start simulation or click Send Packet.</div>
        ) : (
          events.slice(-40).map((ev) => {
            let color = 'text-neutral-700';
            if (ev.type === 'timeout') color = 'text-red-600 font-bold';
            else if (ev.type === 'deliver' || ev.type === 'ack_recv') color = 'text-emerald-700 font-medium';
            else if (ev.type === 'drop') color = 'text-red-500 italic';
            else if (ev.type === 'ack_send') color = 'text-amber-700';
            else if (ev.type === 'send') color = 'text-blue-700';

            return (
              <div key={ev.id} className={`leading-snug ${color}`}>
                <span className="text-neutral-400 mr-2">[{ev.time.toFixed(2)}s]</span>
                {ev.message}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
