import { getCurrentUser } from "@/lib/auth";
import { getSettingJson } from "@/lib/db";
import { listUsers } from "@/lib/queries";
import { DEFAULT_RATING_PARAMS, DEFAULT_ROUND_PRESETS } from "@/lib/types";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  const ratingParams = getSettingJson<string[]>(
    "rating_params",
    DEFAULT_RATING_PARAMS
  );
  const roundPresets = getSettingJson<string[]>(
    "round_presets",
    DEFAULT_ROUND_PRESETS
  );
  const isAdmin = user.role === "admin";

  return (
    <SettingsView
      role={user.role}
      currentUserId={user.id}
      ratingParams={ratingParams}
      roundPresets={roundPresets}
      users={isAdmin ? listUsers() : []}
    />
  );
}
