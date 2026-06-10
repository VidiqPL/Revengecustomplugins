import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";

const patches = [];

// persistent storage
storage.logs ??= {};
storage.deleted ??= {};

// ----------------------------
// 1. STORE MESSAGES WHEN SEEN
// ----------------------------
patches.push(
  before("dispatch", FluxDispatcher, (args) => {
    const event = args?.[0];
    if (!event) return;

    // MESSAGE CREATE / UPDATE (store live message)
    if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
      const msg = event.message;
      if (!msg?.id) return;

      storage.logs[msg.id] = {
        id: msg.id,
        channelId: msg.channel_id,
        author: msg.author,
        content: msg.content,
        attachments: msg.attachments || [],
        timestamp: Date.now()
      };
    }

    // MESSAGE DELETE (only mark)
    if (event.type === "MESSAGE_DELETE") {
      const id = event.id;

      if (storage.logs[id]) {
        storage.deleted[id] = {
          ...storage.logs[id],
          deletedAt: Date.now()
        };
      } else {
        // fallback if not cached yet
        storage.deleted[id] = {
          id,
          channelId: event.channelId,
          content: "[uncached message]",
          deletedAt: Date.now()
        };
      }
    }
  })
);

// ----------------------------
// cleanup
// ----------------------------
export const onUnload = () => {
  patches.forEach(u => u());
};
