import type { ServerWebSocket } from "bun";

export interface SocketData {
  connectedAt: number;
}

export type HubSocket = ServerWebSocket<SocketData>;

export interface RegistrationResult {
  ok: boolean;
  reason?: "already_registered" | "empty_session_id";
  sessionId?: string;
}

export interface PublishResult {
  hasSubscribers: boolean;
  deliveredCount: number;
}

export class SessionHub {
  private readonly sessions = new Map<string, Set<HubSocket>>();
  private readonly unregisteredSockets = new Set<HubSocket>();
  private readonly registeredSessionBySocket = new WeakMap<HubSocket, string>();

  onOpen(socket: HubSocket): void {
    this.unregisteredSockets.add(socket);
  }

  register(socket: HubSocket, sessionId: string): RegistrationResult {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      return {
        ok: false,
        reason: "empty_session_id",
      };
    }

    const existingSessionId = this.registeredSessionBySocket.get(socket);
    if (existingSessionId) {
      return {
        ok: false,
        reason: "already_registered",
        sessionId: existingSessionId,
      };
    }

    let sessionMembers = this.sessions.get(normalizedSessionId);
    if (!sessionMembers) {
      sessionMembers = new Set<HubSocket>();
      this.sessions.set(normalizedSessionId, sessionMembers);
    }

    sessionMembers.add(socket);
    this.unregisteredSockets.delete(socket);
    this.registeredSessionBySocket.set(socket, normalizedSessionId);

    return {
      ok: true,
      sessionId: normalizedSessionId,
    };
  }

  publish(sessionId: string, payload: unknown, excludedSocket?: HubSocket): PublishResult {
    const recipients = this.sessions.get(sessionId);
    if (!recipients || recipients.size === 0) {
      return {
        hasSubscribers: false,
        deliveredCount: 0,
      };
    }

    const payloadJson = JSON.stringify(payload);
    let deliveredCount = 0;

    for (const recipient of recipients) {
      if (excludedSocket && recipient === excludedSocket) {
        continue;
      }

      try {
        recipient.send(payloadJson);
        deliveredCount += 1;
      } catch {
        // Socket cleanup is handled in close/error handlers.
      }
    }

    return {
      hasSubscribers: true,
      deliveredCount,
    };
  }

  remove(socket: HubSocket): void {
    this.unregisteredSockets.delete(socket);

    const sessionId = this.registeredSessionBySocket.get(socket);
    if (!sessionId) {
      return;
    }

    const sessionMembers = this.sessions.get(sessionId);
    if (sessionMembers) {
      sessionMembers.delete(socket);
      if (sessionMembers.size === 0) {
        this.sessions.delete(sessionId);
      }
    }

    this.registeredSessionBySocket.delete(socket);
  }
}
