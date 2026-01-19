import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
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
  const [loadingStatus, setLoadingStatus] = useState("Preparing PDF...");

  const controlsOpacity = useSharedValue(1);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadPdfFile();
  }, [document.uri]);

  const loadPdfFile = async () => {
    try {
      setLoading(true);
      setLoadingStatus("Reading PDF file...");
      setError(null);

      const base64Content = await FileSystem.readAsStringAsync(document.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setPdfBase64(base64Content);
      setLoadingStatus("Rendering pages...");
    } catch (err: any) {
      console.error("Error reading PDF:", err);
      setError(err.message || "Failed to read PDF file");
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
      scheduleHideControls();
    }
  };

  const handleGoBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
          min-height: 100%;
          background-color: ${isDark ? "#0A0A0A" : "#FFFFFF"};
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        #pdf-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 ${Spacing.md}px;
          padding-top: ${insets.top + 56}px;
          padding-bottom: ${insets.bottom + 32}px;
        }
        .page-canvas {
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
          background: ${isDark ? "#1C1C1C" : "#FFFFFF"};
        }
        #status {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: ${isDark ? "#E8E8E8" : "#1A1A1A"};
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          text-align: center;
          padding: 20px;
        }
        .progress-text {
          color: ${isDark ? "#8E8E8E" : "#6B6B6B"};
          font-size: 13px;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div id="status">Initializing...</div>
      <div id="pdf-container"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const container = document.getElementById('pdf-container');
        const statusEl = document.getElementById('status');
        let currentVisiblePage = 1;
        let totalPages = 1;
        let pageOffsets = [];
        
        function sendMessage(data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        }
        
        function updateStatus(text, subtext) {
          statusEl.innerHTML = text + (subtext ? '<div class="progress-text">' + subtext + '</div>' : '');
        }
        
        function base64ToUint8Array(base64) {
          try {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
          } catch (e) {
            throw new Error('Invalid PDF data');
          }
        }
        
        async function renderPage(pdf, pageNum, containerWidth) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth - 32) / viewport.width;
          const scaledViewport = page.getViewport({ scale: scale * 2 });
          
          const canvas = document.createElement('canvas');
          canvas.className = 'page-canvas';
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          canvas.style.width = (scaledViewport.width / 2) + 'px';
          canvas.style.height = (scaledViewport.height / 2) + 'px';
          
          const context = canvas.getContext('2d');
          
          await page.render({
            canvasContext: context,
            viewport: scaledViewport
          }).promise;
          
          return canvas;
        }
        
        async function loadPDF(base64Data) {
          try {
            updateStatus('Decoding PDF...');
            
            if (!base64Data || base64Data.length === 0) {
              throw new Error('No PDF data received');
            }
            
            const pdfData = base64ToUint8Array(base64Data);
            
            updateStatus('Loading document...');
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            totalPages = pdf.numPages;
            
            sendMessage({ type: 'pdfLoaded', totalPages: totalPages });
            
            const containerWidth = window.innerWidth;
            
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              updateStatus('Rendering pages...', 'Page ' + pageNum + ' of ' + totalPages);
              
              const canvas = await renderPage(pdf, pageNum, containerWidth);
              container.appendChild(canvas);
              
              pageOffsets.push({
                pageNum,
                top: canvas.offsetTop,
                bottom: canvas.offsetTop + canvas.offsetHeight
              });
            }
            
            statusEl.style.display = 'none';
            sendMessage({ type: 'renderComplete' });
            
            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
            
          } catch (error) {
            console.error('PDF error:', error);
            updateStatus('Unable to display PDF', error.message);
            sendMessage({ type: 'error', message: error.message || 'Failed to load PDF' });
          }
        }
        
        function handleScroll() {
          const scrollTop = window.scrollY + window.innerHeight / 2;
          
          for (let i = 0; i < pageOffsets.length; i++) {
            const { pageNum, top, bottom } = pageOffsets[i];
            if (scrollTop >= top && scrollTop < bottom) {
              if (currentVisiblePage !== pageNum) {
                currentVisiblePage = pageNum;
                sendMessage({
                  type: 'pageChange',
                  currentPage: currentVisiblePage,
                  totalPages: totalPages
                });
              }
              break;
            }
          }
        }
        
        document.addEventListener('click', function(e) {
          sendMessage({ type: 'tap' });
        });
        
        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'loadPdf' && data.base64) {
              loadPDF(data.base64);
            }
          } catch (e) {
            console.error('Message parse error:', e);
          }
        });
        
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'loadPdf' && data.base64) {
              loadPDF(data.base64);
            }
          } catch (e) {
            console.error('Message parse error:', e);
          }
        });
        
        updateStatus('Waiting for PDF data...');
        sendMessage({ type: 'ready' });
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === "ready" && pdfBase64) {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: "loadPdf", base64: pdfBase64 })
        );
      } else if (data.type === "pageChange") {
        handlePageChange(data.currentPage, data.totalPages);
      } else if (data.type === "pdfLoaded") {
        setTotalPages(data.totalPages);
      } else if (data.type === "renderComplete") {
        setLoading(false);
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

  const handleWebViewLoad = () => {
    if (pdfBase64 && webViewRef.current) {
      setTimeout(() => {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: "loadPdf", base64: pdfBase64 })
        );
      }, 500);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.errorTitle}>Unable to load PDF</ThemedText>
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            {error}
          </ThemedText>
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
          ref={webViewRef}
          source={{ html: pdfViewerHtml }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          onLoad={handleWebViewLoad}
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
            setError("Failed to render PDF viewer");
          }}
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            {loadingStatus}
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
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
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
