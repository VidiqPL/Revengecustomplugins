import { ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";

const { FormIcon, FormSwitchRow, FormSection, FormRow } = Forms;

// safe init
storage.nopk ??= false;
storage.saveImages ??= false;

export default function Settings() {
  useProxy(storage);

  // clear everything safely
  const clearLogs = () => {
    storage.logs = {};
    storage.deleted = {};
  };

  const logCount = Object.keys(storage.logs || {}).length;
  const deletedCount = Object.keys(storage.deleted || {}).length;

  return (
    <ReactNative.ScrollView>
      {/* SETTINGS */}
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

      {/* DATA */}
      <FormSection title="Data">

        <FormRow
          label="Clear All Logs"
          leading={<FormIcon source={getAssetIDByName("ic_delete")} />}
          onPress={clearLogs}
        />

        <FormRow
          label={`Stored Messages: ${logCount}`}
          disabled
        />

        <FormRow
          label={`Deleted Messages: ${deletedCount}`}
          disabled
        />

      </FormSection>
    </ReactNative.ScrollView>
  );
}
