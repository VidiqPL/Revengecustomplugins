import { ReactNative } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";

const { FormIcon, FormSwitchRow, FormSection, FormRow } = Forms;

storage.nopk ??= false;
storage.saveImages ??= false;

export default () => {
  useProxy(storage);

  const clearLogs = () => {
    storage.deletedMessages = {};
    storage.savedImages = {};
  };

  return (
    <ReactNative.ScrollView>
      <FormSection title="Message Logger Settings">
        <FormSwitchRow
          label="Ignore PluralKit"
          leading={<FormIcon source={getAssetIDByName("ic_block")} />}
          onValueChange={(v) => void (storage.nopk = v)}
          value={storage.nopk}
        />
        <FormSwitchRow
          label="Save Images"
          leading={<FormIcon source={getAssetIDByName("ic_image")} />}
          onValueChange={(v) => void (storage.saveImages = v)}
          value={storage.saveImages}
        />
      </FormSection>
      
      <FormSection title="Data Management">
        <FormRow
          label="Clear All Logs"
          leading={<FormIcon source={getAssetIDByName("ic trash")} />}
          onPress={clearLogs}
        />
        <FormRow
          label={`Deleted Messages: ${Object.keys(storage.deletedMessages || {}).length}`}
          disabled
        />
        <FormRow
          label={`Saved Images: ${Object.keys(storage.savedImages || {}).length}`}
          disabled
        />
      </FormSection>
    </ReactNative.ScrollView>
  );
};