export type ProtocolType = 'gbn' | 'sr';

export type ScrollMode = 'typewriter' | 'fixed';

export type PacketState =
  | 'no_data'            // no data received yet / empty slot
  | 'buffered'           // data buffered (waiting for ack or buffered out-of-order)
  | 'ack'                // ACK in flight or received
  | 'confirmed'          // transmission confirmed (ACK received by sender)
  | 'delivered';         // data delivered to the upper network layer

export interface Packet {
  id: string;
  seq: number;
  type: 'DATA';
  sendTime: number;       // simulation time in seconds when sent
  arrivalTime: number;    // simulation time when it will arrive at receiver
  isRetransmission: boolean;
  lost: boolean;          // if true, packet is dropped in transit
  dropProgress?: number;  // 0 to 1 where it was dropped (default ~0.5)
}

export interface AckPacket {
  id: string;
  ackNum: number;
  type: 'ACK';
  sendTime: number;       // simulation time in seconds when sent from receiver
  arrivalTime: number;    // simulation time when it arrives at sender
  lost: boolean;
  dropProgress?: number;
}

export interface TimeoutEvent {
  id: string;
  time: number;
  seq: number;
  retransmittedSeqs: number[];
}

export interface SimulationConfig {
  protocol: ProtocolType;
  windowSize: number;       // sender & receiver window size
  delay: number;            // one-way end-to-end delay in seconds (e.g. 2.0s)
  timeout: number;          // timeout duration in seconds (e.g. 5.0s)
  scrollMode: ScrollMode;
  emissionRate: number;     // packets emitted per minute
  autoEmit: boolean;
  simSpeed: number;         // speed multiplier (0.5x, 1x, 2x)
}

export interface ProtocolLogEvent {
  id: string;
  time: number;
  type: 'send' | 'recv' | 'ack_send' | 'ack_recv' | 'timeout' | 'drop' | 'buffer' | 'deliver';
  message: string;
}
