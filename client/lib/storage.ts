import AsyncStorage from "@react-native-async-storage/async-storage";
import { PDFDocument } from "@/navigation/RootStackNavigator";

const DOCUMENTS_KEY = "pdf_documents";
const SETTINGS_KEY = "app_settings";

export interface AppSettings {
  darkMode: "light" | "dark" | "auto";
  fontSizeMultiplier: number;
}

const defaultSettings: AppSettings = {
  darkMode: "auto",
  fontSizeMultiplier: 1.0,
};

export async function getDocuments(): Promise<PDFDocument[]> {
  try {
    const data = await AsyncStorage.getItem(DOCUMENTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error loading documents:", error);
    return [];
  }
}

export async function saveDocument(document: PDFDocument): Promise<void> {
  try {
    const documents = await getDocuments();
    const existingIndex = documents.findIndex((d) => d.id === document.id);
    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.unshift(document);
    }
    await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error("Error saving document:", error);
    throw error;
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const documents = await getDocuments();
    const filtered = documents.filter((d) => d.id !== id);
    await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

export async function updateReadProgress(
  id: string,
  page: number
): Promise<void> {
  try {
    const documents = await getDocuments();
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      doc.lastReadPage = page;
      doc.lastReadDate = new Date().toISOString();
      await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    }
  } catch (error) {
    console.error("Error updating read progress:", error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      return { ...defaultSettings, ...JSON.parse(data) };
    }
    return defaultSettings;
  } catch (error) {
    console.error("Error loading settings:", error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DOCUMENTS_KEY);
  } catch (error) {
    console.error("Error clearing cache:", error);
    throw error;
  }
}
