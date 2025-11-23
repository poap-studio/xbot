/**
 * API Route: QR Update Stream (Server-Sent Events)
 * Notifies clients when QR code should be updated
 */

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/stream
 * Server-Sent Events endpoint for QR updates
 */
export async function GET(request: NextRequest) {
  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Set up listener for QR updates
      const listener = () => {
        const updateData = `data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(updateData));
      };

      // Initialize global listeners array if not exists
      if (!global.qrUpdateListeners) {
        global.qrUpdateListeners = [];
      }

      // Add this listener
      global.qrUpdateListeners.push(listener);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
          controller.enqueue(encoder.encode(heartbeatData));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);

        // Remove this listener from global array
        if (global.qrUpdateListeners) {
          const index = global.qrUpdateListeners.indexOf(listener);
          if (index > -1) {
            global.qrUpdateListeners.splice(index, 1);
          }
        }

        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Extend global type for TypeScript
declare global {
  var qrUpdateListeners: Function[] | undefined;
}
