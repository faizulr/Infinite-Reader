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

async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const FileSystem = await import("expo-file-system");
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

function WebPDFViewer({
  pdfBase64,
  isDark,
  insets,
  onPageChange,
  onLoaded,
  onError,
}: {
  pdfBase64: string;
  isDark: boolean;
  insets: { top: number; bottom: number };
  onPageChange: (page: number, total: number) => void;
  onLoaded: (totalPages: number) => void;
  onError: (message: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!pdfBase64 || Platform.OS !== "web") return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%; min-height: 100%;
            background: ${isDark ? "#0A0A0A" : "#FFFFFF"};
            overflow-x: hidden;
          }
          #container {
            display: flex; flex-direction: column; align-items: center;
            padding: 16px; padding-top: ${insets.top + 56}px;
            padding-bottom: ${insets.bottom + 32}px;
          }
          canvas { display: block; max-width: 100%; height: auto; margin-bottom: 0; }
          #status {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: ${isDark ? "#E8E8E8" : "#1A1A1A"}; font-family: system-ui; text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="status">Loading PDF...</div>
        <div id="container"></div>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          const base64 = '${pdfBase64}';
          const container = document.getElementById('container');
          const status = document.getElementById('status');
          let pageOffsets = [];
          let currentPage = 1;
          let totalPages = 1;
          
          async function render() {
            try {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              
              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              totalPages = pdf.numPages;
              parent.postMessage({ type: 'loaded', totalPages }, '*');
              
              const width = container.clientWidth;
              for (let i = 1; i <= totalPages; i++) {
                status.textContent = 'Rendering page ' + i + ' of ' + totalPages;
                const page = await pdf.getPage(i);
                const vp = page.getViewport({ scale: 1 });
                const scale = (width / vp.width) * 2;
                const svp = page.getViewport({ scale });
                
                const canvas = document.createElement('canvas');
                canvas.width = svp.width;
                canvas.height = svp.height;
                canvas.style.width = (svp.width/2) + 'px';
                canvas.style.height = (svp.height/2) + 'px';
                container.appendChild(canvas);
                
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: svp }).promise;
                pageOffsets.push({ page: i, top: canvas.offsetTop, bottom: canvas.offsetTop + canvas.offsetHeight });
              }
              
              status.style.display = 'none';
              parent.postMessage({ type: 'rendered' }, '*');
              
              window.addEventListener('scroll', () => {
                const y = window.scrollY + window.innerHeight / 2;
                for (const p of pageOffsets) {
                  if (y >= p.top && y < p.bottom && currentPage !== p.page) {
                    currentPage = p.page;
                    parent.postMessage({ type: 'page', current: currentPage, total: totalPages }, '*');
                    break;
                  }
                }
              });
            } catch (e) {
              status.textContent = 'Error: ' + e.message;
              parent.postMessage({ type: 'error', message: e.message }, '*');
            }
          }
          render();
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    iframeRef.current = iframe;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === "loaded") onLoaded(data.totalPages);
      else if (data.type === "rendered") setRendered(true);
      else if (data.type === "page") onPageChange(data.current, data.total);
      else if (data.type === "error") onError(data.message);
    };

    window.addEventListener("message", handleMessage);

    const container = document.getElementById("pdf-iframe-container");
    if (container) {
      container.innerHTML = "";
      container.appendChild(iframe);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      URL.revokeObjectURL(url);
    };
  }, [pdfBase64, isDark]);

  return (
    <View style={{ flex: 1 }} nativeID="pdf-iframe-container" />
  );
}

