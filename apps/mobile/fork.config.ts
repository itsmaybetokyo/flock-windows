import type { ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";
type Plugin = NonNullable<ExpoConfig["plugins"]>[number];

/**
 * Fork-only mobile branding. Upstream's app.config.ts keeps saying "T3 Code" and
 * points at the T3 artwork, so the Flock identity lives here instead of in edits
 * that would conflict on every upstream merge.
 */
const FLOCK_ASSETS = {
  appIcon: "../../assets/flock/flock-universal-1024.png",
  androidForeground: "./assets/flock/android-icon-foreground.png",
  androidBackground: "./assets/flock/android-icon-background.png",
  androidBackgroundColor: "#D97757",
  androidSplashBackgroundColor: "#B9583A",
  androidMonochrome: "./assets/flock/android-icon-mark.png",
  androidSplash: "./assets/flock/android-splash-icon.png",
  androidNotification: "./assets/flock/android-notification-icon.png",
  androidNotificationColor: "#D97757",
} as const;

const FLOCK_NAMES: Record<AppVariant, string> = {
  development: "Flock Dev",
  preview: "Flock Preview",
  production: "Flock",
};

function splashPlugin(props: Record<string, unknown>): Plugin {
  const dark = (props.dark ?? {}) as Record<string, unknown>;
  const android = (props.android ?? {}) as Record<string, unknown>;
  const androidDark = (android.dark ?? {}) as Record<string, unknown>;
  return [
    "expo-splash-screen",
    {
      ...props,
      image: FLOCK_ASSETS.androidSplash,
      backgroundColor: FLOCK_ASSETS.androidBackgroundColor,
      dark: {
        ...dark,
        image: FLOCK_ASSETS.androidSplash,
        backgroundColor: FLOCK_ASSETS.androidSplashBackgroundColor,
      },
      android: {
        ...android,
        image: FLOCK_ASSETS.androidSplash,
        backgroundColor: FLOCK_ASSETS.androidBackgroundColor,
        dark: {
          ...androidDark,
          image: FLOCK_ASSETS.androidSplash,
          backgroundColor: FLOCK_ASSETS.androidSplashBackgroundColor,
        },
      },
    },
  ] as Plugin;
}

export function withFlockMobileBrand(config: ExpoConfig, variant: AppVariant): ExpoConfig {
  const plugins = config.plugins?.map((plugin): Plugin => {
    if (!Array.isArray(plugin)) return plugin;
    const [name, props] = plugin as [string, Record<string, unknown>];
    if (!props || typeof props !== "object") return plugin;
    switch (name) {
      case "expo-splash-screen":
        return splashPlugin(props);
      case "expo-notifications":
        return [
          name,
          {
            ...props,
            icon: FLOCK_ASSETS.androidNotification,
            color: FLOCK_ASSETS.androidNotificationColor,
          },
        ] as Plugin;
      case "expo-quick-actions":
        return [
          name,
          {
            ...props,
            androidIcons: {
              shortcut_icon: {
                foregroundImage: FLOCK_ASSETS.androidForeground,
                backgroundColor: FLOCK_ASSETS.androidBackgroundColor,
                backgroundImage: FLOCK_ASSETS.androidBackground,
              },
            },
          },
        ] as Plugin;
      default:
        return plugin;
    }
  });

  return {
    ...config,
    name: FLOCK_NAMES[variant],
    icon: FLOCK_ASSETS.appIcon,
    // Upstream's EAS project serves T3-branded OTA updates. A fork must opt in
    // explicitly after pointing updates at its own project.
    updates: config.updates
      ? { ...config.updates, enabled: process.env.T3CODE_MOBILE_UPDATES_ENABLED === "1" }
      : config.updates,
    ios: config.ios ? { ...config.ios, icon: FLOCK_ASSETS.appIcon } : config.ios,
    android: {
      ...config.android,
      icon: FLOCK_ASSETS.appIcon,
      adaptiveIcon: {
        backgroundColor: FLOCK_ASSETS.androidBackgroundColor,
        backgroundImage: FLOCK_ASSETS.androidBackground,
        foregroundImage: FLOCK_ASSETS.androidForeground,
        monochromeImage: FLOCK_ASSETS.androidMonochrome,
      },
    },
    plugins,
  };
}
