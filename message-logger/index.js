import { findByName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, ReactNative } from "@vendetta/metro/common";
import { after, before, instead } from "@vendetta/patcher";

const patches = [];

// safer module resolution
const ChannelMessages = findByProps("_channelMessages") || {};
const MessageRecordUtils = findByProps("updateMessageRecord", "createMessageRecord") || {};
const MessageRecord = findByName("MessageRecord", false);
const RowManager = findByName("RowManager");

import { storage } from "@vendetta/plugin";

// storage init
storage.deletedMessages ??= {};
storage.savedImages ??= {};

// save deleted message
function saveDeletedMessage(message) {
  try {
    const messageData = message?.toJS?.();
    if (!messageData) return;

    storage.deletedMessages[message.id] = {
      ...messageData,
      __vml_deleted: true,
      timestamp: Date.now(),
    };
  } catch {}
}

// safer image save (no FileReader / blob reliance)
async function saveImage(att) {
  try {
    if (!att?.url || !att?.id) return;
    if (storage.savedImages[att.id]) return;

    storage.savedImages[att.id] = {
      url: att.url,
      proxy_url: att.proxy_url,
      filename: att.filename,
      timestamp: Date.now(),
    };
  } catch {}
}

// MESSAGE DELETE interception
patches.push(
  before("dispatch", FluxDispatcher, (args) => {
    const event = args?.[0];
    if (!event || event.type !== "MESSAGE_DELETE") return;

    const channels = ChannelMessages._channelMessages || {};
    const channel = ChannelMessages.get?.(event.channelId);
    const message = channel?.get?.(event.id);

    if (!message) return;

    if (message.author?.id === "1") return;
    if (message.state === "SEND_FAILED") return;

    saveDeletedMessage(message);

    if (storage.saveImages && message.attachments) {
      message.attachments.forEach(saveImage);
    }

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

// highlight deleted messages
if (RowManager) {
  patches.push(
    after("generate", RowManager.prototype, (args, row) => {
      const data = args?.[0];
      if (!data || data.rowType !== 1) return;

      if (data.message?.__vml_deleted) {
        row.message.edited = "deleted";
        row.backgroundHighlight = row.backgroundHighlight || {};

        row.backgroundHighlight.backgroundColor =
          ReactNative.processColor("#da373c22");

        row.backgroundHighlight.gutterColor =
          ReactNative.processColor("#da373cff");
      }
    })
  );
}

// message record patch (safe guarded)
if (MessageRecordUtils.updateMessageRecord) {
  patches.push(
    instead("updateMessageRecord", MessageRecordUtils, function (args, orig) {
      const oldRecord = args[0];
      const newRecord = args[1];

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

// record creation
if (MessageRecordUtils.createMessageRecord) {
  patches.push(
    after("createMessageRecord", MessageRecordUtils, (args, record) => {
      record.__vml_deleted = args?.[0]?.__vml_deleted;
    })
  );
}

// message class patch
if (MessageRecord) {
  patches.push(
    after("default", MessageRecord, (args, record) => {
      record.__vml_deleted = !!args?.[0]?.__vml_deleted;
    })
  );
}

// restore messages
function restoreDeletedMessages() {
  const stored = storage.deletedMessages || {};

  for (const id in stored) {
    const msg = stored[id];
    const channel = ChannelMessages.get?.(msg.channel_id);
    const message = channel?.get?.(id);

    if (message) message.__vml_deleted = true;
  }
}

restoreDeletedMessages();

// cleanup
export const onUnload = () => {
  patches.forEach((u) => {
    try {
      u();
    } catch {}
  });
};

export { default as settings } from "./settings";