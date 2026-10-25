"use client";

import { useConnectionState, useDataChannel } from "@livekit/components-react";
import { ConnectionState, type Participant } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import {
  CAPTIONS_TOPIC,
  CHAT_DELETED_TOPIC,
  CHAT_TOPIC,
  EMPTY_FEED,
  fetchRoomFeed,
  withHistory,
  withPacket,
  type Caption,
  type ChatMessage,
} from "@/entities/class-session";

interface DataPacket {
  topic?: string;
  payload: Uint8Array;
  from?: Participant;
}

/**
 * Collects the chat messages and captions of the room, and blanks the messages
 * taken down. Each time the viewer connects, what the room had before is
 * replayed first, so a late joiner or a member coming back sees it too. Only
 * the video-server publishes, so a packet sent by a participant is ignored.
 */
export function useRoomFeed(roomToken: string): { messages: ChatMessage[]; captions: Caption[] } {
  const [feed, setFeed] = useState(EMPTY_FEED);
  const isConnected = useConnectionState() === ConnectionState.Connected;

  const onPacket = useCallback((packet: DataPacket) => {
    const { topic } = packet;
    if (!packet.from && topic) {
      setFeed((current) => withPacket(current, { topic, payload: packet.payload }));
    }
  }, []);
  useDataChannel(CHAT_TOPIC, onPacket);
  useDataChannel(CHAT_DELETED_TOPIC, onPacket);
  useDataChannel(CAPTIONS_TOPIC, onPacket);

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    const request = new AbortController();
    fetchRoomFeed(roomToken, request.signal)
      .then((history) => setFeed((current) => withHistory(current, history)))
      // The replay is a courtesy: without it the class goes on with what arrives live
      .catch(() => undefined);
    return () => request.abort();
  }, [roomToken, isConnected]);

  return { messages: feed.messages, captions: feed.captions };
}
