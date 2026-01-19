import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { updateReadProgress } from "@/lib/storage";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReaderRouteProp = RouteProp<RootStackParamList, "Reader">;

export default function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReaderRouteProp>();
  const { document } = route.params;
  const { theme, isDark } = useTheme();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(document.lastReadPage || 1);
  const [totalPages, setTotalPages] = useState(document.pageCount || 1);
  const [error, setError] = useState<string | null>(null);

  const controlsOpacity = useSharedValue(1);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPdfAsBase64();
  }, [document.uri]);

  const loadPdfAsBase64 = async () => {
    try {
      setLoading(true);
      setError(null);
      const base64 = await FileSystem.readAsStringAsync(document.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfBase64(base64);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Unable to load PDF file");
      setLoading(false);
    }
  };

  const showControls = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    setControlsVisible(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  const hideControls = useCallback(() => {
    controlsOpacity.value = withTiming(0, { duration: 300 });
    hideControlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, 300);
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      hideControls();
    }, 3000);
  }, [hideControls]);

  useEffect(() => {
    scheduleHideControls();
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const toggleControls = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
      scheduleHideControls();
    }
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateReadProgress(document.id, currentPage);
    navigation.goBack();
  };

  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const pdfViewerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          background-color: ${isDark ? "#0A0A0A" : "#FFFFFF"};
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        #pdf-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 ${Spacing.lg}px;
          padding-top: ${insets.top + 60}px;
          padding-bottom: ${insets.bottom + 40}px;
        }
        .page-canvas {
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
          margin-bottom: 0;
          background: ${isDark ? "#1C1C1C" : "#FFFFFF"};
        }
        #loading {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: ${isDark ? "#E8E8E8" : "#1A1A1A"};
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
        }
        #error {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: ${isDark ? "#E8E8E8" : "#1A1A1A"};
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          text-align: center;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div id="loading">Loading PDF...</div>
      <div id="pdf-container"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const pdfBase64 = '${pdfBase64 || ""}';
        const container = document.getElementById('pdf-container');
        const loadingEl = document.getElementById('loading');
        let currentVisiblePage = 1;
        let totalPages = 1;
        let pageOffsets = [];
        
        function base64ToArrayBuffer(base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
        
        async function loadPDF() {
          try {
            if (!pdfBase64) {
              loadingEl.innerHTML = '<div id="error">No PDF data available</div>';
              return;
            }
            
            const pdfData = base64ToArrayBuffer(pdfBase64);
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            totalPages = pdf.numPages;
            loadingEl.style.display = 'none';
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pdfLoaded',
              totalPages: totalPages
            }));
            
            const containerWidth = container.clientWidth;
            
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 1 });
              const scale = containerWidth / viewport.width;
              const scaledViewport = page.getViewport({ scale });
              
              const canvas = document.createElement('canvas');
              canvas.className = 'page-canvas';
              canvas.width = scaledViewport.width * 2;
              canvas.height = scaledViewport.height * 2;
              canvas.style.width = scaledViewport.width + 'px';
              canvas.style.height = scaledViewport.height + 'px';
              
              container.appendChild(canvas);
              
              const context = canvas.getContext('2d');
              context.scale(2, 2);
              
              await page.render({
                canvasContext: context,
                viewport: scaledViewport
              }).promise;
              
              pageOffsets.push({
                pageNum,
                top: canvas.offsetTop,
                bottom: canvas.offsetTop + canvas.offsetHeight
              });
            }
            
            window.addEventListener('scroll', handleScroll);
            handleScroll();
            
          } catch (error) {
            loadingEl.innerHTML = '<div id="error">Unable to load PDF<br><small>' + error.message + '</small></div>';
            console.error('PDF load error:', error);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
        }
        
        function handleScroll() {
          const scrollTop = window.scrollY + window.innerHeight / 2;
          
          for (let i = 0; i < pageOffsets.length; i++) {
            const { pageNum, top, bottom } = pageOffsets[i];
            if (scrollTop >= top && scrollTop < bottom) {
              if (currentVisiblePage !== pageNum) {
                currentVisiblePage = pageNum;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'pageChange',
                  currentPage: currentVisiblePage,
                  totalPages: totalPages
                }));
              }
              break;
            }
          }
        }
        
        document.addEventListener('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'tap'
          }));
        });
        
        loadPDF();
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "pageChange") {
        handlePageChange(data.currentPage, data.totalPages);
      } else if (data.type === "pdfLoaded") {
        setLoading(false);
        setTotalPages(data.totalPages);
      } else if (data.type === "tap") {
        toggleControls();
      } else if (data.type === "error") {
        setError(data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("WebView message error:", err);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            onPress={handleGoBack}
            style={[styles.errorButton, { borderColor: theme.text }]}
          >
            <ThemedText>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.progressLine,
            {
              width: `${progress}%`,
              backgroundColor: theme.text,
              top: insets.top,
            },
          ]}
        />
      </View>

      {pdfBase64 ? (
        <WebView
          key={pdfBase64.substring(0, 100)}
          source={{ html: pdfViewerHtml }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          scrollEnabled={true}
          bounces={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={false}
          contentMode="mobile"
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error:", nativeEvent);
            setError("Failed to render PDF");
          }}
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading PDF...
          </ThemedText>
        </View>
      ) : null}

      {controlsVisible ? (
        <Animated.View
          style={[
            styles.overlayHeader,
            {
              paddingTop: insets.top + Spacing.sm,
              backgroundColor: theme.overlay,
            },
            controlsAnimatedStyle,
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleGoBack}
            style={styles.controlButton}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>

          <ThemedText style={styles.pageIndicator}>
            {currentPage} / {totalPages}
          </ThemedText>

          <View style={styles.controlButton} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing["2xl"],
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  errorButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
  progressLine: {
    position: "absolute",
    left: 0,
    height: 2,
    zIndex: 100,
  },
  overlayHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
