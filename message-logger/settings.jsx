import { ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";

const { FormIcon, FormSwitchRow, FormSection, FormRow } = Forms;

storage.nopk ??= false;
storage.saveImages ??= false;

export default function Settings() {
  useProxy(storage);

  const clearLogs = () => {
    storage.deletedMessages = {};
    storage.savedImages = {};
  };

  return (
    <ReactNative.ScrollView>
      <FormSection title="Message Logger">
        <FormSwitchRow
          label="Ignore PluralKit"
          leading={<FormIcon source={getAssetIDByName("ic_block")} />}
          value={storage.nopk}
          onValueChange={(v) => (storage.nopk = v)}
        />

        <FormSwitchRow
          label="Save Attachments (metadata only)"
          leading={<FormIcon source={getAssetIDByName("ic_image")} />}
          value={storage.saveImages}
          onValueChange={(v) => (storage.saveImages = v)}
        />
      </FormSection>

      <FormSection title="Data">
        <FormRow
          label="Clear Logs"
          leading={<FormIcon source={getAssetIDByName("ic_delete")} />}
          onPress={clearLogs}
        />

        <FormRow
          label={`Deleted: ${Object.keys(storage.deletedMessages || {}).length}`}
          disabled
        />

        <FormRow
          label={`Saved: ${Object.keys(storage.savedImages || {}).length}`}
          disabled
        />
      </FormSection>
    </ReactNative.ScrollView>
  );
}