import { Logger, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

interface JwtPayload {
  sub: string;
  schoolId: string;
  role: "teacher" | "admin" | "finance";
}

/**
 * PaymentsGateway — Socket.IO entry point for the access:granted event.
 *
 * Clients connect with their JWT in the `auth.token` field of the Socket.IO
 * handshake. On valid JWT, the socket joins `user:<userId>` so subsequent
 * emits target only that user.
 *
 * The actual emit is invoked by PaymentsService after a successful Daraja
 * callback issues an access token.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // No namespace — clients connect to the default `/`.
})
export class PaymentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PaymentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth as { token?: string } | undefined)?.token ??
      (typeof client.handshake.headers.authorization === "string"
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
        : undefined);

    if (!token) {
      this.logger.warn(`Socket ${client.id} connected without token; disconnecting`);
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const room = `user:${payload.sub}`;
      await client.join(room);
      client.data.userId = payload.sub;
      this.logger.debug?.(`Socket ${client.id} joined ${room}`);
    } catch {
      this.logger.warn(`Socket ${client.id} provided invalid token; disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug?.(`Socket ${client.id} disconnected`);
  }

  /**
   * Emit access:granted to a specific user's room. Called by PaymentsService
   * after a successful Daraja callback.
   */
  emitAccessGranted(
    userId: string,
    payload: { validUntil: Date; pass: "day" | "week" | "month" },
  ): void {
    this.server?.to(`user:${userId}`).emit("access:granted", {
      validUntil: payload.validUntil.toISOString(),
      pass: payload.pass,
    });
  }
}
