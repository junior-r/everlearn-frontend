"use client";

import { useDataChannel } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { useCallback, useState } from "react";
import {
  appendUnique,
  CAPTIONS_TOPIC,
  CHAT_TOPIC,
  parseCaption,
  parseChatMessage,
  type Caption,
  type ChatMessage,
} from "@/entities/class-session";

const MAX_MESSAGES = 300;
// Captions are for following along, not for reading back
const MAX_CAPTIONS = 3;

interface DataPacket {
  payload: Uint8Array;
  from?: Participant;
}

/**
 * Collects the chat messages and captions that arrive while the viewer is in
 * the room. Only the video-server publishes them, so a packet sent by a
 * participant is ignored.
 */
export function useRoomFeed(): { messages: ChatMessage[]; captions: Caption[] } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);

  const onChat = useCallback((packet: DataPacket) => {
    const message = packet.from ? null : parseChatMessage(packet.payload);
    if (message) {
      setMessages((current) => appendUnique(current, message, MAX_MESSAGES));
    }
  }, []);
  const onCaption = useCallback((packet: DataPacket) => {
    const caption = packet.from ? null : parseCaption(packet.payload);
    if (caption) {
      setCaptions((current) => appendUnique(current, caption, MAX_CAPTIONS));
    }
  }, []);

  useDataChannel(CHAT_TOPIC, onChat);
  useDataChannel(CAPTIONS_TOPIC, onCaption);
  return { messages, captions };
}