function NativePDFViewer({
  pdfBase64,
  isDark,
  insets,
  onPageChange,
  onLoaded,
  onRenderComplete,
  onError,
  onTap,
}: {
  pdfBase64: string;
  isDark: boolean;
  insets: { top: number; bottom: number };
  onPageChange: (page: number, total: number) => void;
  onLoaded: (totalPages: number) => void;
  onRenderComplete: () => void;
  onError: (message: string) => void;
  onTap: () => void;
}) {
  const WebView = require("react-native-webview").WebView;

  const pdfViewerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%; min-height: 100%;
          background: ${isDark ? "#0A0A0A" : "#FFFFFF"};
          overflow-x: hidden; -webkit-overflow-scrolling: touch;
        }
        #container {
          display: flex; flex-direction: column; align-items: center;
          padding: 0 ${Spacing.md}px;
          padding-top: ${insets.top + 56}px;
          padding-bottom: ${insets.bottom + 32}px;
        }
        canvas { display: block; max-width: 100%; height: auto; background: ${isDark ? "#1C1C1C" : "#FFF"}; }
        #status {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          color: ${isDark ? "#E8E8E8" : "#1A1A1A"}; font-family: system-ui; text-align: center;
        }
      </style>
    </head>
    <body>
      <div id="status">Loading PDF...</div>
      <div id="container"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const base64Data = '${pdfBase64}';
        const container = document.getElementById('container');
        const status = document.getElementById('status');
        let pageOffsets = [];
        let currentPage = 1;
        let totalPages = 1;
        
        function send(d) { 
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(d)); 
          }
        }
        
        async function renderPDF() {
          try {
            if (!base64Data || base64Data.length === 0) {
              throw new Error('No PDF data available');
            }
            
            status.textContent = 'Decoding PDF...';
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            
            status.textContent = 'Loading document...';
            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
            totalPages = pdf.numPages;
            send({ type: 'loaded', totalPages: totalPages });
            
            const width = window.innerWidth;
            for (let i = 1; i <= totalPages; i++) {
              status.textContent = 'Page ' + i + ' of ' + totalPages;
              const page = await pdf.getPage(i);
              const vp = page.getViewport({ scale: 1 });
              const scale = ((width - 32) / vp.width) * 2;
              const svp = page.getViewport({ scale: scale });
              
              const canvas = document.createElement('canvas');
              canvas.width = svp.width;
              canvas.height = svp.height;
              canvas.style.width = (svp.width / 2) + 'px';
              canvas.style.height = (svp.height / 2) + 'px';
              container.appendChild(canvas);
              
              const ctx = canvas.getContext('2d');
              await page.render({ canvasContext: ctx, viewport: svp }).promise;
              pageOffsets.push({ 
                page: i, 
                top: canvas.offsetTop, 
                bottom: canvas.offsetTop + canvas.offsetHeight 
              });
            }
            
            status.style.display = 'none';
            send({ type: 'rendered' });
            
            window.addEventListener('scroll', function() {
              const y = window.scrollY + window.innerHeight / 2;
              for (let j = 0; j < pageOffsets.length; j++) {
                const p = pageOffsets[j];
                if (y >= p.top && y < p.bottom && currentPage !== p.page) {
                  currentPage = p.page;
                  send({ type: 'page', current: currentPage, total: totalPages });
                  break;
                }
              }
            }, { passive: true });
            
          } catch (e) {
            status.textContent = 'Error: ' + (e.message || 'Unknown error');
            send({ type: 'error', message: e.message || 'Failed to load PDF' });
          }
        }
        
        document.addEventListener('click', function() { 
          send({ type: 'tap' }); 
        });
        
        renderPDF();
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "loaded") onLoaded(data.totalPages);
      else if (data.type === "rendered") onRenderComplete();
      else if (data.type === "page") onPageChange(data.current, data.total);
      else if (data.type === "tap") onTap();
      else if (data.type === "error") onError(data.message);
    } catch (err) {
      console.error("WebView message error:", err);
    }
  };

  return (
    <WebView
      source={{ html: pdfViewerHtml }}
      style={styles.webview}
      onMessage={handleMessage}
      scrollEnabled
      bounces
      showsVerticalScrollIndicator={false}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      allowUniversalAccessFromFileURLs
      mixedContentMode="always"
    />
  );
}

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

  useEffect(() => {
    loadPdfFile();
  }, [document.uri]);

  const loadPdfFile = async () => {
    try {
      setLoading(true);
      setLoadingStatus("Reading PDF file...");
      setError(null);
      const base64Content = await readFileAsBase64(document.uri);
      if (!base64Content || base64Content.length === 0) {
        throw new Error("Failed to read PDF file - empty content");
      }
      setPdfBase64(base64Content);
      setLoadingStatus("Rendering pages...");
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setError(err?.message || "Failed to read PDF file");
      setLoading(false);
    }
  };

  const showControls = useCallback(() => {
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    setControlsVisible(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  const hideControls = useCallback(() => {
    controlsOpacity.value = withTiming(0, { duration: 300 });
    hideControlsTimeout.current = setTimeout(() => setControlsVisible(false), 300);
  }, []);

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => hideControls(), 3000);
  }, [hideControls]);

  useEffect(() => {
    scheduleHideControls();
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, []);

  const toggleControls = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (controlsVisible) hideControls();
    else { showControls(); scheduleHideControls(); }
  };

  const handleGoBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateReadProgress(document.id, currentPage);
    navigation.goBack();
  };

  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const controlsAnimatedStyle = useAnimatedStyle(() => ({ opacity: controlsOpacity.value }));
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.errorTitle}>Unable to load PDF</ThemedText>
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>{error}</ThemedText>
          <Pressable onPress={handleGoBack} style={[styles.errorButton, { borderColor: theme.text }]}>
            <ThemedText>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.progressLine, { width: `${progress}%`, backgroundColor: theme.text, top: insets.top }]} />
      </View>

      {pdfBase64 ? (
        Platform.OS === "web" ? (
          <WebPDFViewer
            pdfBase64={pdfBase64}
            isDark={isDark}
            insets={insets}
            onPageChange={handlePageChange}
            onLoaded={(total) => { setTotalPages(total); setLoading(false); }}
            onError={(msg) => { setError(msg); setLoading(false); }}
          />
        ) : (
          <NativePDFViewer
            pdfBase64={pdfBase64}
            isDark={isDark}
            insets={insets}
            onPageChange={handlePageChange}
            onLoaded={setTotalPages}
            onRenderComplete={() => setLoading(false)}
            onError={(msg) => { setError(msg); setLoading(false); }}
            onTap={toggleControls}
          />
        )
      ) : null}

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.text} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>{loadingStatus}</ThemedText>
        </View>
      ) : null}

      {controlsVisible ? (
        <Animated.View
          style={[styles.overlayHeader, { paddingTop: insets.top + Spacing.sm, backgroundColor: theme.overlay }, controlsAnimatedStyle]}
          pointerEvents="box-none"
        >
          <Pressable onPress={handleGoBack} style={styles.controlButton} hitSlop={12}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.pageIndicator}>{currentPage} / {totalPages}</ThemedText>
          <View style={styles.controlButton} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  loadingText: { fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.lg, padding: Spacing["2xl"] },
  errorTitle: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  errorText: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  errorButton: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: 999, borderWidth: 1.5, marginTop: Spacing.md },
  progressLine: { position: "absolute", left: 0, height: 2, zIndex: 100 },
  overlayHeader: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  controlButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  pageIndicator: { fontSize: 14, fontWeight: "500", color: "#FFFFFF" },
});
