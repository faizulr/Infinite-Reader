import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getSettings, saveSettings, clearCache, AppSettings } from "@/lib/storage";

type ThemeOption = "light" | "dark" | "auto";

function SettingsGroup({
  title,
  children,
  index,
}: {
  title: string;
  children: React.ReactNode;
  index: number;
}) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.group}
    >
      <ThemedText
        style={[styles.groupTitle, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
      <View
        style={[
          styles.groupContent,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isLast,
}: {
  icon: string;
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 },
        { opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View style={styles.rowLeft}>
        <Feather
          name={icon as any}
          size={20}
          color={theme.text}
          style={styles.rowIcon}
        />
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      </View>
      <View style={styles.rowRight}>
        {typeof value === "string" ? (
          <ThemedText style={[styles.rowValue, { color: theme.textSecondary }]}>
            {value}
          </ThemedText>
        ) : (
          value
        )}
        {onPress ? (
          <Feather
            name="chevron-right"
            size={18}
            color={theme.textSecondary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeOption;
  onChange: (value: ThemeOption) => void;
}) {
  const { theme, isDark } = useTheme();
  const options: { key: ThemeOption; icon: string; label: string }[] = [
    { key: "light", icon: "sun", label: "Light" },
    { key: "dark", icon: "moon", label: "Dark" },
    { key: "auto", icon: "smartphone", label: "Auto" },
  ];

  return (
    <View style={styles.themeSelector}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(option.key);
          }}
          style={[
            styles.themeOption,
            {
              backgroundColor:
                value === option.key
                  ? theme.text
                  : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather
            name={option.icon as any}
            size={16}
            color={value === option.key ? theme.backgroundRoot : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.themeOptionLabel,
              {
                color:
                  value === option.key
                    ? theme.backgroundRoot
                    : theme.textSecondary,
              },
            ]}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AppSettings>({
    darkMode: "auto",
    fontSizeMultiplier: 1.0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings]
  );

  const handleClearCache = async () => {
    try {
      await clearCache();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error clearing cache:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const fontSizeLabel =
    settings.fontSizeMultiplier === 1.0
      ? "Default"
      : settings.fontSizeMultiplier < 1.0
        ? "Smaller"
        : "Larger";

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <SettingsGroup title="APPEARANCE" index={0}>
        <View style={styles.themeRow}>
          <View style={styles.rowLeft}>
            <Feather
              name="sun"
              size={20}
              color={theme.text}
              style={styles.rowIcon}
            />
            <ThemedText style={styles.rowLabel}>Theme</ThemedText>
          </View>
        </View>
        <View style={styles.themeSelectorContainer}>
          <ThemeSelector
            value={settings.darkMode}
            onChange={(value) => updateSetting("darkMode", value)}
          />
        </View>
      </SettingsGroup>

      <SettingsGroup title="READING" index={1}>
        <SettingsRow
          icon="type"
          label="Text Size"
          value={fontSizeLabel}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="STORAGE" index={2}>
        <SettingsRow
          icon="trash-2"
          label="Clear Library"
          onPress={handleClearCache}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="ABOUT" index={3}>
        <SettingsRow icon="info" label="Version" value="1.0.0" isLast />
      </SettingsGroup>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  group: {
    gap: Spacing.sm,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginLeft: Spacing.md,
  },
  groupContent: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: Spacing.md,
  },
  rowLabel: {
    fontSize: 17,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rowValue: {
    fontSize: 17,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  themeSelectorContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  themeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
