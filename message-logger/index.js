import { findByName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, ReactNative } from "@vendetta/metro/common";
import { after, before, instead } from "@vendetta/patcher";

const patches = [];

// safe module resolution
const ChannelMessages = findByProps("_channelMessages");
const MessageRecordUtils = findByProps("updateMessageRecord", "createMessageRecord");
const MessageRecord = findByName("MessageRecord", false);
const RowManager = findByName("RowManager");

import { storage } from "@vendetta/plugin";

// init storage
storage.deletedMessages ??= {};
storage.savedImages ??= {};

// -------------------- SAFE HELPERS --------------------

function getMessage(event) {
  try {
    const channel = ChannelMessages?.get?.(event.channelId);
    return channel?.get?.(event.id);
  } catch {
    return null;
  }
}

function saveDeletedMessage(message) {
  try {
    const data = message?.toJS?.();
    if (!data) return;

    storage.deletedMessages[message.id] = {
      ...data,
      __vml_deleted: true,
      timestamp: Date.now(),
    };
  } catch {}
}

// -------------------- MESSAGE DELETE HOOK --------------------

patches.push(
  before("dispatch", FluxDispatcher, (args) => {
    const event = args?.[0];
    if (!event || event.type !== "MESSAGE_DELETE") return;

    const message = getMessage(event);
    if (!message) return;

    if (message.author?.id === "1") return;
    if (message.state === "SEND_FAILED") return;

    saveDeletedMessage(message);

    // return patched message safely (only if structure allows)
    return [
      {
        message: {
          ...message.toJS(),
          __vml_deleted: true,
        },
        type: "MESSAGE_UPDATE",
      },
    ];
  })
);

// -------------------- UI HIGHLIGHT --------------------

if (RowManager?.prototype) {
  patches.push(
    after("generate", RowManager.prototype, (args, row) => {
      const data = args?.[0];
      if (!data?.message) return;
      if (!data.message.__vml_deleted) return;

      row.message.edited = "deleted";
      row.backgroundHighlight = row.backgroundHighlight || {};

      row.backgroundHighlight.backgroundColor =
        ReactNative.processColor("#da373c22");

      row.backgroundHighlight.gutterColor =
        ReactNative.processColor("#da373cff");
    })
  );
}

// -------------------- MESSAGE RECORD PATCH --------------------

if (MessageRecordUtils?.updateMessageRecord) {
  patches.push(
    instead("updateMessageRecord", MessageRecordUtils, (args, orig) => {
      const [oldRecord, newRecord] = args;

      if (newRecord?.__vml_deleted) {
        return MessageRecordUtils.createMessageRecord(
          newRecord,
          oldRecord?.reactions
        );
      }

      return orig.apply(this, args);
    })
  );
}

if (MessageRecordUtils?.createMessageRecord) {
  patches.push(
    after("createMessageRecord", MessageRecordUtils, (args, record) => {
      record.__vml_deleted = args?.[0]?.__vml_deleted;
    })
  );
}

if (MessageRecord) {
  patches.push(
    after("default", MessageRecord, (args, record) => {
      record.__vml_deleted = !!args?.[0]?.__vml_deleted;
    })
  );
}

// -------------------- RESTORE --------------------

function restoreDeletedMessages() {
  const stored = storage.deletedMessages || {};

  const channels = ChannelMessages?._channelMessages || {};

  for (const id in stored) {
    const msg = stored[id];
    const channel = ChannelMessages?.get?.(msg.channel_id);
    const message = channel?.get?.(id);

    if (message) message.__vml_deleted = true;
  }
}

restoreDeletedMessages();

// -------------------- CLEANUP --------------------

export const onUnload = () => {
  patches.forEach((u) => {
    try {
      u();
    } catch {}
  });
};

export { default as settings } from "./settings";
