import React from 'react';
import { ProtocolType, ScrollMode, SimulationConfig } from '../types/protocol';
import { Play, Pause, RotateCcw, Send, StepForward, AlertTriangle } from 'lucide-react';

interface ControlsProps {
  config: SimulationConfig;
  onConfigChange: (newConfig: Partial<SimulationConfig>) => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onStep: () => void;
  onManualSend: () => void;
  dropNextPacket: boolean;
  onToggleDropNextPacket: () => void;
  dropNextAck: boolean;
  onToggleDropNextAck: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  config,
  onConfigChange,
  isRunning,
  onTogglePlay,
  onReset,
  onStep,
  onManualSend,
  dropNextPacket,
  onToggleDropNextPacket,
  dropNextAck,
  onToggleDropNextAck,
}) => {
  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const protocol = e.target.value as ProtocolType;
    if (protocol !== config.protocol) {
      onConfigChange({ protocol });
    }
  };

  return (
    <div className="border border-neutral-300 bg-neutral-50/70 p-3.5 text-xs text-neutral-800 space-y-3">
      {/* Top row: Protocol selection and Primary Execution Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <label htmlFor="protocol-select" className="font-bold text-neutral-900 text-sm">
            Protocol:
          </label>
          <select
            id="protocol-select"
            value={config.protocol}
            onChange={handleProtocolChange}
            className="bg-white border border-neutral-400 font-semibold px-2.5 py-1 text-sm rounded shadow-xs focus:outline-neutral-800 cursor-pointer"
          >
            <option value="gbn">Go back N</option>
            <option value="sr">Selective Repeat</option>
          </select>
          <span className="text-[11px] text-neutral-500 italic">
            (Changing restarts simulation)
          </span>
        </div>

        {/* Playback & Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3 py-1 font-semibold rounded border text-xs cursor-pointer shadow-xs transition-colors ${
              isRunning
                ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
            }`}
            title={isRunning ? 'Pause simulation (Space)' : 'Start simulation (Space)'}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start
              </>
            )}
          </button>

          <button
            onClick={onStep}
            disabled={isRunning}
            className="inline-flex items-center gap-1 px-2.5 py-1 font-medium rounded border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 cursor-pointer shadow-xs"
            title="Step simulation forward by 0.25 seconds"
          >
            <StepForward className="w-3.5 h-3.5" /> Step
          </button>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 font-medium rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 cursor-pointer shadow-xs"
            title="Reset simulation to initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <div className="h-4 w-px bg-neutral-300 mx-1 hidden sm:block" />

          <button
            onClick={onManualSend}
            className="inline-flex items-center gap-1 px-3 py-1 font-semibold rounded border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
            title="Emit next packet from upper layer now"
          >
            <Send className="w-3.5 h-3.5" /> Send Packet
          </button>
        </div>
      </div>

      {/* Grid of parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {/* Window size */}
        <div className="bg-white p-2.5 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="window-size" className="font-semibold text-neutral-800">
              Window size:
            </label>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-xs border border-neutral-200">
              {config.windowSize}
            </span>
          </div>
          <input
            id="window-size"
            type="range"
            min="1"
            max="8"
            step="1"
            value={config.windowSize}
            onChange={(e) => onConfigChange({ windowSize: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Sets the sender and receiver window sizes.
          </p>
        </div>

        {/* End-to-end delay */}
        <div className="bg-white p-2.5 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="e2e-delay" className="font-semibold text-neutral-800">
              End-to-end delay:
            </label>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-xs border border-neutral-200">
              {config.delay.toFixed(1)}s
            </span>
          </div>
          <input
            id="e2e-delay"
            type="range"
            min="1.0"
            max="6.0"
            step="0.5"
            value={config.delay}
            onChange={(e) => onConfigChange({ delay: parseFloat(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
            The time a packet takes to travel between stations.
          </p>
        </div>

        {/* Timeout */}
        <div className="bg-white p-2.5 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="timeout-val" className="font-semibold text-neutral-800">
              Timeout:
            </label>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-xs border border-neutral-200">
              {config.timeout.toFixed(1)}s
            </span>
          </div>
          <input
            id="timeout-val"
            type="range"
            min="2.0"
            max="12.0"
            step="0.5"
            value={config.timeout}
            onChange={(e) => onConfigChange({ timeout: parseFloat(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Time sender waits for an ACK before retransmission.
          </p>
        </div>

        {/* Scroll mode */}
        <div className="bg-white p-2.5 border border-neutral-200 rounded">
          <label htmlFor="scroll-mode" className="font-semibold text-neutral-800 block mb-1">
            Scroll mode:
          </label>
          <select
            id="scroll-mode"
            value={config.scrollMode}
            onChange={(e) => onConfigChange({ scrollMode: e.target.value as ScrollMode })}
            className="w-full bg-white border border-neutral-300 px-2 py-1 rounded text-xs font-medium cursor-pointer"
          >
            <option value="typewriter">Typewriter style</option>
            <option value="fixed">Fixed Sender Window</option>
          </select>
          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Changes how the windows move.
          </p>
        </div>

        {/* Packet emission rate */}
        <div className="bg-white p-2.5 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="emission-rate" className="font-semibold text-neutral-800 leading-tight">
              Emission rate:
            </label>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-xs border border-neutral-200">
              {config.emissionRate}/min
            </span>
          </div>
          <input
            id="emission-rate"
            type="range"
            min="5"
            max="60"
            step="5"
            value={config.emissionRate}
            onChange={(e) => onConfigChange({ emissionRate: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
            Number of packets emitted per minute (upper layer rate).
          </p>
        </div>
      </div>

      {/* Bottom row: Automatic packet emission toggle & Loss simulation triggers */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200 text-xs">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.autoEmit}
              onChange={(e) => onConfigChange({ autoEmit: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
            />
            <span className="font-semibold text-neutral-900">Automatic packet emission</span>
            <span className="text-[11px] text-neutral-500">
              ({config.autoEmit ? 'Emitting automatically' : 'Stopped'})
            </span>
          </label>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-neutral-300">
            <span className="text-neutral-600">Sim speed:</span>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => onConfigChange({ simSpeed: spd })}
                className={`px-1.5 py-0.5 rounded text-[11px] border cursor-pointer font-mono ${
                  config.simSpeed === spd
                    ? 'bg-neutral-800 text-white border-neutral-800 font-bold'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Loss simulation controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Simulate loss (or click any flying packet/ACK):
          </span>

          <button
            onClick={onToggleDropNextPacket}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
              dropNextPacket
                ? 'bg-red-600 text-white border-red-700 font-semibold animate-pulse'
                : 'bg-white border-neutral-300 text-neutral-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
            }`}
            title="Mark the next emitted data packet as lost"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {dropNextPacket ? 'Drop Next PKT [ARMED]' : 'Drop Next Packet'}
          </button>

          <button
            onClick={onToggleDropNextAck}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
              dropNextAck
                ? 'bg-amber-600 text-white border-amber-700 font-semibold animate-pulse'
                : 'bg-white border-neutral-300 text-neutral-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
            }`}
            title="Mark the next generated ACK packet as lost"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {dropNextAck ? 'Drop Next ACK [ARMED]' : 'Drop Next ACK'}
          </button>
        </div>
      </div>
    </div>
  );
};
