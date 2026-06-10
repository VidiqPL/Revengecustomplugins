import { findByName, findByProps } from "@vendetta/metro";
import { FluxDispatcher, ReactNative } from "@vendetta/metro/common";
import { after, before, instead } from "@vendetta/patcher";
import { FileSystem } from "@vendetta/metro/common";

const patches = [];
const ChannelMessages = findByProps("_channelMessages");
const MessageRecordUtils = findByProps("updateMessageRecord", "createMessageRecord");
const MessageRecord = findByName("MessageRecord", false);
const RowManager = findByName("RowManager");

import { storage } from "@vendetta/plugin";

// Initialize persistent storage
storage.deletedMessages ??= {};
storage.savedImages ??= {};

// Function to save deleted message to persistent storage
function saveDeletedMessage(message: any) {
  const messageData = message.toJS();
  storage.deletedMessages[message.id] = {
    ...messageData,
    __vml_deleted: true,
    timestamp: Date.now(),
  };
}

// Function to save image to persistent storage
async function saveImage(attachment: any) {
  try {
    if (!attachment?.url || !attachment?.id) return;
    
    // Check if already saved
    if (storage.savedImages[attachment.id]) return;
    
    const response = await fetch(attachment.url);
    if (!response.ok) return;
    
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      storage.savedImages[attachment.id] = {
        url: attachment.url,
        proxy_url: attachment.proxy_url,
        filename: attachment.filename,
        data: base64,
        timestamp: Date.now(),
      };
    };
    reader.readAsDataURL(blob);
  } catch (e) {
    console.error("Failed to save image:", e);
  }
}

patches.push(before("dispatch", FluxDispatcher, ([event]) => {
  if (event.type === "MESSAGE_DELETE") {
    if (event.__vml_cleanup) return event;

    const channel = ChannelMessages.get(event.channelId);
    const message = channel?.get(event.id);
    if (!message) return event;

    if (message.author?.id == "1") return event;
    if (message.state == "SEND_FAILED") return event;

    storage.nopk && fetch(`https://api.pluralkit.me/v2/messages/${encodeURIComponent(message.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (message.id === data.original && !data.member?.keep_proxy) {
          FluxDispatcher.dispatch({
            type: "MESSAGE_DELETE",
            id: message.id,
            channelId: message.channel_id,
            __vml_cleanup: true,
          });
        }
      });

    // Save deleted message to persistent storage
    saveDeletedMessage(message);
    
    // Save images if enabled
    if (storage.saveImages && message.attachments) {
      message.attachments.forEach(saveImage);
    }

    return [{
      message: {
        ...message.toJS(),
        __vml_deleted: true,
      },
      type: "MESSAGE_UPDATE",
    }];
  }
}));

patches.push(after("generate", RowManager.prototype, ([data], row) => {
  if (data.rowType !== 1) return;
  if (data.message.__vml_deleted) {
    row.message.edited = "deleted";
    row.backgroundHighlight ??= {};
    row.backgroundHighlight.backgroundColor = ReactNative.processColor("#da373c22");
    row.backgroundHighlight.gutterColor = ReactNative.processColor("#da373cff");
  }
}));

patches.push(instead("updateMessageRecord", MessageRecordUtils, function ([oldRecord, newRecord], orig) {
  if (newRecord.__vml_deleted) {
    return MessageRecordUtils.createMessageRecord(newRecord, oldRecord.reactions);
  }
  return orig.apply(this, [oldRecord, newRecord]);
}));

patches.push(after("createMessageRecord", MessageRecordUtils, function ([message], record) {
  record.__vml_deleted = message.__vml_deleted;
  // record.__vml_edits = message.__vml_edits;
}));

patches.push(after("default", MessageRecord, ([props], record) => {
  record.__vml_deleted = !!props.__vml_deleted;
  // record.__vml_edits = props.__vml_edits;
}));

// Function to restore deleted messages from persistent storage
function restoreDeletedMessages() {
  for (const messageId in storage.deletedMessages) {
    const savedMessage = storage.deletedMessages[messageId];
    const channel = ChannelMessages.get(savedMessage.channel_id);
    if (channel) {
      const message = channel.get(messageId);
      if (message) {
        message.__vml_deleted = true;
      }
    }
  }
}

// Restore deleted messages on plugin load
restoreDeletedMessages();

export const onUnload = () => {
  patches.forEach((unpatch) => unpatch());

  // Don't clear persistent storage on unload - this is the key fix
  // The old version cleared all __vml_deleted flags, causing data loss
  // Now we keep the data in storage so it persists across Discord restarts
  
  for (const channelId in ChannelMessages._channelMessages) {
    for (const message of ChannelMessages._channelMessages[channelId]._array) {
      message.__vml_deleted && FluxDispatcher.dispatch({
        type: "MESSAGE_DELETE",
        id: message.id,
        channelId: message.channel_id,
        __vml_cleanup: true,
      });
    }
  }
};

export { default as settings } from "./settings";