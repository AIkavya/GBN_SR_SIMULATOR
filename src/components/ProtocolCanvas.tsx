import React, { useRef, useEffect, useState } from 'react';
import { Packet, AckPacket, TimeoutEvent, ScrollMode, ProtocolType } from '../types/protocol';
import { ArrowDown, X, Eye } from 'lucide-react';

interface ProtocolCanvasProps {
  protocol: ProtocolType;
  simTime: number;
  pixelsPerSec: number;
  packets: Packet[];
  acks: AckPacket[];
  timeouts: TimeoutEvent[];
  scrollMode: ScrollMode;
  delay: number;
  timeout: number;
  windowSize: number;
  senderBase: number;
  receiverBase: number;
  onDropPacket: (id: string) => void;
  onDropAck: (id: string) => void;
}

export const ProtocolCanvas: React.FC<ProtocolCanvasProps> = ({
  protocol,
  simTime,
  pixelsPerSec,
  packets,
  acks,
  timeouts,
  scrollMode,
  delay,
  timeout,
  windowSize,
  senderBase,
  receiverBase,
  onDropPacket,
  onDropAck,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [userScrolled, setUserScrolled] = useState(false);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Geometry
  const leftX = 110; // Sender timeline X
  const rightX = Math.max(leftX + 280, containerWidth - 110); // Receiver timeline X
  const topPadding = 60; // Time t=0 starts here

  // Calculate current now Y
  const nowY = topPadding + simTime * pixelsPerSec;
  const totalHeight = Math.max(700, nowY + 300);

  // Auto-scrolling logic based on scrollMode
  useEffect(() => {
    if (userScrolled) return;
    const container = containerRef.current;
    if (!container) return;

    if (scrollMode === 'typewriter') {
      // Keep "now" line at ~65% of viewport height
      const targetScroll = nowY - container.clientHeight * 0.65;
      if (targetScroll > 0) {
        container.scrollTop = targetScroll;
      }
    } else {
      // Fixed Sender Window: keep "now" line pinned at fixed ~140px from top
      const targetScroll = nowY - 140;
      if (targetScroll > 0) {
        container.scrollTop = targetScroll;
      }
    }
  }, [nowY, scrollMode, userScrolled]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    // Check if user manually scrolled away from the auto-scroll target
    const targetScroll =
      scrollMode === 'typewriter'
        ? nowY - container.clientHeight * 0.65
        : nowY - 140;
    const diff = Math.abs(container.scrollTop - targetScroll);
    if (diff > 80) {
      setUserScrolled(true);
    }
  };

  const resumeAutoScroll = () => {
    setUserScrolled(false);
  };

  // Generate timeline markers (every 2 seconds)
  const maxTime = Math.ceil((totalHeight - topPadding) / pixelsPerSec);
  const timeMarkers: number[] = [];
  for (let t = 0; t <= maxTime; t += 2) {
    timeMarkers.push(t);
  }

  return (
    <div className="relative border border-neutral-300 bg-white shadow-2xs">
      {/* Top station headers (sticky) */}
      <div className="sticky top-0 z-20 flex justify-between items-center bg-neutral-100/95 backdrop-blur-xs border-b border-neutral-300 px-4 py-2 text-xs font-bold select-none">
        <div style={{ width: leftX + 40 }} className="flex items-center gap-2 text-neutral-800">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
          <span>SENDER (Station A)</span>
        </div>

        <div className="text-neutral-500 font-mono text-[11px] hidden sm:flex items-center gap-3">
          <span>Time: {simTime.toFixed(2)}s</span>
          <span>Delay: {delay.toFixed(1)}s</span>
          <span>Timeout: {timeout.toFixed(1)}s</span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-600">Mode: {scrollMode === 'typewriter' ? 'Typewriter' : 'Fixed Window'}</span>
        </div>

        <div style={{ width: containerWidth - rightX + 40 }} className="flex items-center justify-end gap-2 text-neutral-800">
          <span>RECEIVER (Station B)</span>
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
        </div>
      </div>

      {/* Floating Resume Auto-Scroll button if user scrolled away */}
      {userScrolled && (
        <button
          onClick={resumeAutoScroll}
          className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-medium shadow-lg hover:bg-neutral-800 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> Follow Simulation (Auto-Scroll)
        </button>
      )}

      {/* Canvas container with vertical scroll */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label="Network Protocol Simulation Timeline Diagram"
        className="h-[520px] overflow-y-auto overflow-x-hidden relative bg-white select-none focus:outline-hidden"
      >
        <svg
          width={containerWidth}
          height={totalHeight}
          className="block"
          style={{ minWidth: '100%' }}
        >
          <defs>
            {/* Arrow markers */}
            <marker
              id="arrow-data"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
            </marker>

            <marker
              id="arrow-ack"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
            </marker>

            <marker
              id="arrow-lost"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
            </marker>

            {/* Pattern for dropped packet lines */}
            <pattern id="diagonal-stripe" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#fca5a5" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Background grid lines for time */}
          {timeMarkers.map((t) => {
            const y = topPadding + t * pixelsPerSec;
            return (
              <g key={`time-${t}`}>
                <line
                  x1={leftX - 35}
                  y1={y}
                  x2={rightX + 35}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                {/* Time labels on left and right */}
                <text
                  x={leftX - 45}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {t}s
                </text>
                <text
                  x={rightX + 45}
                  y={y + 4}
                  textAnchor="start"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {t}s
                </text>
              </g>
            );
          })}

          {/* Station vertical timeline axes */}
          {/* Sender vertical line */}
          <line
            x1={leftX}
            y1={topPadding}
            x2={leftX}
            y2={totalHeight}
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Receiver vertical line */}
          <line
            x1={rightX}
            y1={topPadding}
            x2={rightX}
            y2={totalHeight}
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Active Timeout markers on Sender line */}
          {timeouts.map((to) => {
            const y = topPadding + to.time * pixelsPerSec;
            if (to.time > simTime) return null;
            return (
              <g key={to.id}>
                {/* Red tick / blast on sender line */}
                <line
                  x1={leftX - 16}
                  y1={y}
                  x2={leftX + 22}
                  y2={y}
                  stroke="#dc2626"
                  strokeWidth="2.5"
                />
                <circle cx={leftX} cy={y} r="4" fill="#dc2626" />
                <rect
                  x={leftX - 100}
                  y={y - 9}
                  width="85"
                  height="18"
                  rx="3"
                  fill="#fef2f2"
                  stroke="#ef4444"
                  strokeWidth="1"
                />
                <text
                  x={leftX - 58}
                  y={y + 3}
                  textAnchor="middle"
                  fill="#b91c1c"
                  fontSize="9"
                  fontWeight="bold"
                >
                  TIMEOUT #{to.seq}
                </text>
              </g>
            );
          })}

          {/* DATA PACKETS */}
          {packets.map((pkt) => {
            if (pkt.sendTime > simTime) return null;

            const startY = topPadding + pkt.sendTime * pixelsPerSec;
            const targetY = topPadding + pkt.arrivalTime * pixelsPerSec;

            // In-flight progress
            const totalDuration = pkt.arrivalTime - pkt.sendTime;
            const elapsed = simTime - pkt.sendTime;
            const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

            const dropRatio = pkt.dropProgress ?? 0.5;

            // Check if packet was dropped
            const isDroppedAtThisTime = pkt.lost && progress >= dropRatio;
            const effectiveProgress = isDroppedAtThisTime ? dropRatio : progress;

            // Current head position
            const curX = leftX + effectiveProgress * (rightX - leftX);
            const curY = startY + effectiveProgress * (targetY - startY);

            // Completed or dropped full line end
            const lineEndX = pkt.lost
              ? leftX + dropRatio * (rightX - leftX)
              : progress >= 1
              ? rightX
              : curX;
            const lineEndY = pkt.lost
              ? startY + dropRatio * (targetY - startY)
              : progress >= 1
              ? targetY
              : curY;

            return (
              <g
                key={pkt.id}
                className="cursor-pointer group"
                onClick={() => onDropPacket(pkt.id)}
              >
                {/* Trajectory line */}
                <line
                  x1={leftX}
                  y1={startY}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke={pkt.lost ? '#f87171' : '#3b82f6'}
                  strokeWidth={pkt.lost ? 2 : 2.5}
                  strokeDasharray={pkt.lost ? '4 3' : undefined}
                />

                {/* Sender departure node */}
                <circle
                  cx={leftX}
                  cy={startY}
                  r="4"
                  fill={pkt.isRetransmission ? '#f59e0b' : '#3b82f6'}
                  stroke="#1d4ed8"
                  strokeWidth="1"
                />

                {/* Packet label at departure */}
                <text
                  x={leftX - 8}
                  y={startY + 3}
                  textAnchor="end"
                  fill="#1e40af"
                  fontSize="10"
                  fontWeight="bold"
                >
                  PKT {pkt.seq}
                </text>

                {/* If packet reached receiver successfully */}
                {!pkt.lost && progress >= 1 && (
                  <g>
                    <circle
                      cx={rightX}
                      cy={targetY}
                      r="4.5"
                      fill="#15803d"
                      stroke="#14532d"
                      strokeWidth="1"
                    />
                    <text
                      x={rightX + 8}
                      y={targetY + 3.5}
                      textAnchor="start"
                      fill="#15803d"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      RECV {pkt.seq}
                    </text>
                  </g>
                )}

                {/* If packet was dropped */}
                {pkt.lost && progress >= dropRatio && (
                  <g transform={`translate(${lineEndX}, ${lineEndY})`}>
                    <circle cx="0" cy="0" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke="#dc2626" strokeWidth="2" />
                    <line x1="5" y1="-5" x2="-5" y2="5" stroke="#dc2626" strokeWidth="2" />
                    <rect x="-24" y="-22" width="48" height="13" rx="2" fill="#dc2626" />
                    <text
                      x="0"
                      y="-13"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      LOST #{pkt.seq}
                    </text>
                  </g>
                )}

                {/* Moving Packet Capsule (while still in flight and not yet dropped) */}
                {progress < 1 && (!pkt.lost || progress < dropRatio) && (
                  <g transform={`translate(${curX}, ${curY})`}>
                    {/* Pulsing halo */}
                    <circle cx="0" cy="0" r="14" fill="#3b82f6" opacity="0.15" />
                    {/* Packet badge */}
                    <rect
                      x="-22"
                      y="-10"
                      width="44"
                      height="20"
                      rx="3"
                      fill="#3b82f6"
                      stroke="#1d4ed8"
                      strokeWidth="1.5"
                      className="transition-transform group-hover:scale-110"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      PKT {pkt.seq}
                    </text>
                    {/* Hover drop tooltip hint */}
                    <title>Click to mark PKT {pkt.seq} as LOST</title>
                  </g>
                )}
              </g>
            );
          })}

          {/* ACK PACKETS */}
          {acks.map((ack) => {
            if (ack.sendTime > simTime) return null;

            const startY = topPadding + ack.sendTime * pixelsPerSec;
            const targetY = topPadding + ack.arrivalTime * pixelsPerSec;

            const totalDuration = ack.arrivalTime - ack.sendTime;
            const elapsed = simTime - ack.sendTime;
            const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

            const dropRatio = ack.dropProgress ?? 0.5;
            const isDroppedAtThisTime = ack.lost && progress >= dropRatio;
            const effectiveProgress = isDroppedAtThisTime ? dropRatio : progress;

            // Travel from rightX to leftX
            const curX = rightX - effectiveProgress * (rightX - leftX);
            const curY = startY + effectiveProgress * (targetY - startY);

            const lineEndX = ack.lost
              ? rightX - dropRatio * (rightX - leftX)
              : progress >= 1
              ? leftX
              : curX;
            const lineEndY = ack.lost
              ? startY + dropRatio * (targetY - startY)
              : progress >= 1
              ? targetY
              : curY;

            return (
              <g
                key={ack.id}
                className="cursor-pointer group"
                onClick={() => onDropAck(ack.id)}
              >
                {/* Trajectory line */}
                <line
                  x1={rightX}
                  y1={startY}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke={ack.lost ? '#f87171' : '#f59e0b'}
                  strokeWidth={ack.lost ? 2 : 2.5}
                  strokeDasharray={ack.lost ? '4 3' : undefined}
                />

                {/* Receiver departure node */}
                <circle
                  cx={rightX}
                  cy={startY}
                  r="4"
                  fill="#f59e0b"
                  stroke="#b45309"
                  strokeWidth="1"
                />

                {/* ACK label at departure */}
                <text
                  x={rightX + 8}
                  y={startY + 3}
                  textAnchor="start"
                  fill="#b45309"
                  fontSize="10"
                  fontWeight="bold"
                >
                  ACK {ack.ackNum}
                </text>

                {/* If ACK reached sender successfully */}
                {!ack.lost && progress >= 1 && (
                  <g>
                    <circle
                      cx={leftX}
                      cy={targetY}
                      r="4.5"
                      fill="#22c55e"
                      stroke="#15803d"
                      strokeWidth="1"
                    />
                    <text
                      x={leftX - 8}
                      y={targetY + 3.5}
                      textAnchor="end"
                      fill="#15803d"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      ACK {ack.ackNum} OK
                    </text>
                  </g>
                )}

                {/* If ACK was dropped */}
                {ack.lost && progress >= dropRatio && (
                  <g transform={`translate(${lineEndX}, ${lineEndY})`}>
                    <circle cx="0" cy="0" r="10" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke="#dc2626" strokeWidth="2" />
                    <line x1="5" y1="-5" x2="-5" y2="5" stroke="#dc2626" strokeWidth="2" />
                    <rect x="-24" y="-22" width="48" height="13" rx="2" fill="#dc2626" />
                    <text
                      x="0"
                      y="-13"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      LOST ACK {ack.ackNum}
                    </text>
                  </g>
                )}

                {/* Moving ACK Capsule */}
                {progress < 1 && (!ack.lost || progress < dropRatio) && (
                  <g transform={`translate(${curX}, ${curY})`}>
                    <circle cx="0" cy="0" r="14" fill="#f59e0b" opacity="0.15" />
                    <rect
                      x="-22"
                      y="-10"
                      width="44"
                      height="20"
                      rx="3"
                      fill="#f59e0b"
                      stroke="#d97706"
                      strokeWidth="1.5"
                      className="transition-transform group-hover:scale-110"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ACK {ack.ackNum}
                    </text>
                    <title>Click to mark ACK {ack.ackNum} as LOST</title>
                  </g>
                )}
              </g>
            );
          })}

          {/* CURRENT TIME "NOW" HORIZONTAL LINE */}
          <g>
            <line
              x1={leftX - 40}
              y1={nowY}
              x2={rightX + 40}
              y2={nowY}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {/* Left badge */}
            <rect
              x={leftX - 48}
              y={nowY - 8}
              width="44"
              height="16"
              rx="2"
              fill="#ef4444"
            />
            <text
              x={leftX - 26}
              y={nowY + 3.5}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
            >
              {simTime.toFixed(1)}s
            </text>

            {/* Right badge */}
            <rect
              x={rightX + 4}
              y={nowY - 8}
              width="44"
              height="16"
              rx="2"
              fill="#ef4444"
            />
            <text
              x={rightX + 26}
              y={nowY + 3.5}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
            >
              NOW
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom hint banner */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-50 border-t border-neutral-200 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-neutral-700">Tip:</span>
          <span>Click any flying packet or ACK to simulate transmission loss.</span>
        </span>
        <span className="hidden sm:inline text-neutral-400">
          Time advances downward • Vertical scale: {pixelsPerSec}px/sec
        </span>
      </div>
    </div>
  );
};
