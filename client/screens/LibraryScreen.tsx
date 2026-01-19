import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, PDFDocument } from "@/navigation/RootStackNavigator";
import { getDocuments, saveDocument, deleteDocument } from "@/lib/storage";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PDFCard({
  document,
  onPress,
  onDelete,
  index,
}: {
  document: PDFDocument;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const progress = document.pageCount > 0 
    ? Math.round((document.lastReadPage / document.pageCount) * 100) 
    : 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onDelete();
        }}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isDark ? "transparent" : theme.border,
            borderWidth: isDark ? 0 : 1,
          },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.thumbnail,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="file-text" size={32} color={theme.textSecondary} />
        </View>
        <View style={styles.cardContent}>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {document.name.replace(".pdf", "")}
          </ThemedText>
          <View style={styles.cardMeta}>
            <ThemedText
              style={[styles.cardMetaText, { color: theme.textSecondary }]}
            >
              {document.pageCount} pages
            </ThemedText>
            <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
            <ThemedText
              style={[styles.cardMetaText, { color: theme.textSecondary }]}
            >
              {formatDate(document.lastReadDate)}
            </ThemedText>
          </View>
          {progress > 0 ? (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.text,
                      width: `${progress}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText
                style={[styles.progressText, { color: theme.textSecondary }]}
              >
                {progress}%
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <Image
        source={require("../../assets/images/empty-library.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText style={styles.emptyTitle}>Your library is empty</ThemedText>
      <ThemedText
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        Import your first PDF to start reading
      </ThemedText>
      <Pressable
        onPress={onImport}
        style={[styles.emptyButton, { borderColor: theme.text }]}
      >
        <Feather name="plus" size={20} color={theme.text} />
        <ThemedText style={styles.emptyButtonText}>Import PDF</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  const handleImport = async () => {
    try {
      setImporting(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        const newDoc: PDFDocument = {
          id: Date.now().toString(),
          uri: file.uri,
          name: file.name || `Document-${Date.now()}.pdf`,
          pageCount: 1,
          lastReadDate: new Date().toISOString(),
          lastReadPage: 0,
        };

        await saveDocument(newDoc);
        
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        await loadDocuments();
      }
    } catch (error) {
      console.error("Error importing PDF:", error);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleOpenDocument = (document: PDFDocument) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("Reader", { document });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.lg,
          },
        ]}
      >
        <ThemedText type="h1" style={styles.headerTitle}>
          Library
        </ThemedText>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={12}
          style={({ pressed }) => [
            styles.settingsButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="settings" size={24} color={theme.text} />
        </Pressable>
      </View>

      {documents.length === 0 ? (
        <EmptyState onImport={handleImport} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl + 80 },
          ]}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <PDFCard
              document={item}
              onPress={() => handleOpenDocument(item)}
              onDelete={() => handleDelete(item.id)}
              index={index}
            />
          )}
        />
      )}

      {documents.length > 0 ? (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.fab,
            {
              bottom: insets.bottom + Spacing.xl,
              backgroundColor: theme.text,
            },
          ]}
        >
          <Pressable
            onPress={handleImport}
            disabled={importing}
            style={styles.fabButton}
          >
            {importing ? (
              <ActivityIndicator size="small" color={theme.backgroundRoot} />
            ) : (
              <Feather name="plus" size={24} color={theme.backgroundRoot} />
            )}
          </Pressable>
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  cardMetaText: {
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "500",
    minWidth: 28,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing["2xl"],
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: Spacing.fabSize,
    height: Spacing.fabSize,
    borderRadius: Spacing.fabSize / 2,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  fabButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
