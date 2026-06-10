import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";

const patches = [];

// init storage safely
storage.logs ??= {};
storage.deleted ??= {};

function safeLog(event) {
  try {
    if (!event?.id) return;

    storage.deleted[event.id] = {
      id: event.id,
      channelId: event.channelId,
      time: Date.now()
    };
  } catch {}
}

// ONLY safe hook (no returns, no UI hacks)
patches.push(
  before("dispatch", FluxDispatcher, (args) => {
    const event = args?.[0];
    if (!event) return;

    if (event.type === "MESSAGE_DELETE") {
      safeLog(event);
    }
  })
);

export const onUnload = () => {
  patches.forEach(u => {
    try { u(); } catch {}
  });
};

export default {};
