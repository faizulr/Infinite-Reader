import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import LibraryScreen from "@/screens/LibraryScreen";
import ReaderScreen from "@/screens/ReaderScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type PDFDocument = {
  id: string;
  uri: string;
  name: string;
  pageCount: number;
  lastReadDate: string;
  lastReadPage: number;
};

export type RootStackParamList = {
  Library: undefined;
  Reader: { document: PDFDocument };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Reader"
        component={ReaderScreen}
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
    </Stack.Navigator>
  );
}
