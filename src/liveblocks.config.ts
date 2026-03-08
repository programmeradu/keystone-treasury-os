import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
    authEndpoint: "/api/liveblocks-auth",
});

// Presence: data that's temporary and frequently updated (like cursor positions)
type Presence = {
    cursor: { x: number; y: number } | null;
    status?: "online" | "away" | "busy";
};

// Storage: shared data that's persisted even after all users leave
type Storage = {
    // Add shared state here (e.g., shared chat, collaborative notes)
    teamNotes: string;
    chatMessages: {
        text: string;
        sender: string;
        timestamp: number;
    }[];
};

// UserMeta: static data for users (like name, avatar)
type UserMeta = {
    id: string;
    info: {
        name: string;
        color: string;
        avatar: string;
    };
};

// RoomEvent: custom events sent between users
type RoomEvent =
    | { type: "SIGNAL"; payload: any }
    | { type: "PROPOSAL_SIGNED"; payload: { proposalId: number; signer: string } }
    | { type: "SIMULATION_RESULT"; payload: { proposalId: number; result: any } }
    | { type: "DISTRIBUTION_SAVED"; payload: { name: string; count: number } };

const roomContext = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export const {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useSelf,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
    useStorage,
} = roomContext;

export const {
    suspense: {
        RoomProvider: RoomProviderSuspense,
        useRoom: useRoomSuspense,
        useMyPresence: useMyPresenceSuspense,
        useUpdateMyPresence: useUpdateMyPresenceSuspense,
        useOthers: useOthersSuspense,
        useOthersMapped: useOthersMappedSuspense,
        useOthersConnectionIds: useOthersConnectionIdsSuspense,
        useOther: useOtherSuspense,
        useBroadcastEvent: useBroadcastEventSuspense,
        useEventListener: useEventListenerSuspense,
        useSelf: useSelfSuspense,
        useHistory: useHistorySuspense,
        useUndo: useUndoSuspense,
        useRedo: useRedoSuspense,
        useCanUndo: useCanUndoSuspense,
        useCanRedo: useCanRedoSuspense,
        useMutation: useMutationSuspense,
        useStatus: useStatusSuspense,
        useLostConnectionListener: useLostConnectionListenerSuspense,
        useStorage: useStorageSuspense,
    },
} = roomContext;
