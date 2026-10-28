# Go-Back-N and Selective Repeat ARQ Simulator

An interactive **Computer Networks** project for exploring reliable data transfer over an unreliable network. The simulator focuses on two classic sliding-window Automatic Repeat reQuest (ARQ) protocols: **Go-Back-N (GBN)** and **Selective Repeat (SR)**.

Use it to visualize how senders, receivers, sequence numbers, acknowledgements, timers, and retransmissions work together to deliver packets reliably—even when packets or ACKs are lost or delayed.

## Project overview

Reliable communication across a network requires more than sending data. A sender must detect missing or damaged packets, respond to acknowledgements, and retransmit data when delivery is uncertain. Sliding-window protocols improve throughput by allowing multiple frames to be in transit at once.

This project presents two approaches to that problem:

- **Go-Back-N (GBN):** the receiver accepts packets in order and acknowledges the highest contiguous sequence number received. If a packet times out, the sender retransmits that packet and the outstanding packets after it.
- **Selective Repeat (SR):** the receiver can buffer out-of-order packets and acknowledge them individually. The sender retransmits only packets whose acknowledgements have not arrived before their timers expire.

## Learning goals

- Understand **reliable data transfer**, **ARQ**, and the **sliding-window** mechanism.
- Compare cumulative acknowledgements in GBN with individual acknowledgements in SR.
- See how packet loss, ACK loss, and timeout events affect sender and receiver state.
- Explore sequence numbers, sender and receiver windows, buffering, and retransmission behavior.
- Connect protocol choices to throughput, bandwidth utilization, and network efficiency.

## Protocol comparison

| Behavior | Go-Back-N | Selective Repeat |
| --- | --- | --- |
| Receiver accepts out-of-order packets | No | Yes, buffers them |
| ACK style | Cumulative | Individual/selective |
| Timeout recovery | Retransmit the missing packet and later outstanding packets | Retransmit only the unacknowledged packet |
| Receiver complexity | Lower | Higher |
| Retransmission efficiency when losses occur | Can resend packets already received | Avoids unnecessary retransmissions |

## Simulator concepts

The simulation illustrates the interaction between:

- **Sender window** — packets that may be sent without waiting for further ACKs.
- **Receiver window** — sequence numbers the receiver is currently prepared to accept.
- **Sequence numbers** — identifiers used to order packets and detect duplicates.
- **ACKs** — control messages confirming packet receipt.
- **Timers and timeouts** — mechanisms for recovering when an ACK does not arrive in time.
- **Packet and ACK loss** — network events that trigger protocol recovery.
- **Retransmissions** — resending data to restore reliable, in-order delivery.

## Technology

The project uses **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. The package scripts define the usual development, production build, preview, and TypeScript checking commands.

## Getting started

### Requirements

- Node.js and npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Vite starts the app on port `3000` as configured in `package.json`.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Check TypeScript

```bash
npm run lint
```

## Suggested demonstrations

1. Run GBN with no packet loss and observe cumulative ACK progress.
2. Introduce a lost packet and follow the sender timeout and go-back retransmission.
3. Run SR with a lost packet and observe the receiver buffering later packets.
4. Compare how many packets each protocol retransmits after the same loss event.
5. Change the window size and consider how it affects the number of packets in flight.

## Computer Networks keywords

`Computer Networks` · `Data Link Layer` · `Transport Protocols` · `Reliable Data Transfer` · `ARQ` · `Go-Back-N` · `GBN` · `Selective Repeat` · `SR` · `Sliding Window` · `Flow Control` · `Error Control` · `Sequence Numbers` · `Acknowledgements` · `Cumulative ACK` · `Packet Loss` · `Timeout` · `Retransmission` · `Buffering` · `Throughput` · `Bandwidth Utilization` · `Network Simulation`

## Academic context

This simulator is suitable as a **Computer Networks lab project**, networking assignment, or visual aid for studying reliable link-layer protocols. It demonstrates protocol behavior and is intended for learning; simulation results depend on the events and parameters configured in the application.