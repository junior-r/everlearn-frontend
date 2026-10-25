"use client";

import { useConnectionState, useDataChannel, useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent, type Participant } from "livekit-client";
import { useCallback, useEffect, useRef } from "react";
import { CHAT_TOPIC, HAND_ATTRIBUTE, parseChatMessage } from "@/entities/class-session";
import { useSoundCue } from "@/shared/lib/sound-preferences";

interface DataPacket {
  payload: Uint8Array;
  from?: Participant;
}

/**
 * Plays the classroom's sounds: entering the class, someone else entering, a
 * message from someone else and, for the Teacher, a hand going up. Nothing the
 * viewer does themselves makes a sound, and a replayed message makes none.
 */
export function useClassroomSounds({ identity, isTeacher }: { identity: string; isTeacher: boolean }) {
  const play = useSoundCue();
  const room = useRoomContext();
  const state = useConnectionState();
  const hasEntered = useRef(false);

  useEffect(() => {
    // Once per visit: a reconnection is not entering again
    if (state === ConnectionState.Connected && !hasEntered.current) {
      hasEntered.current = true;
      play("joined");
    }
  }, [state, play]);

  useEffect(() => {
    const onJoined = (participant: Participant) => {
      if (participant.identity !== identity) {
        play("someoneJoined");
      }
    };
    const onAttributes = (changed: Record<string, string>, participant: Participant) => {
      if (isTeacher && changed[HAND_ATTRIBUTE] && participant.identity !== identity) {
        play("handRaised");
      }
    };
    room.on(RoomEvent.ParticipantConnected, onJoined);
    room.on(RoomEvent.ParticipantAttributesChanged, onAttributes);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoined);
      room.off(RoomEvent.ParticipantAttributesChanged, onAttributes);
    };
  }, [room, identity, isTeacher, play]);

  const onChat = useCallback(
    (packet: DataPacket) => {
      const message = packet.from ? null : parseChatMessage(packet.payload);
      if (message && message.senderId !== identity) {
        play("message");
      }
    },
    [identity, play],
  );
  useDataChannel(CHAT_TOPIC, onChat);
}
