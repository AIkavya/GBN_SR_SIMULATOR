/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ProtocolType,
  ScrollMode,
  SimulationConfig,
  Packet,
  AckPacket,
  TimeoutEvent,
  ProtocolLogEvent,
} from './types/protocol';
import { Controls } from './components/Controls';
import { WindowOverview } from './components/WindowOverview';
import { ProtocolCanvas } from './components/ProtocolCanvas';
import { Legend } from './components/Legend';
import { EventLog } from './components/EventLog';

interface SlotData {
  seq: number;
  state: 'no_data' | 'buffered' | 'confirmed' | 'delivered';
  timerStartTime?: number | null;
}

const DEFAULT_CONFIG: SimulationConfig = {
  protocol: 'gbn',
  windowSize: 4,
  delay: 2.5,
  timeout: 6.0,
  scrollMode: 'typewriter',
  emissionRate: 20,
  autoEmit: true,
  simSpeed: 1.0,
};

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  // Sender state
  const [senderBase, setSenderBase] = useState<number>(0);
  const [nextSeqNum, setNextSeqNum] = useState<number>(0);
  const [senderSlots, setSenderSlots] = useState<Map<number, SlotData>>(new Map());

  // GBN single timer start time
  const [gbnTimerStart, setGbnTimerStart] = useState<number | null>(null);

  // Receiver state
  // For GBN: expectedSeqNum; for SR: recvBase
  const [receiverBase, setReceiverBase] = useState<number>(0);
  const [receiverSlots, setReceiverSlots] = useState<Map<number, SlotData>>(new Map());

  // In-flight items
  const [packets, setPackets] = useState<Packet[]>([]);
  const [acks, setAcks] = useState<AckPacket[]>([]);
  const [timeouts, setTimeouts] = useState<TimeoutEvent[]>([]);
  const [logs, setLogs] = useState<ProtocolLogEvent[]>([]);

  // Loss simulation arms
  const [dropNextPacket, setDropNextPacket] = useState<boolean>(false);
  const [dropNextAck, setDropNextAck] = useState<boolean>(false);

  // Internal mutable simulation clock & refs for continuous animation loop
  const stateRef = useRef({
    simTime: 0,
    isRunning: true,
    config: DEFAULT_CONFIG,
    senderBase: 0,
    nextSeqNum: 0,
    senderSlots: new Map<number, SlotData>(),
    gbnTimerStart: null as number | null,
    receiverBase: 0,
    receiverSlots: new Map<number, SlotData>(),
    packets: [] as Packet[],
    acks: [] as AckPacket[],
    timeouts: [] as TimeoutEvent[],
    logs: [] as ProtocolLogEvent[],
    lastEmissionTime: -999,
    dropNextPacket: false,
    dropNextAck: false,
    processedArrivals: new Set<string>(),
  });

  // Keep stateRef synced with state
  useEffect(() => {
    stateRef.current.config = config;
  }, [config]);

  useEffect(() => {
    stateRef.current.dropNextPacket = dropNextPacket;
  }, [dropNextPacket]);

  useEffect(() => {
    stateRef.current.dropNextAck = dropNextAck;
  }, [dropNextAck]);

  const addLog = useCallback(
    (type: ProtocolLogEvent['type'], message: string, time: number) => {
      const event: ProtocolLogEvent = {
        id: `${time}-${Math.random()}`,
        time,
        type,
        message,
      };
      stateRef.current.logs.push(event);
      setLogs([...stateRef.current.logs]);
    },
    []
  );

  // Reset simulation completely
  const handleReset = useCallback(() => {
    const freshSenderSlots = new Map<number, SlotData>();
    const freshReceiverSlots = new Map<number, SlotData>();

    for (let i = 0; i < 20; i++) {
      freshSenderSlots.set(i, { seq: i, state: 'no_data' });
      freshReceiverSlots.set(i, { seq: i, state: 'no_data' });
    }

    stateRef.current = {
      simTime: 0,
      isRunning: false,
      config,
      senderBase: 0,
      nextSeqNum: 0,
      senderSlots: freshSenderSlots,
      gbnTimerStart: null,
      receiverBase: 0,
      receiverSlots: freshReceiverSlots,
      packets: [],
      acks: [],
      timeouts: [],
      logs: [],
      lastEmissionTime: -999,
      dropNextPacket: false,
      dropNextAck: false,
      processedArrivals: new Set(),
    };

    setSimTime(0);
    setIsRunning(false);
    setSenderBase(0);
    setNextSeqNum(0);
    setSenderSlots(new Map(freshSenderSlots));
    setGbnTimerStart(null);
    setReceiverBase(0);
    setReceiverSlots(new Map(freshReceiverSlots));
    setPackets([]);
    setAcks([]);
    setTimeouts([]);
    setLogs([]);
    setDropNextPacket(false);
    setDropNextAck(false);
  }, [config]);

  // Initial setup on mount
  useEffect(() => {
    handleReset();
    setIsRunning(true);
    stateRef.current.isRunning = true;
  }, [handleReset]);

  // Handle configuration changes
  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    if (newConfig.protocol && newConfig.protocol !== config.protocol) {
      // Protocol changed -> restart simulation as specified in requirements
      setConfig((prev) => ({ ...prev, ...newConfig }));
      setTimeout(() => {
        handleReset();
        setIsRunning(true);
        stateRef.current.isRunning = true;
      }, 0);
      return;
    }

    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      stateRef.current.config = updated;
      return updated;
    });
  };

  // Emit a packet from the sender
  const emitPacket = useCallback(
    (isRetransmission = false, specificSeq?: number) => {
      const ref = stateRef.current;
      const cfg = ref.config;
      const t = ref.simTime;

      let seqToTransmit: number;

      if (isRetransmission && specificSeq !== undefined) {
        seqToTransmit = specificSeq;
      } else {
        // Upper layer packet emission
        if (ref.nextSeqNum >= ref.senderBase + cfg.windowSize) {
          // Window is full!
          return false;
        }
        seqToTransmit = ref.nextSeqNum;
        ref.nextSeqNum++;
        setNextSeqNum(ref.nextSeqNum);
      }

      // Check loss trigger
      let isLost = false;
      if (!isRetransmission && ref.dropNextPacket) {
        isLost = true;
        ref.dropNextPacket = false;
        setDropNextPacket(false);
      }

      const packetId = `pkt-${seqToTransmit}-${t}-${Math.random().toString(36).slice(2, 6)}`;
      const newPacket: Packet = {
        id: packetId,
        seq: seqToTransmit,
        type: 'DATA',
        sendTime: t,
        arrivalTime: t + cfg.delay,
        isRetransmission,
        lost: isLost,
        dropProgress: 0.5,
      };

      ref.packets.push(newPacket);
      setPackets([...ref.packets]);

      // Update sender slot state
      const existingSlot = ref.senderSlots.get(seqToTransmit) || {
        seq: seqToTransmit,
        state: 'no_data',
      };
      if (existingSlot.state !== 'confirmed') {
        existingSlot.state = 'buffered';
      }

      // Timer handling
      if (cfg.protocol === 'gbn') {
        if (ref.gbnTimerStart === null) {
          ref.gbnTimerStart = t;
          setGbnTimerStart(t);
        }
      } else {
        // SR: start/reset timer for this specific packet
        existingSlot.timerStartTime = t;
      }

      ref.senderSlots.set(seqToTransmit, existingSlot);
      setSenderSlots(new Map(ref.senderSlots));

      addLog(
        isRetransmission ? 'timeout' : 'send',
        isRetransmission
          ? `[Sender] Retransmitted PKT ${seqToTransmit}${isLost ? ' (loss programmed)' : ''}`
          : `[Sender] Emitted PKT ${seqToTransmit}${isLost ? ' (loss programmed)' : ''}`,
        t
      );

      return true;
    },
    [addLog]
  );

  // Manual packet emission
  const handleManualSend = () => {
    const success = emitPacket(false);
    if (!success) {
      addLog(
        'drop',
        `[Sender] Window full! Cannot emit (Window: [${stateRef.current.senderBase}..${
          stateRef.current.senderBase + config.windowSize - 1
        }])`,
        stateRef.current.simTime
      );
    }
  };

  // Toggle drop status for a specific packet in transit
  const handleDropPacket = (packetId: string) => {
    const pkt = stateRef.current.packets.find((p) => p.id === packetId);
    if (pkt && pkt.sendTime <= stateRef.current.simTime && pkt.arrivalTime > stateRef.current.simTime) {
      pkt.lost = !pkt.lost;
      pkt.dropProgress = 0.5;
      setPackets([...stateRef.current.packets]);
      addLog(
        'drop',
        pkt.lost
          ? `[Channel] PKT ${pkt.seq} was marked as LOST by user click!`
          : `[Channel] PKT ${pkt.seq} loss cancelled by user click.`,
        stateRef.current.simTime
      );
    }
  };

  // Toggle drop status for a specific ACK in transit
  const handleDropAck = (ackId: string) => {
    const ack = stateRef.current.acks.find((a) => a.id === ackId);
    if (ack && ack.sendTime <= stateRef.current.simTime && ack.arrivalTime > stateRef.current.simTime) {
      ack.lost = !ack.lost;
      ack.dropProgress = 0.5;
      setAcks([...stateRef.current.acks]);
      addLog(
        'drop',
        ack.lost
          ? `[Channel] ACK ${ack.ackNum} was marked as LOST by user click!`
          : `[Channel] ACK ${ack.ackNum} loss cancelled by user click.`,
        stateRef.current.simTime
      );
    }
  };

  // Core simulation step logic
  const stepSimulation = useCallback(
    (dt: number) => {
      const ref = stateRef.current;
      const cfg = ref.config;
      const prevTime = ref.simTime;
      const newTime = prevTime + dt;
      ref.simTime = newTime;

      // 1. Automatic Packet Emission check
      if (cfg.autoEmit) {
        const interval = 60 / cfg.emissionRate;
        if (newTime - ref.lastEmissionTime >= interval) {
          if (ref.nextSeqNum < ref.senderBase + cfg.windowSize) {
            emitPacket(false);
            ref.lastEmissionTime = newTime;
          }
        }
      }

      // 2. Data Packet Arrivals at Receiver
      for (const pkt of ref.packets) {
        if (!ref.processedArrivals.has(pkt.id) && pkt.arrivalTime <= newTime) {
          ref.processedArrivals.add(pkt.id);

          if (pkt.lost) {
            // Packet dropped in transit, does not reach receiver
            continue;
          }

          const arrivalTime = pkt.arrivalTime;

          if (cfg.protocol === 'gbn') {
            // Go-Back-N protocol logic
            if (pkt.seq === ref.receiverBase) {
              // In order packet received
              const recvSlot = ref.receiverSlots.get(pkt.seq) || { seq: pkt.seq, state: 'no_data' };
              recvSlot.state = 'delivered';
              ref.receiverSlots.set(pkt.seq, recvSlot);

              ref.receiverBase++;
              setReceiverBase(ref.receiverBase);
              setReceiverSlots(new Map(ref.receiverSlots));

              addLog(
                'deliver',
                `[Receiver] Received in-order PKT ${pkt.seq} -> Delivered to upper network layer`,
                arrivalTime
              );

              // Send cumulative ACK
              let isAckLost = false;
              if (ref.dropNextAck) {
                isAckLost = true;
                ref.dropNextAck = false;
                setDropNextAck(false);
              }

              const ackPacket: AckPacket = {
                id: `ack-${pkt.seq}-${arrivalTime}-${Math.random().toString(36).slice(2, 6)}`,
                ackNum: pkt.seq,
                type: 'ACK',
                sendTime: arrivalTime,
                arrivalTime: arrivalTime + cfg.delay,
                lost: isAckLost,
                dropProgress: 0.5,
              };

              ref.acks.push(ackPacket);
              setAcks([...ref.acks]);
              addLog(
                'ack_send',
                `[Receiver] Sent ACK ${pkt.seq}${isAckLost ? ' (loss programmed)' : ''}`,
                arrivalTime
              );
            } else {
              // Out of order packet in GBN -> discard and re-ACK highest consecutive in-order
              addLog(
                'drop',
                `[Receiver] Received out-of-order PKT ${pkt.seq} (Expected ${ref.receiverBase}) -> DISCARDED!`,
                arrivalTime
              );

              if (ref.receiverBase > 0) {
                const lastInOrderAck = ref.receiverBase - 1;
                let isAckLost = false;
                if (ref.dropNextAck) {
                  isAckLost = true;
                  ref.dropNextAck = false;
                  setDropNextAck(false);
                }

                const ackPacket: AckPacket = {
                  id: `ack-${lastInOrderAck}-${arrivalTime}-${Math.random().toString(36).slice(2, 6)}`,
                  ackNum: lastInOrderAck,
                  type: 'ACK',
                  sendTime: arrivalTime,
                  arrivalTime: arrivalTime + cfg.delay,
                  lost: isAckLost,
                  dropProgress: 0.5,
                };

                ref.acks.push(ackPacket);
                setAcks([...ref.acks]);
                addLog(
                  'ack_send',
                  `[Receiver] Re-sent duplicate ACK ${lastInOrderAck}`,
                  arrivalTime
                );
              }
            }
          } else {
            // Selective Repeat protocol logic
            const inWindow =
              pkt.seq >= ref.receiverBase && pkt.seq < ref.receiverBase + cfg.windowSize;
            const isDuplicate =
              pkt.seq >= ref.receiverBase - cfg.windowSize && pkt.seq < ref.receiverBase;

            if (inWindow) {
              // Send individual ACK for this packet
              let isAckLost = false;
              if (ref.dropNextAck) {
                isAckLost = true;
                ref.dropNextAck = false;
                setDropNextAck(false);
              }

              const ackPacket: AckPacket = {
                id: `ack-${pkt.seq}-${arrivalTime}-${Math.random().toString(36).slice(2, 6)}`,
                ackNum: pkt.seq,
                type: 'ACK',
                sendTime: arrivalTime,
                arrivalTime: arrivalTime + cfg.delay,
                lost: isAckLost,
                dropProgress: 0.5,
              };

              ref.acks.push(ackPacket);
              setAcks([...ref.acks]);
              addLog('ack_send', `[Receiver] Sent ACK ${pkt.seq}`, arrivalTime);

              const slot = ref.receiverSlots.get(pkt.seq) || { seq: pkt.seq, state: 'no_data' };

              if (pkt.seq === ref.receiverBase) {
                // In-order base packet arrives: mark delivered & slide window
                slot.state = 'delivered';
                ref.receiverSlots.set(pkt.seq, slot);

                addLog(
                  'deliver',
                  `[Receiver] Received base PKT ${pkt.seq} -> Delivered to upper layer`,
                  arrivalTime
                );

                // Slide receiverBase over any already buffered contiguous packets
                let newBase = ref.receiverBase + 1;
                while (ref.receiverSlots.get(newBase)?.state === 'buffered') {
                  const bufferedSlot = ref.receiverSlots.get(newBase)!;
                  bufferedSlot.state = 'delivered';
                  ref.receiverSlots.set(newBase, bufferedSlot);
                  addLog(
                    'deliver',
                    `[Receiver] Contiguous buffered PKT ${newBase} delivered to upper layer`,
                    arrivalTime
                  );
                  newBase++;
                }

                ref.receiverBase = newBase;
                setReceiverBase(newBase);
                setReceiverSlots(new Map(ref.receiverSlots));
              } else {
                // Out of order within receiver window -> BUFFER it
                if (slot.state !== 'delivered') {
                  slot.state = 'buffered';
                  ref.receiverSlots.set(pkt.seq, slot);
                  setReceiverSlots(new Map(ref.receiverSlots));
                  addLog('buffer', `[Receiver] Buffered out-of-order PKT ${pkt.seq}`, arrivalTime);
                }
              }
            } else if (isDuplicate) {
              // Re-ACK previously acknowledged packet
              let isAckLost = false;
              if (ref.dropNextAck) {
                isAckLost = true;
                ref.dropNextAck = false;
                setDropNextAck(false);
              }

              const ackPacket: AckPacket = {
                id: `ack-${pkt.seq}-${arrivalTime}-${Math.random().toString(36).slice(2, 6)}`,
                ackNum: pkt.seq,
                type: 'ACK',
                sendTime: arrivalTime,
                arrivalTime: arrivalTime + cfg.delay,
                lost: isAckLost,
                dropProgress: 0.5,
              };

              ref.acks.push(ackPacket);
              setAcks([...ref.acks]);
              addLog(
                'ack_send',
                `[Receiver] Re-sent ACK ${pkt.seq} for duplicate packet`,
                arrivalTime
              );
            }
          }
        }
      }

      // 3. ACK Arrivals at Sender
      for (const ack of ref.acks) {
        if (!ref.processedArrivals.has(ack.id) && ack.arrivalTime <= newTime) {
          ref.processedArrivals.add(ack.id);

          if (ack.lost) {
            // ACK dropped in transit
            continue;
          }

          const arrivalTime = ack.arrivalTime;

          if (cfg.protocol === 'gbn') {
            // GBN: Cumulative ACK
            if (ack.ackNum >= ref.senderBase) {
              // Confirm all packets up to ackNum
              for (let s = ref.senderBase; s <= ack.ackNum; s++) {
                const sSlot = ref.senderSlots.get(s) || { seq: s, state: 'no_data' };
                sSlot.state = 'confirmed';
                ref.senderSlots.set(s, sSlot);
              }

              const newBase = ack.ackNum + 1;
              ref.senderBase = newBase;
              setSenderBase(newBase);
              setSenderSlots(new Map(ref.senderSlots));

              addLog(
                'ack_recv',
                `[Sender] ACK ${ack.ackNum} confirmed packets up to ${ack.ackNum}. Window slides to [${newBase} .. ${
                  newBase + cfg.windowSize - 1
                }]`,
                arrivalTime
              );

              // Timer reset/stop
              if (newBase === ref.nextSeqNum) {
                ref.gbnTimerStart = null;
                setGbnTimerStart(null);
              } else {
                ref.gbnTimerStart = arrivalTime;
                setGbnTimerStart(arrivalTime);
              }
            }
          } else {
            // SR: Individual ACK
            if (ack.ackNum >= ref.senderBase && ack.ackNum < ref.nextSeqNum) {
              const sSlot = ref.senderSlots.get(ack.ackNum) || {
                seq: ack.ackNum,
                state: 'no_data',
              };
              sSlot.state = 'confirmed';
              sSlot.timerStartTime = null; // stop timer for this packet
              ref.senderSlots.set(ack.ackNum, sSlot);

              addLog(
                'ack_recv',
                `[Sender] ACK ${ack.ackNum} received. PKT ${ack.ackNum} transmission confirmed.`,
                arrivalTime
              );

              // If ACK is for senderBase, slide senderBase forward to lowest unconfirmed
              if (ack.ackNum === ref.senderBase) {
                let newBase = ref.senderBase + 1;
                while (
                  newBase < ref.nextSeqNum &&
                  ref.senderSlots.get(newBase)?.state === 'confirmed'
                ) {
                  newBase++;
                }
                ref.senderBase = newBase;
                setSenderBase(newBase);
              }

              setSenderSlots(new Map(ref.senderSlots));
            }
          }
        }
      }

      // 4. Timeouts & Retransmissions
      if (cfg.protocol === 'gbn') {
        if (ref.gbnTimerStart !== null && ref.senderBase < ref.nextSeqNum) {
          if (newTime - ref.gbnTimerStart >= cfg.timeout) {
            // GBN TIMEOUT: Retransmit ALL packets from senderBase to nextSeqNum - 1
            const retransmittedSeqs: number[] = [];
            for (let s = ref.senderBase; s < ref.nextSeqNum; s++) {
              retransmittedSeqs.push(s);
            }

            const timeoutEvent: TimeoutEvent = {
              id: `to-${newTime}-${Math.random()}`,
              time: newTime,
              seq: ref.senderBase,
              retransmittedSeqs,
            };

            ref.timeouts.push(timeoutEvent);
            setTimeouts([...ref.timeouts]);

            addLog(
              'timeout',
              `[Sender] GBN TIMEOUT on PKT ${ref.senderBase}! Retransmitting window packets [${retransmittedSeqs.join(
                ', '
              )}]`,
              newTime
            );

            // Retransmit all unacknowledged packets
            for (const seq of retransmittedSeqs) {
              emitPacket(true, seq);
            }

            // Restart timer
            ref.gbnTimerStart = newTime;
            setGbnTimerStart(newTime);
          }
        }
      } else {
        // SR: Check individual timer for each unacknowledged packet in sender window
        for (let s = ref.senderBase; s < ref.nextSeqNum; s++) {
          const slot = ref.senderSlots.get(s);
          if (slot && slot.state !== 'confirmed' && slot.timerStartTime) {
            if (newTime - slot.timerStartTime >= cfg.timeout) {
              // SR TIMEOUT: Retransmit ONLY this specific packet
              const timeoutEvent: TimeoutEvent = {
                id: `to-${s}-${newTime}-${Math.random()}`,
                time: newTime,
                seq: s,
                retransmittedSeqs: [s],
              };

              ref.timeouts.push(timeoutEvent);
              setTimeouts([...ref.timeouts]);

              addLog('timeout', `[Sender] SR TIMEOUT on PKT ${s}! Retransmitting ONLY PKT ${s}`, newTime);

              // Retransmit only this packet
              emitPacket(true, s);

              // Restart timer for this specific packet
              slot.timerStartTime = newTime;
              ref.senderSlots.set(s, slot);
              setSenderSlots(new Map(ref.senderSlots));
            }
          }
        }
      }

      setSimTime(newTime);
    },
    [emitPacket, addLog]
  );

  // Main animation loop
  useEffect(() => {
    let animId: number;
    let lastRealTime = performance.now();

    const loop = (currentRealTime: number) => {
      const realDt = (currentRealTime - lastRealTime) / 1000;
      lastRealTime = currentRealTime;

      if (stateRef.current.isRunning) {
        // Cap dt to prevent huge leaps on tab pause
        const effectiveDt = Math.min(0.08, realDt) * stateRef.current.config.simSpeed;

        // Sub-step for numerical precision if dt is large
        const subSteps = effectiveDt > 0.03 ? 2 : 1;
        const subDt = effectiveDt / subSteps;
        for (let i = 0; i < subSteps; i++) {
          stepSimulation(subDt);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [stepSimulation]);

  // Step manually by 0.25 seconds
  const handleStep = () => {
    if (!isRunning) {
      stepSimulation(0.25);
    }
  };

  const handleTogglePlay = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    stateRef.current.isRunning = nextRunning;
  };

  // Keyboard accessibility: Space to pause/play, S to step, P to send, R to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or select
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleStep();
      } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleReset();
      } else if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleManualSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, handleTogglePlay, handleStep, handleReset, handleManualSend]);

  // Prepare slot status lists for WindowOverview
  const maxSlotCount = Math.max(16, nextSeqNum + 6);
  const senderSlotsList = Array.from({ length: maxSlotCount }, (_, i) => {
    const data = senderSlots.get(i);
    let timerRemaining: number | undefined;

    if (config.protocol === 'gbn') {
      if (gbnTimerStart !== null && i === senderBase && senderBase < nextSeqNum) {
        timerRemaining = Math.max(0, config.timeout - (simTime - gbnTimerStart));
      }
    } else {
      if (data?.timerStartTime && data.state !== 'confirmed') {
        timerRemaining = Math.max(0, config.timeout - (simTime - data.timerStartTime));
      }
    }

    return {
      seq: i,
      state: data?.state || 'no_data',
      timerRemaining,
    };
  });

  const receiverSlotsList = Array.from({ length: maxSlotCount }, (_, i) => {
    const data = receiverSlots.get(i);
    return {
      seq: i,
      state: data?.state || 'no_data',
    };
  });

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-blue-100 flex flex-col">
      {/* Top Academic Header */}
      <header className="border-b border-neutral-300 bg-white py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Selective Repeat / Go Back N
          </h1>
          <p className="text-xs text-neutral-500 font-mono">
            Interactive Network Protocol Simulation
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Controls Panel */}
        <section aria-label="Simulation Controls">
          <Controls
            config={config}
            onConfigChange={handleConfigChange}
            isRunning={isRunning}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onStep={handleStep}
            onManualSend={handleManualSend}
            dropNextPacket={dropNextPacket}
            onToggleDropNextPacket={() => setDropNextPacket((prev) => !prev)}
            dropNextAck={dropNextAck}
            onToggleDropNextAck={() => setDropNextAck((prev) => !prev)}
          />
        </section>

        {/* Window & Buffer Status Overview */}
        <section aria-label="Sliding Window Overview">
          <WindowOverview
            protocol={config.protocol}
            windowSize={config.windowSize}
            senderBase={senderBase}
            nextSeqNum={nextSeqNum}
            receiverBase={receiverBase}
            senderSlots={senderSlotsList}
            receiverSlots={receiverSlotsList}
            maxVisibleSlots={Math.max(14, config.windowSize + 6)}
          />
        </section>

        {/* Space-Time Ladder Diagram */}
        <section aria-label="Protocol Space-Time Diagram">
          <ProtocolCanvas
            protocol={config.protocol}
            simTime={simTime}
            pixelsPerSec={38}
            packets={packets}
            acks={acks}
            timeouts={timeouts}
            scrollMode={config.scrollMode}
            delay={config.delay}
            timeout={config.timeout}
            windowSize={config.windowSize}
            senderBase={senderBase}
            receiverBase={receiverBase}
            onDropPacket={handleDropPacket}
            onDropAck={handleDropAck}
          />
        </section>

        {/* Legend */}
        <section aria-label="State Legend">
          <Legend />
        </section>

        {/* Protocol Event Log */}
        <section aria-label="Protocol Activity Log">
          <EventLog events={logs} onClear={() => setLogs([])} />
        </section>
      </main>

      {/* Credit Line Footer */}
      <footer className="border-t border-neutral-300 bg-neutral-50 py-3 px-4 text-center text-xs text-neutral-600">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            coded by kavya @2026
          </span>
          <span className="text-[11px] text-neutral-400">
            Keyboard shortcuts: Space (Play/Pause) • P (Send Packet) • S (Step) • R (Reset)
          </span>
        </div>
      </footer>
    </div>
  );
}
